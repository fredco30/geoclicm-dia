"""Décisions traçables sur candidats, sans publication ni suppression automatique."""

import hashlib
import re
from copy import deepcopy
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from django.db import connection, transaction
from django.db.models import Q
from django.utils import timezone

from .cleaning import norm_text
from .validity import aware, proof_dates, validity

PROTECTED = {"imported", "rejected"}


def preserve_review(previous_payload, data):
    data = dict(data)
    previous_payload = previous_payload or {}
    previous = previous_payload.get("review")
    if previous:
        previous = deepcopy(previous)
        if previous_payload.get("ai") != (data.get("raw_payload") or {}).get("ai"):
            previous.pop("validity_confirmation", None)
        data["raw_payload"] = {**data["raw_payload"], "review": previous}
    return data


def page_identity(url):
    parts = urlsplit(url or "")
    query = [(k, v) for k, v in parse_qsl(parts.query) if not k.lower().startswith("utm_")]
    return urlunsplit(
        (
            parts.scheme.lower(),
            parts.netloc.lower().removeprefix("www."),
            parts.path.rstrip("/"),
            urlencode(sorted(query)),
            "",
        )
    )


def title(candidate):
    return getattr(candidate, "title", None) or getattr(candidate, "name", "")


def _address(candidate):
    value = norm_text(candidate.address)
    if candidate.commune_id:
        value = value.removesuffix(norm_text(candidate.commune.name)).strip()
    value = re.sub(r"\b\d{5}\b", "", value)
    value = re.sub(r"\bav\b", "avenue", value)
    value = re.sub(r"\bbd\b", "boulevard", value)
    return " ".join(value.split())


def _same_page_leaf(a, b):
    x, y = urlsplit(a.source_url), urlsplit(b.source_url)
    return (
        x.netloc.removeprefix("www.") == y.netloc.removeprefix("www.")
        and x.path.rstrip("/").rsplit("/", 1)[-1] == y.path.rstrip("/").rsplit("/", 1)[-1]
    )


def _event_dates(candidate):
    rows = candidate.occurrences or [
        {
            "starts_at": candidate.starts_at,
            "ends_at": candidate.ends_at,
            "is_all_day": candidate.is_all_day,
        }
    ]
    dates = []
    for row in rows:
        if not isinstance(row, dict):
            return None
        start, end = aware(row.get("starts_at")), aware(row.get("ends_at"))
        if not start or not end or end < start:
            return None
        dates.append((start.timestamp(), end.timestamp(), bool(row.get("is_all_day"))))
    return tuple(sorted(set(dates)))


def same_content(a, b):
    if (
        not norm_text(title(a))
        or norm_text(title(a)) != norm_text(title(b))
        or a.commune_id != b.commune_id
    ):
        return False
    same_url = page_identity(a.source_url) == page_identity(b.source_url)
    if not a.commune_id and not same_url:
        return False  # Never infer a common town from an unresolved name.
    left, right = _address(a), _address(b)
    if left and right and left != right:
        return False  # Same brand, different establishments: no automatic merge.
    kind = a._meta.model_name
    if kind == "eventimportcandidate":
        if a.kind != b.kind:
            return False
        if a.venue_name and b.venue_name and norm_text(a.venue_name) != norm_text(b.venue_name):
            return False
        x, y = _event_dates(a), _event_dates(b)
        if x is not None and y is not None:
            return x == y  # All occurrences, not only the first date.
        # Undated repeats require the exact page and identical verified excerpts.
        proofs_a = (a.raw_payload or {}).get("verified_evidence")
        proofs_b = (b.raw_payload or {}).get("verified_evidence")
        return bool(same_url and proofs_a and proofs_a == proofs_b)
    if kind == "listingimportcandidate":
        # Do not merge two recruitment campaigns with the same title.
        if a.expires_at != b.expires_at or a.published_on_source_at != b.published_on_source_at:
            return False

        def dated_proofs(candidate):
            return sorted(
                {
                    str(day)
                    for snippet in (candidate.raw_payload or {}).get("verified_evidence", [])
                    if isinstance(snippet, str)
                    for _, day in proof_dates(snippet)
                }
            )

        if dated_proofs(a) != dated_proofs(b):
            return False
    return bool((left and right and left == right) or same_url or _same_page_leaf(a, b))


def lock_identity(candidate):
    """Serialize a candidate module before any row write (consistent lock order)."""
    if connection.vendor == "postgresql":
        key = f"import-review:{candidate._meta.label_lower}"
        digest = int.from_bytes(hashlib.sha256(key.encode()).digest()[:8], "big", signed=True)
        with connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_xact_lock(%s)", [digest])


def candidate_peers(candidate):
    name_field = "name" if candidate._meta.model_name == "businessimportcandidate" else "title"
    return (
        type(candidate)
        .objects.filter(
            Q(fingerprint=candidate.fingerprint) | Q(**{name_field + "__iexact": title(candidate)}),
            commune_id=candidate.commune_id,
        )
        .exclude(status="rejected")
        .select_related("commune")
    )


def canonical_for(candidate, *, peers=None):
    if peers is None:
        peers = candidate_peers(candidate)
    group = [p for p in peers if p.status != "rejected" and same_content(candidate, p)]
    if not group:
        return candidate
    return min(group, key=lambda p: (p.status != "imported", bool(p.validation_errors), p.pk))


def published_match(candidate):
    kind = candidate._meta.model_name
    if kind not in {"placeimportcandidate", "businessimportcandidate"} or not candidate.commune_id:
        return None
    field, relation = (
        ("title", "matched_place")
        if kind == "placeimportcandidate"
        else ("name", "matched_business")
    )
    model = candidate._meta.get_field(relation).remote_field.model
    for record in model.objects.filter(commune_id=candidate.commune_id).select_related("commune"):
        if (
            record.pk == getattr(candidate, relation + "_id")
            or getattr(record, "status", "") == "archived"
        ):
            continue
        if norm_text(getattr(record, field)) != norm_text(title(candidate)):
            continue
        same_address = (
            candidate.address and record.address and _address(candidate) == _address(record)
        )
        same_url = getattr(record, "official_url", "") and page_identity(
            record.official_url
        ) == page_identity(candidate.source_url)
        if same_address or same_url:
            return record
    return None


def review_data(candidate, *, peers=None, now=None):
    now = now or timezone.now()
    state = validity(candidate, now=now)
    peers = list(candidate_peers(candidate) if peers is None else peers)
    primary = canonical_for(candidate, peers=peers)
    possible = sorted(
        p.pk
        for p in peers
        if p.pk != candidate.pk
        and norm_text(title(p)) == norm_text(title(candidate))
        and not same_content(candidate, p)
    )
    existing_record = published_match(candidate) if candidate.status not in PROTECTED else None
    status = candidate.status
    reason = state.reason
    if status not in PROTECTED:
        if state.state == "expired":
            status = "expired"
        elif primary.pk != candidate.pk:
            status, reason = "duplicate", f"Même contenu que le candidat #{primary.pk}."
        elif existing_record:
            status, reason = (
                "duplicate",
                f"Un lieu ou établissement correspondant existe déjà (fiche #{existing_record.pk}).",
            )
        elif candidate.validation_errors:
            status = "invalid"
        elif (
            state.state == "needs_review" and candidate._meta.model_name == "listingimportcandidate"
        ):
            status = "needs_review"
        elif state.state == "needs_review":
            status = "invalid"
        else:
            status = "pending"
    data = {
        "validity": state.as_dict(),
        "canonical_candidate_id": primary.pk,
        "published_record_id": existing_record.pk if existing_record else None,
        "possible_duplicate_ids": possible,
        "reason": reason,
        "proposed_status": status,
    }
    return data


@transaction.atomic
def review_candidate(candidate, *, save=True, now=None, peers=None):
    now = now or timezone.now()
    if candidate.status in PROTECTED:
        return candidate
    if save:
        lock_identity(candidate)
        candidate.refresh_from_db()
        if candidate.status in PROTECTED:
            return candidate
    decision = review_data(candidate, peers=peers, now=now)
    previous = (candidate.raw_payload or {}).get("review") or {}
    if (
        all(previous.get(k) == v for k, v in decision.items())
        and candidate.status == decision["proposed_status"]
    ):
        return candidate
    payload = deepcopy(candidate.raw_payload or {})
    history = list(previous.get("history") or [])
    if candidate.status != decision["proposed_status"]:
        history.append(
            {
                "at": now.isoformat(),
                "before": candidate.status,
                "after": decision["proposed_status"],
                "reason": decision["reason"],
            }
        )
    payload["review"] = {**previous, **decision, "checked_at": now.isoformat(), "history": history}
    candidate.raw_payload = payload
    candidate.status = decision["proposed_status"]
    if save:
        candidate.save(update_fields=["raw_payload", "status"])
    return candidate


def guard_import(candidate, *, publish=True):
    """Must run inside the import transaction, before creating/updating content."""
    lock_identity(candidate)
    candidate.refresh_from_db()
    if candidate.status == "rejected":
        raise ValueError("Ce candidat a été rejeté : il ne peut pas être publié.")
    decision = review_data(candidate)
    if publish and decision["validity"]["state"] in {"expired", "needs_review"}:
        raise ValueError(decision["validity"]["reason"])
    if decision["canonical_candidate_id"] != candidate.pk:
        raise ValueError(decision["reason"])
    if decision["published_record_id"]:
        raise ValueError(decision["reason"])
    return candidate


def candidate_models():
    from apps.directory.models import BusinessImportCandidate
    from apps.events.models import EventImportCandidate
    from apps.listings.models import ListingImportCandidate

    from .models import PlaceImportCandidate

    return [
        PlaceImportCandidate,
        BusinessImportCandidate,
        EventImportCandidate,
        ListingImportCandidate,
    ]


def review_all(*, apply=False):
    """Same decisions for the dry-run command and the periodic task."""
    from collections import defaultdict

    now = timezone.now()
    report = []
    for model in candidate_models():
        rows = list(
            model.objects.exclude(status="rejected").select_related("commune").order_by("pk")
        )
        groups = defaultdict(list)
        for row in rows:
            groups[(norm_text(title(row)), row.commune_id)].append(row)
        for row in rows:
            if row.status in PROTECTED:
                continue
            decision = review_data(
                row, peers=groups[(norm_text(title(row)), row.commune_id)], now=now
            )
            if row.status != decision["proposed_status"]:
                report.append(
                    {
                        "model": model._meta.label_lower,
                        "id": row.pk,
                        "title": title(row),
                        "source_url": row.source_url,
                        "before": row.status,
                        "after": decision["proposed_status"],
                        "decision": decision,
                        "before_raw_payload": deepcopy(row.raw_payload),
                    }
                )
            if apply:
                review_candidate(row, now=now)
    return report

"""Dates de validité : preuves explicites, jamais l'âge d'une page comme expiration."""

import re
from dataclasses import asdict, dataclass
from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from .cleaning import norm_text

PARIS = ZoneInfo("Europe/Paris")
MONTHS = dict(
    zip(
        "janvier fevrier mars avril mai juin juillet aout septembre octobre novembre decembre".split(),
        range(1, 13),
        strict=True,
    )
)
DATE = re.compile(r"\b(\d{1,2})(?:er)?\s+(" + "|".join(MONTHS) + r")\s+(\d{4})\b")


@dataclass(frozen=True)
class Validity:
    state: str
    reason: str
    evidence: str = ""
    until: str | None = None

    def as_dict(self):
        return asdict(self)


def aware(value):
    if isinstance(value, str):
        try:
            value = parse_datetime(value)
        except ValueError:
            return None
    if not isinstance(value, datetime):
        return None
    return timezone.make_aware(value, PARIS) if timezone.is_naive(value) else value


def proof_dates(snippet):
    text = norm_text(snippet)
    for match in DATE.finditer(text):
        try:
            day = datetime(int(match[3]), MONTHS[match[2]], int(match[1])).date()
        except ValueError:
            continue
        yield match.start(), day
    for match in re.finditer(r"\b(\d{4}) (\d{2}) (\d{2})\b", text):
        try:
            day = datetime(int(match[1]), int(match[2]), int(match[3])).date()
        except ValueError:
            continue
        yield match.start(), day


def listing_validity(candidate, *, now=None):
    now = now or timezone.now()
    payload = candidate.raw_payload or {}
    evidence = [s for s in payload.get("verified_evidence", []) if isinstance(s, str)]
    ends = []
    for snippet in evidence:
        text = norm_text(snippet)
        for start, day in proof_dates(snippet):
            prefix = text[:start]
            deadline = re.search(
                r"(?:candidatur\w*|date limite|postuler).{0,90}(?:avant(?: le)?|jusqu au|au plus tard(?: le)?|limite)\s*$",
                prefix,
            )
            contract_end = re.search(r"(?:contrat|mission).{0,140}\bau\s*$", prefix)
            deadline = deadline or re.search(
                r"\bdate limite(?: de candidature)?(?: le)?\s*$", prefix
            )
            contract_end = contract_end or re.search(
                r"\bfin (?:du contrat|de la mission)(?: le)?\s*$", prefix
            )
            if deadline or contract_end:
                if deadline and re.search(r"\bavant(?: le)?\s*$", prefix):
                    day -= timedelta(days=1)
                end = timezone.make_aware(datetime.combine(day, time.max), PARIS)
                ends.append((end, snippet))
    if ends:
        end, proof = min(ends, key=lambda item: item[0])
        return Validity(
            "expired" if end < now else "current",
            (
                "La période ou l'échéance indiquée dans la source est terminée."
                if end < now
                else "Une échéance future est prouvée dans la source."
            ),
            proof,
            end.isoformat(),
        )
    confirmation = (payload.get("review") or {}).get("validity_confirmation") or {}
    checked = aware(confirmation.get("checked_at"))
    if checked and timedelta(0) <= now - checked < timedelta(days=30):
        return Validity(
            "current",
            "Actualité confirmée par un membre de l'équipe (30 jours).",
            until=(checked + timedelta(days=30)).isoformat(),
        )
    published = aware(candidate.published_on_source_at)
    reason = "Aucune échéance vérifiable : vérifier que l'offre est toujours ouverte."
    if published and now - published > timedelta(days=90):
        reason = "Annonce publiée il y a plus de 90 jours, sans échéance vérifiable."
    return Validity("needs_review", reason)


def event_validity(candidate, *, now=None):
    now = now or timezone.now()
    rows = candidate.occurrences or [
        {"starts_at": candidate.starts_at, "ends_at": candidate.ends_at}
    ]
    ends = []
    for row in rows:
        if not isinstance(row, dict):
            return Validity("needs_review", "Une occurrence possède des dates non vérifiables.")
        start, end = aware(row.get("starts_at")), aware(row.get("ends_at"))
        if not start or not end or end < start:
            return Validity("needs_review", "Dates absentes, incomplètes ou incohérentes.")
        ends.append(end)
    last = max(ends)
    return Validity(
        "expired" if last < now else "current",
        (
            "Toutes les occurrences sont terminées."
            if last < now
            else "Au moins une occurrence reste à venir ou en cours."
        ),
        until=last.isoformat(),
    )


def validity(candidate, *, now=None):
    if candidate._meta.model_name == "listingimportcandidate":
        return listing_validity(candidate, now=now)
    if candidate._meta.model_name == "eventimportcandidate":
        return event_validity(candidate, now=now)
    return Validity("not_applicable", "Lieu ou établissement sans échéance événementielle.")

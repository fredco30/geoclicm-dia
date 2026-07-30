"""Orchestration de la passe IA multi-catégories (docs/26 §14).

Un seul passage sur le corpus partagé alimente toutes les boîtes de
validation : les lieux rejoignent Découvrir, les événements et marchés
rejoignent l'Agenda (kind=market pour les marchés). La validation humaine
reste obligatoire sur chaque boîte ; rien n'est publié automatiquement.
"""

from __future__ import annotations

import hashlib
import logging

import requests
from django.contrib.gis.geos import Point
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify

from apps.assistant.models import CrawlSource
from apps.assistant.services.shared_crawl import ensure_source_fresh
from apps.core.models import User
from apps.events.event_images import generic_image_urls, select_event_image
from apps.events.imports import (
    _absolute_http_url,
    _aware,
    _compact_text,
    _geocode,
    _guess_category,
    _optional_float,
    _upsert_candidate,
    commune_id,
)

from .models import Place, PlaceImportCandidate
from .multi_extraction import extract_multi, normalize_place

logger = logging.getLogger(__name__)

MAX_IMAGE_BYTES = 5 * 1024 * 1024
USER_AGENT = "geoclicmedia-discovery-bot/1.0 (+https://media.geoclic.fr)"


def _resolve_user(crawl_source: CrawlSource) -> User:
    """Utilisateur porteur de l'appel IA et créateur des contenus importés."""
    event_source = crawl_source.event_sources.select_related("created_by").first()
    if event_source and event_source.created_by_id:
        return event_source.created_by
    user = User.objects.filter(is_superuser=True).order_by("id").first()
    if user is None:
        raise RuntimeError("Aucun utilisateur disponible pour la passe IA.")
    return user


def _agenda_event_source(crawl_source: CrawlSource) -> object | None:
    """EventSource existante adossée à ce corpus (pour router events/marchés)."""
    return crawl_source.event_sources.first()


class _AgendaSourceStub:
    """Adaptateur EventSource minimal pour réutiliser les normaliseurs Agenda."""

    def __init__(self, commune, default_category, default_kind, created_by):
        self.commune = commune
        self.commune_id = commune.pk if commune else None
        self.default_category = default_category
        self.default_category_id = default_category.pk if default_category else None
        self.default_kind = default_kind
        self.created_by = created_by
        self.created_by_id = created_by.pk if created_by else None


def _normalize_agenda_item(
    raw: dict,
    *,
    kind: str,
    commune,
    created_by,
    crawl_page,
    generic_urls: set[str],
) -> dict:
    """Normalise une sortie IA event/market vers un candidat Agenda (kind forcé)."""
    from apps.events.models import EventImportCandidate

    page_url = crawl_page.final_url or crawl_page.canonical_url
    title = _compact_text(raw.get("title"), 200)
    short_description = _compact_text(raw.get("short_description"), 240)
    description = _compact_text(raw.get("description"))
    locality = _compact_text(raw.get("locality"), 120)
    resolved_commune = commune
    if resolved_commune is None and locality:
        from apps.core.models import Commune

        resolved_commune = Commune.objects.filter(
            name__iexact=locality, is_active=True
        ).first()
    venue_name = _compact_text(raw.get("venue_name"), 150)
    address = _compact_text(raw.get("address"), 255)
    latitude = _optional_float(raw.get("latitude"))
    longitude = _optional_float(raw.get("longitude"))
    if (latitude is None or longitude is None) and address:
        latitude, longitude = _geocode(address, resolved_commune)

    occurrences = []
    raw_occurrences = raw.get("occurrences") or []
    if isinstance(raw_occurrences, list):
        for occurrence in raw_occurrences:
            if not isinstance(occurrence, dict):
                continue
            starts_at = _aware(occurrence.get("starts_at"))
            ends_at = _aware(occurrence.get("ends_at"), end=True)
            if starts_at and ends_at and ends_at > starts_at:
                occurrences.append(
                    {
                        "starts_at": starts_at.isoformat(),
                        "ends_at": ends_at.isoformat(),
                        "is_all_day": bool(occurrence.get("is_all_day")),
                    }
                )
    occurrences.sort(key=lambda row: row["starts_at"])
    start = _aware(occurrences[0]["starts_at"]) if occurrences else None
    end = _aware(occurrences[0]["ends_at"]) if occurrences else None

    page_text = " ".join(str(crawl_page.cleaned_text or "").split()).casefold()
    verified_evidence = []
    evidence = raw.get("evidence") or []
    if isinstance(evidence, list):
        for value in evidence[:3]:
            snippet = _compact_text(value, 300)
            if snippet and " ".join(snippet.split()).casefold() in page_text:
                verified_evidence.append(snippet)

    category_stub = _AgendaSourceStub(resolved_commune, None, kind, created_by)
    category = _guess_category(category_stub, f"{title} {description}")
    errors = []
    if not title:
        errors.append("Titre absent")
    if not occurrences:
        errors.append("Dates absentes, incomplètes ou invalides")
    if not resolved_commune:
        errors.append("Commune non reconnue")
    if not category:
        errors.append("Catégorie non déterminée")
    if not verified_evidence:
        errors.append("Preuve textuelle IA non vérifiable dans la page")

    links = set(crawl_page.links or [])
    booking_candidate = _absolute_http_url(page_url, raw.get("booking_url"))
    booking_url = booking_candidate if booking_candidate in links else ""
    uid_basis = f"{page_url}|{slugify(title)}|{slugify(venue_name)}"
    source_uid = hashlib.sha256(uid_basis.encode()).hexdigest()[:48]
    fingerprint = hashlib.sha256(
        f"{slugify(title)}|{start.isoformat() if start else ''}|{commune_id(resolved_commune)}".encode()
    ).hexdigest()
    image = select_event_image(crawl_page, title=title, generic_urls=generic_urls)
    return {
        "source_uid": source_uid,
        "extraction_method": EventImportCandidate.ExtractionMethod.AI,
        "source_url": page_url,
        "raw_payload": {
            "ai": raw,
            "verified_evidence": verified_evidence,
            "page_url": page_url,
        },
        "fingerprint": fingerprint,
        "title": title or ("Marché sans titre" if kind == "market" else "Événement sans titre"),
        "short_description": short_description or description[:240],
        "description": description or short_description,
        "image_url": image.url,
        "image_credit": "",
        "starts_at": start,
        "ends_at": end,
        "occurrences": occurrences,
        "is_all_day": bool(occurrences and occurrences[0]["is_all_day"]),
        "venue_name": venue_name,
        "address": address,
        "latitude": latitude,
        "longitude": longitude,
        "price": _compact_text(raw.get("price"), 100),
        "booking_url": booking_url,
        "organizer": _compact_text(raw.get("organizer"), 150),
        "commune": resolved_commune,
        "category": category,
        "kind": kind,
        "validation_errors": errors,
    }


def _unique_place_slug(title: str, source_uid: str) -> str:
    base = slugify(title)[:190] or "lieu"
    if not Place.objects.filter(slug=base).exists():
        return base
    return f"{base[:170]}-{hashlib.sha256(source_uid.encode()).hexdigest()[:8]}"


def sync_place_cover_image(place: Place, image_url: str) -> bool:
    """Télécharge l'image officielle du lieu (borne taille/format), si absente."""
    if not image_url or place.cover_image:
        return False
    try:
        response = requests.get(
            image_url,
            headers={"User-Agent": USER_AGENT, "Accept": "image/*"},
            timeout=20,
            stream=True,
        )
        response.raise_for_status()
        content = response.content
        response.close()
    except requests.RequestException:
        logger.warning("Image lieu non téléchargeable %s", image_url, exc_info=True)
        return False
    if len(content) > MAX_IMAGE_BYTES:
        return False
    content_type = response.headers.get("Content-Type", "").split(";")[0]
    suffix = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}.get(
        content_type
    )
    if suffix is None:
        return False
    filename = f"{slugify(place.title)[:80]}-{hashlib.sha256(content).hexdigest()[:12]}{suffix}"
    place.cover_image.save(filename, ContentFile(content), save=False)
    place.save(update_fields=["cover_image", "updated_at"])
    return True


@transaction.atomic
def import_place_candidate(
    candidate: PlaceImportCandidate,
    *,
    user: User,
    publish: bool = True,
) -> Place:
    """Transforme un candidat validé en Place (brouillon ou publié)."""
    place = candidate.matched_place
    if place is None:
        place = Place(
            slug=_unique_place_slug(candidate.title, candidate.source_uid),
            created_by=user,
        )
    place.title = candidate.title
    place.short_description = candidate.short_description or candidate.title
    place.description = (
        candidate.description or candidate.short_description or candidate.title
    )
    place.category = candidate.category
    place.commune = candidate.commune
    place.address = candidate.address
    place.location = (
        Point(float(candidate.longitude), float(candidate.latitude), srid=4326)
        if candidate.latitude is not None and candidate.longitude is not None
        else None
    )
    place.duration = candidate.duration
    place.difficulty = candidate.difficulty
    place.accessibility = candidate.accessibility
    place.best_season = candidate.best_season
    place.practical_info = candidate.practical_info
    place.official_url = candidate.official_url or candidate.source_url
    place.status = Place.Status.PUBLISHED if publish else Place.Status.DRAFT
    if candidate.category_id is None or candidate.commune_id is None:
        raise ValueError("Commune et catégorie requises pour importer un lieu")
    place.save()

    if candidate.image_url:
        try:
            sync_place_cover_image(place, candidate.image_url)
        except Exception:  # noqa: BLE001
            logger.warning("Image lieu non synchronisée pour %s", place.slug, exc_info=True)
    candidate.status = PlaceImportCandidate.Status.IMPORTED
    candidate.matched_place = place
    candidate.imported_at = timezone.now()
    candidate.save(
        update_fields=["status", "matched_place", "imported_at", "last_seen_at"]
    )
    return place


def _upsert_place_candidate(
    crawl_source: CrawlSource, data: dict
) -> tuple[PlaceImportCandidate, bool, bool]:
    existing = PlaceImportCandidate.objects.filter(
        crawl_source=crawl_source,
        source_uid=data["source_uid"],
    ).first()
    created = existing is None
    previous_payload = existing.raw_payload if existing else None
    status = (
        PlaceImportCandidate.Status.INVALID
        if data["validation_errors"]
        else PlaceImportCandidate.Status.PENDING
    )
    candidate, _ = PlaceImportCandidate.objects.update_or_create(
        crawl_source=crawl_source,
        source_uid=data["source_uid"],
        defaults={
            **data,
            "status": (
                existing.status
                if existing
                and existing.status
                in {
                    PlaceImportCandidate.Status.REJECTED,
                    PlaceImportCandidate.Status.IMPORTED,
                }
                else status
            ),
        },
    )
    updated = not created and previous_payload != data["raw_payload"]
    return candidate, created, updated


def _crawl_pages(crawl_source: CrawlSource) -> list:
    return list(
        crawl_source.pages.filter(is_active=True).order_by("canonical_url")
    )


def source_page_urls(crawl_source: CrawlSource, *, short_first: bool = False) -> list[str]:
    """URLs analysables du corpus (texte suffisant).

    short_first : les pages courtes (reponse IA rapide) d'abord, les grosses
    pages segmentees (souvent en timeout) a la fin. Couvre 85 % du corpus
    rapidement sans rien exclure (voie A preservee).
    """
    pages = [
        page
        for page in _crawl_pages(crawl_source)
        if len(page.cleaned_text or "") >= 200
    ]
    if short_first:
        pages.sort(key=lambda page: len(page.cleaned_text or ""))
    return [(page.final_url or page.canonical_url) for page in pages]


def process_page_batch(
    crawl_source: CrawlSource,
    page_urls: list[str],
) -> dict:
    """Traite un lot de pages (une tache Celery) : IA + routage. Decouper la
    passe en lots evite de monopoliser un worker des heures et permet la
    reprise sur erreur."""
    user = _resolve_user(crawl_source)
    generic_urls = generic_image_urls(crawl_source)
    wanted = set(page_urls)
    crawled_pages = [
        page
        for page in _crawl_pages(crawl_source)
        if (page.final_url or page.canonical_url) in wanted
    ]
    pages = [
        {
            "url": page.final_url or page.canonical_url,
            "title": page.title,
            "image_url": (page.metadata or {}).get("image_url", ""),
            "links": page.links,
            "content": page.cleaned_text,
        }
        for page in crawled_pages
    ]
    crawl_page_by_url = {
        (page.final_url or page.canonical_url): page for page in crawled_pages
    }
    results, errors = extract_multi(user, pages)
    return _route_results(
        crawl_source, results, errors, crawl_page_by_url, generic_urls, user
    )


def run_multi_extraction(
    crawl_source: CrawlSource,
    *,
    progress=None,
) -> dict:
    """Lance la passe IA multi-catégories sur le corpus partagé d'une source."""
    ensure_source_fresh(crawl_source)
    user = _resolve_user(crawl_source)
    generic_urls = generic_image_urls(crawl_source)

    crawled_pages = list(
        crawl_source.pages.filter(is_active=True).order_by("canonical_url")
    )
    pages = [
        {
            "url": page.final_url or page.canonical_url,
            "title": page.title,
            "image_url": (page.metadata or {}).get("image_url", ""),
            "links": page.links,
            "content": page.cleaned_text,
        }
        for page in crawled_pages
    ]
    crawl_page_by_url = {
        (page.final_url or page.canonical_url): page for page in crawled_pages
    }

    results, errors = extract_multi(user, pages, progress=progress)
    return _route_results(
        crawl_source, results, errors, crawl_page_by_url, generic_urls, user
    )


def _route_results(
    crawl_source: CrawlSource,
    results: dict,
    errors: list[str],
    crawl_page_by_url: dict,
    generic_urls: set[str],
    user: User,
) -> dict:
    """Route les sorties IA vers les boites Agenda et Decouvrir."""
    commune = crawl_source.commune
    agenda_source = _agenda_event_source(crawl_source)
    summary = {
        "source": crawl_source.label,
        "events": 0,
        "markets": 0,
        "places": 0,
        "errors": len(errors),
        "error_details": errors[:50],
        "agenda_routed": False,
    }

    # Événements et marchés -> boîte Agenda (si une EventSource est adossée).
    if agenda_source is not None:
        for kind, key in (("event", "events"), ("market", "markets")):
            for raw in results[key]:
                crawl_page = crawl_page_by_url.get(raw["source_page_url"])
                if crawl_page is None:
                    continue
                data = _normalize_agenda_item(
                    raw,
                    kind=kind,
                    commune=commune,
                    created_by=user,
                    crawl_page=crawl_page,
                    generic_urls=generic_urls,
                )
                try:
                    _upsert_candidate(agenda_source, data)
                    summary[key] += 1
                    summary["agenda_routed"] = True
                except Exception:  # noqa: BLE001
                    logger.exception(
                        "Candidat Agenda (%s) impossible pour %s", kind, crawl_source.label
                    )

    # Lieux -> boîte Découvrir.
    # Une page d agrégation (carte, annuaire, agenda) peut lister des dizaines
    # de lieux ; on ne retient que le lieu principal par page (titre le plus
    # proche du titre de page), puis on deduplique par titre normalise sur tout
    # le corpus (les traductions /en /de /es d un meme lieu ne font qu un
    # candidat). Une fiche dediee produit un seul lieu, comportement inchange.
    places_by_page: dict[str, list[dict]] = {}
    for raw in results["places"]:
        places_by_page.setdefault(raw["source_page_url"], []).append(raw)

    seen_fingerprints: set[str] = set()
    for page_url, raw_places in places_by_page.items():
        crawl_page = crawl_page_by_url.get(page_url)
        if crawl_page is None:
            continue
        selected = _select_primary_places(crawl_page, raw_places)
        for raw in selected:
            data = normalize_place(
                crawl_source, raw, crawl_page=crawl_page, generic_urls=generic_urls
            )
            if data["fingerprint"] in seen_fingerprints:
                continue
            seen_fingerprints.add(data["fingerprint"])
            try:
                _upsert_place_candidate(crawl_source, data)
                summary["places"] += 1
            except Exception:  # noqa: BLE001
                logger.exception("Candidat Découvrir impossible pour %s", crawl_source.label)

    return summary


def _norm_title(value: object) -> str:
    import re
    import unicodedata

    text = unicodedata.normalize("NFKD", str(value or ""))
    text = text.encode("ascii", "ignore").decode().casefold()
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def _select_primary_places(crawl_page, raw_places: list[dict]) -> list[dict]:
    """Retient le lieu principal d une page.

    Page a un seul lieu (fiche dediee) : inchange. Page d agregation qui liste
    plusieurs lieux : on prefere le lieu dont le titre recoupe le titre de la
    page ; sinon, pour limiter le bruit des annuaires, on ne garde rien (le
    lieu merite sa propre fiche, qui sera traitee separement).
    """
    if len(raw_places) <= 1:
        return raw_places
    page_title = _norm_title(crawl_page.title)
    if not page_title:
        return []
    scored = []
    for raw in raw_places:
        title = _norm_title(raw.get("title"))
        if not title:
            continue
        overlap = len(set(title.split()) & set(page_title.split()))
        if title in page_title or page_title in title:
            overlap += 5
        scored.append((overlap, raw))
    if not scored:
        return []
    scored.sort(key=lambda row: row[0], reverse=True)
    best, best_raw = scored[0]
    # Seuil : le titre du lieu doit recouper sensiblement le titre de la page
    # pour etre considere comme le sujet principal, et non un item d annuaire.
    return [best_raw] if best >= 3 else []

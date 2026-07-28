"""Collecte structurée et synchronisation des événements officiels."""

from __future__ import annotations

import hashlib
import ipaddress
import logging
import socket
from datetime import date, datetime, time, timedelta
from io import BytesIO
from urllib.parse import urljoin, urlparse
from zoneinfo import ZoneInfo

import recurring_ical_events
import requests
from bs4 import BeautifulSoup
from django.contrib.gis.geos import Point
from django.core.files.base import ContentFile
from django.db import transaction
from django.utils import timezone
from django.utils.text import slugify
from icalendar import Calendar
from PIL import Image, UnidentifiedImageError

from apps.assistant.indexers.http_fetcher import fetcher
from apps.core.models import Commune

from .ai_extraction import extract_events as extract_events_with_mistral
from .models import (
    Event,
    EventCategory,
    EventImportCandidate,
    EventImportRun,
    EventOccurrence,
    EventSource,
)

logger = logging.getLogger(__name__)
PARIS = ZoneInfo("Europe/Paris")
MAX_IMAGE_BYTES = 5 * 1024 * 1024
USER_AGENT = "geoclicmedia-events-bot/1.0 (+https://media.geoclic.fr; contact@geoclic.fr)"


def _aware(value: object, *, end: bool = False) -> datetime | None:
    if isinstance(value, datetime):
        return timezone.make_aware(value, PARIS) if timezone.is_naive(value) else value
    if isinstance(value, date):
        at = time.max if end else time.min
        return timezone.make_aware(datetime.combine(value, at), PARIS)
    if not isinstance(value, str) or not value.strip():
        return None
    raw = value.strip()
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        try:
            parsed_date = date.fromisoformat(raw[:10])
        except ValueError:
            return None
        return timezone.make_aware(
            datetime.combine(parsed_date, time.max if end else time.min),
            PARIS,
        )
    return timezone.make_aware(parsed, PARIS) if timezone.is_naive(parsed) else parsed


def _compact_text(value: object, limit: int | None = None) -> str:
    text = BeautifulSoup(str(value or ""), "lxml").get_text(" ", strip=True)
    text = " ".join(text.split())
    return text[:limit] if limit else text


def _first_url(value: object) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        for item in value:
            if found := _first_url(item):
                return found
        return ""
    if isinstance(value, dict):
        return str(value.get("url") or value.get("contentUrl") or "")
    return ""


def _absolute_http_url(base_url: str, value: object) -> str:
    raw = _first_url(value).strip()
    if not raw:
        return ""
    absolute = urljoin(base_url, raw)
    return absolute if urlparse(absolute).scheme in {"http", "https"} else ""


def _image_credit(value: object) -> str:
    image = value[0] if isinstance(value, list) and value else value
    if not isinstance(image, dict):
        return ""
    creator = image.get("creator") or {}
    creator_name = creator.get("name") if isinstance(creator, dict) else creator
    return _compact_text(
        image.get("creditText") or image.get("copyrightNotice") or creator_name,
        200,
    )


def _jsonld_nodes(payload: object):
    if isinstance(payload, list):
        for item in payload:
            yield from _jsonld_nodes(item)
    elif isinstance(payload, dict):
        graph = payload.get("@graph")
        if graph:
            yield from _jsonld_nodes(graph)
        yield payload


def _is_event_node(node: dict) -> bool:
    kind = node.get("@type")
    kinds = kind if isinstance(kind, list) else [kind]
    return any(str(item).lower() == "event" for item in kinds)


def _shared_source(source: EventSource):
    """Retourne ou cree le corpus web reutilise par l Agenda."""
    from apps.assistant.models import CrawlSource, KnowledgeChunk

    if source.crawl_source_id:
        return source.crawl_source
    domain = urlparse(source.source_url).netloc.lower().removeprefix("www.")
    shared = next(
        (
            item
            for item in CrawlSource.objects.filter(is_active=True)
            if urlparse(item.seed_url).netloc.lower().removeprefix("www.") == domain
        ),
        None,
    )
    if shared is None:
        shared = CrawlSource.objects.create(
            label=f"{source.label} - corpus partage",
            kind=KnowledgeChunk.SourceKind.OT,
            seed_url=source.website_url or source.source_url,
            commune=source.commune,
            max_depth=2,
            max_pages=source.max_pages,
            render_mode=(
                CrawlSource.RenderMode.CRAWL4AI
                if source.connector == EventSource.Connector.CRAWL4AI
                else CrawlSource.RenderMode.AUTO
            ),
            use_sitemaps=True,
        )
    source.crawl_source = shared
    source.save(update_fields=["crawl_source", "updated_at"])
    return shared


def _discover_json_ld(
    source: EventSource,
) -> tuple[list[dict], list[str], bool]:
    """JSON-LD prioritaire, puis Mistral sur chaque page sans Event structure."""
    from apps.assistant.services.shared_crawl import refresh_source

    shared = _shared_source(source)
    refresh_source(shared)
    patterns = [line.strip().lower() for line in source.url_patterns.splitlines() if line.strip()]
    pages = list(shared.pages.filter(is_active=True).order_by("canonical_url"))
    if patterns:
        pages = [
            page
            for page in pages
            if any(pattern in page.canonical_url.lower() for pattern in patterns)
        ]

    events: list[dict] = []
    ai_pages: list[dict] = []
    for page in pages:
        page_event_count = 0
        for payload in page.json_ld:
            for node in _jsonld_nodes(payload):
                if _is_event_node(node):
                    events.append({"node": node, "page_url": page.canonical_url})
                    page_event_count += 1
        if page_event_count == 0 and len(page.cleaned_text) >= 200:
            ai_pages.append(
                {
                    "url": page.canonical_url,
                    "title": page.title,
                    "image_url": (page.metadata or {}).get("image_url", ""),
                    "links": page.links,
                    "content": page.cleaned_text,
                }
            )

    extraction_errors: list[str] = []
    ai_called = False
    if ai_pages:
        ai_events, extraction_errors, ai_called = extract_events_with_mistral(source, ai_pages)
        page_by_url = {page["url"]: page for page in ai_pages}
        for raw_event in ai_events:
            page_url = raw_event.get("source_page_url")
            if page_url in page_by_url:
                events.append({"ai_event": raw_event, "page": page_by_url[page_url]})
    return events, extraction_errors, ai_called


def _locality_commune(source: EventSource, locality: str) -> Commune | None:
    if source.commune_id:
        return source.commune
    if not locality:
        return None
    return Commune.objects.filter(name__iexact=locality, is_active=True).first()


def _guess_category(source: EventSource, text: str) -> EventCategory | None:
    if source.default_category_id:
        return source.default_category
    normalized = slugify(text)
    for category in EventCategory.objects.filter(is_active=True):
        if category.slug in normalized or slugify(category.name) in normalized:
            return category
    return None


def _geocode(address: str, commune: Commune | None) -> tuple[float | None, float | None]:
    if not address:
        return None, None
    query = address
    if commune and commune.name.lower() not in query.lower():
        query = f"{query}, {commune.name}"
    try:
        response = requests.get(
            "https://api-adresse.data.gouv.fr/search/",
            params={"q": query, "limit": 1},
            headers={"User-Agent": USER_AGENT},
            timeout=12,
        )
        response.raise_for_status()
        features = response.json().get("features") or []
        coords = features[0]["geometry"]["coordinates"] if features else None
        if coords and len(coords) >= 2:
            return float(coords[1]), float(coords[0])
    except (requests.RequestException, ValueError, KeyError, TypeError):
        logger.warning("Géocodage BAN impossible pour %s", query, exc_info=True)
    return None, None


def _normalize_json_ld(source: EventSource, item: dict) -> dict:
    node = item["node"]
    page_url = item["page_url"]
    title = _compact_text(node.get("name"), 200)
    description = _compact_text(node.get("description"))
    start = _aware(node.get("startDate"))
    end = _aware(node.get("endDate"), end=True)
    all_day = isinstance(node.get("startDate"), str) and len(node["startDate"]) == 10
    if start and not end:
        end = start + (timedelta(days=1) if all_day else timedelta(hours=2))

    location = node.get("location") or {}
    if isinstance(location, list):
        location = location[0] if location else {}
    if isinstance(location, str):
        location = {"name": location}
    address_data = location.get("address") or {}
    if isinstance(address_data, str):
        address = address_data
        locality = ""
    else:
        address = " ".join(
            str(address_data.get(key) or "").strip()
            for key in ("streetAddress", "postalCode", "addressLocality")
            if address_data.get(key)
        )
        locality = str(address_data.get("addressLocality") or "")
    geo = location.get("geo") or {}
    commune = _locality_commune(source, locality)
    latitude = geo.get("latitude")
    longitude = geo.get("longitude")
    if (latitude is None or longitude is None) and address:
        latitude, longitude = _geocode(address, commune)

    offers = node.get("offers") or {}
    if isinstance(offers, list):
        offers = offers[0] if offers else {}
    organizer = node.get("organizer") or {}
    organizer_name = organizer.get("name", "") if isinstance(organizer, dict) else organizer
    source_url = _absolute_http_url(page_url, node.get("url")) or page_url
    external_id = str(node.get("@id") or node.get("url") or "")
    uid_basis = external_id or f"{page_url}|{title}"
    source_uid = hashlib.sha256(uid_basis.encode()).hexdigest()[:48]
    fingerprint = hashlib.sha256(
        f"{slugify(title)}|{start.isoformat() if start else ''}|{commune_id(commune)}".encode()
    ).hexdigest()

    errors = []
    if not title:
        errors.append("Titre absent")
    if not start or not end:
        errors.append("Dates absentes ou invalides")
    if not commune:
        errors.append("Commune non reconnue")
    category = _guess_category(source, f"{title} {description}")
    if not category:
        errors.append("Catégorie non déterminée")
    return {
        "source_uid": source_uid,
        "extraction_method": EventImportCandidate.ExtractionMethod.JSON_LD,
        "source_url": source_url,
        "raw_payload": node,
        "fingerprint": fingerprint,
        "title": title or "Événement sans titre",
        "short_description": description[:240],
        "description": description,
        "image_url": _absolute_http_url(page_url, node.get("image")),
        "image_credit": _image_credit(node.get("image")),
        "starts_at": start,
        "ends_at": end,
        "occurrences": [
            {
                "starts_at": start.isoformat() if start else None,
                "ends_at": end.isoformat() if end else None,
                "is_all_day": all_day,
            }
        ],
        "is_all_day": all_day,
        "venue_name": _compact_text(location.get("name"), 150),
        "address": _compact_text(address, 255),
        "latitude": latitude,
        "longitude": longitude,
        "price": _compact_text(offers.get("price"), 100) if isinstance(offers, dict) else "",
        "booking_url": (
            _absolute_http_url(page_url, offers.get("url")) if isinstance(offers, dict) else ""
        ),
        "organizer": _compact_text(organizer_name, 150),
        "commune": commune,
        "category": category,
        "kind": source.default_kind,
        "validation_errors": errors,
    }


def _optional_float(value: object) -> float | None:
    try:
        return float(value) if value not in (None, "") else None
    except (TypeError, ValueError):
        return None


def _normalize_ai_event(source: EventSource, item: dict) -> dict:
    raw = item["ai_event"]
    page = item["page"]
    page_url = page["url"]
    title = _compact_text(raw.get("title"), 200)
    short_description = _compact_text(raw.get("short_description"), 240)
    description = _compact_text(raw.get("description"))
    locality = _compact_text(raw.get("locality"), 120)
    commune = _locality_commune(source, locality)
    venue_name = _compact_text(raw.get("venue_name"), 150)
    address = _compact_text(raw.get("address"), 255)
    latitude = _optional_float(raw.get("latitude"))
    longitude = _optional_float(raw.get("longitude"))
    if (latitude is None or longitude is None) and address:
        latitude, longitude = _geocode(address, commune)

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

    page_text = " ".join(str(page.get("content") or "").split()).casefold()
    verified_evidence = []
    evidence = raw.get("evidence") or []
    if isinstance(evidence, list):
        for value in evidence[:3]:
            snippet = _compact_text(value, 300)
            if snippet and " ".join(snippet.split()).casefold() in page_text:
                verified_evidence.append(snippet)

    category = _guess_category(source, f"{title} {description}")
    errors = []
    if not title:
        errors.append("Titre absent")
    if not occurrences:
        errors.append("Dates absentes, incomplètes ou invalides")
    if not commune:
        errors.append("Commune non reconnue")
    if not category:
        errors.append("Catégorie non déterminée")
    if not verified_evidence:
        errors.append("Preuve textuelle Mistral non vérifiable dans la page")

    links = set(page.get("links") or [])
    booking_candidate = _absolute_http_url(page_url, raw.get("booking_url"))
    booking_url = booking_candidate if booking_candidate in links else ""
    uid_basis = f"{page_url}|{slugify(title)}|{slugify(venue_name)}"
    source_uid = hashlib.sha256(uid_basis.encode()).hexdigest()[:48]
    fingerprint = hashlib.sha256(
        f"{slugify(title)}|{start.isoformat() if start else ''}|{commune_id(commune)}".encode()
    ).hexdigest()
    return {
        "source_uid": source_uid,
        "extraction_method": EventImportCandidate.ExtractionMethod.MISTRAL,
        "source_url": page_url,
        "raw_payload": {
            "mistral": raw,
            "verified_evidence": verified_evidence,
            "page_url": page_url,
        },
        "fingerprint": fingerprint,
        "title": title or "Événement sans titre",
        "short_description": short_description or description[:240],
        "description": description or short_description,
        "image_url": str(page.get("image_url") or ""),
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
        "commune": commune,
        "category": category,
        "kind": source.default_kind,
        "validation_errors": errors,
    }


def commune_id(commune: Commune | None) -> str:
    return str(commune.pk) if commune else ""


def _discover_ics(source: EventSource) -> list[dict]:
    response = fetcher.fetch(source.source_url, accept="text/calendar")
    if response is None:
        return []
    calendar = Calendar.from_ical(response.content)
    now = timezone.now()
    expanded = recurring_ical_events.of(calendar).between(
        now - timedelta(days=30),
        now + timedelta(days=730),
    )
    grouped: dict[str, list] = {}
    for component in expanded:
        uid = str(component.get("uid") or hashlib.sha256(component.to_ical()).hexdigest())
        grouped.setdefault(uid, []).append(component)
    return [{"uid": uid, "components": components} for uid, components in grouped.items()]


def _normalize_ics(source: EventSource, item: dict) -> dict:
    components = item["components"]
    first = components[0]
    title = _compact_text(first.get("summary"), 200)
    description = _compact_text(first.get("description"))
    location = _compact_text(first.get("location"), 255)
    commune = source.commune
    latitude, longitude = _geocode(location, commune)
    occurrences = []
    for component in components:
        start = _aware(component.decoded("dtstart"))
        end_value = component.decoded("dtend") if component.get("dtend") else None
        all_day = isinstance(component.decoded("dtstart"), date) and not isinstance(
            component.decoded("dtstart"), datetime
        )
        end = _aware(end_value, end=True) if end_value else None
        if start and not end:
            end = start + (timedelta(days=1) if all_day else timedelta(hours=2))
        if start and end:
            occurrences.append(
                {
                    "starts_at": start.isoformat(),
                    "ends_at": end.isoformat(),
                    "is_all_day": all_day,
                }
            )
    occurrences.sort(key=lambda row: row["starts_at"])
    start = _aware(occurrences[0]["starts_at"]) if occurrences else None
    end = _aware(occurrences[0]["ends_at"]) if occurrences else None
    base_url = source.website_url or source.source_url
    source_url = (
        _absolute_http_url(base_url, first.get("url")) or source.website_url or source.source_url
    )
    image_url = _absolute_http_url(
        base_url,
        first.get("image") or first.get("attach"),
    )
    category = _guess_category(source, f"{title} {description}")
    errors = []
    if not title:
        errors.append("Titre absent")
    if not occurrences:
        errors.append("Aucune date exploitable")
    if not commune:
        errors.append("Commune non définie sur la source")
    if not category:
        errors.append("Catégorie non déterminée")
    fingerprint = hashlib.sha256(
        f"{slugify(title)}|{start.isoformat() if start else ''}|{commune_id(commune)}".encode()
    ).hexdigest()
    return {
        "source_uid": item["uid"][:240],
        "extraction_method": EventImportCandidate.ExtractionMethod.ICS,
        "source_url": source_url,
        "raw_payload": {"uid": item["uid"], "occurrence_count": len(occurrences)},
        "fingerprint": fingerprint,
        "title": title or "Événement sans titre",
        "short_description": description[:240],
        "description": description,
        "image_url": image_url,
        "image_credit": _compact_text(first.get("x-image-credit"), 200),
        "starts_at": start,
        "ends_at": end,
        "occurrences": occurrences,
        "is_all_day": bool(occurrences and occurrences[0]["is_all_day"]),
        "venue_name": location[:150],
        "address": location,
        "latitude": latitude,
        "longitude": longitude,
        "price": "",
        "booking_url": "",
        "organizer": "",
        "commune": commune,
        "category": category,
        "kind": source.default_kind,
        "validation_errors": errors,
    }


def _assert_public_http_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("URL distante non HTTP(S)")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    for info in socket.getaddrinfo(parsed.hostname, port, type=socket.SOCK_STREAM):
        address = ipaddress.ip_address(info[4][0])
        if not address.is_global:
            raise ValueError("Adresse distante privée ou réservée")


def sync_source_image(event: Event, image_url: str) -> bool:
    if not image_url or not event.source or not event.source.sync_images:
        return False
    current_url = image_url
    response = None
    for _ in range(6):
        _assert_public_http_url(current_url)
        response = requests.get(
            current_url,
            headers={"User-Agent": USER_AGENT, "Accept": "image/*"},
            timeout=20,
            allow_redirects=False,
            stream=True,
        )
        if response.is_redirect or response.is_permanent_redirect:
            location = response.headers.get("Location")
            response.close()
            if not location:
                raise ValueError("Redirection image sans destination")
            current_url = urljoin(current_url, location)
            continue
        response.raise_for_status()
        break
    else:
        raise ValueError("Trop de redirections pour l’image officielle")
    content_length = int(response.headers.get("Content-Length") or 0)
    if content_length > MAX_IMAGE_BYTES:
        response.close()
        raise ValueError("Image officielle supérieure à 5 Mo")
    chunks = []
    downloaded = 0
    for chunk in response.iter_content(64 * 1024):
        downloaded += len(chunk)
        if downloaded > MAX_IMAGE_BYTES:
            response.close()
            raise ValueError("Image officielle supérieure à 5 Mo")
        chunks.append(chunk)
    content = b"".join(chunks)
    response.close()
    content_type = response.headers.get("Content-Type", "").split(";")[0]
    if content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise ValueError(f"Format image non accepté : {content_type}")
    try:
        with Image.open(BytesIO(content)) as image:
            image.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise ValueError("Image officielle invalide") from exc
    digest = hashlib.sha256(content).hexdigest()
    if event.source_image_hash == digest and event.source_cover_image:
        if event.source_image_url != image_url:
            event.source_image_url = image_url
            event.save(update_fields=["source_image_url", "updated_at"])
        return False
    suffix = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}[content_type]
    filename = f"{slugify(event.title)[:80]}-{digest[:12]}{suffix}"
    if event.source_cover_image:
        event.source_cover_image.delete(save=False)
    event.source_cover_image.save(filename, ContentFile(content), save=False)
    event.source_image_url = image_url
    event.source_image_hash = digest
    event.save(
        update_fields=[
            "source_cover_image",
            "source_image_url",
            "source_image_hash",
            "updated_at",
        ]
    )
    return True


def _unique_slug(title: str, source_uid: str) -> str:
    base = slugify(title)[:190] or "evenement"
    if not Event.objects.filter(slug=base).exists():
        return base
    return f"{base[:170]}-{hashlib.sha256(source_uid.encode()).hexdigest()[:8]}"


@transaction.atomic
def import_candidate(candidate: EventImportCandidate, *, publish: bool = True) -> Event:
    event = Event.objects.filter(
        source=candidate.source,
        source_uid=candidate.source_uid,
    ).first()
    creating = event is None
    if event is None:
        created_by = candidate.source.created_by
        if created_by is None:
            raise ValueError("La source doit avoir un créateur pour importer")
        event = Event(
            source=candidate.source,
            source_uid=candidate.source_uid,
            slug=_unique_slug(candidate.title, candidate.source_uid),
            created_by=created_by,
        )
    if event.source_sync_enabled or creating:
        event.title = candidate.title
        event.short_description = candidate.short_description or candidate.title
        event.description = candidate.description or candidate.short_description or candidate.title
        event.kind = candidate.kind
        event.category = candidate.category
        event.commune = candidate.commune
        event.venue_name = candidate.venue_name or candidate.commune.name
        event.address = candidate.address
        event.location = (
            Point(float(candidate.longitude), float(candidate.latitude), srid=4326)
            if candidate.latitude is not None and candidate.longitude is not None
            else None
        )
        event.price = candidate.price
        event.booking_url = candidate.booking_url
        event.organizer = candidate.organizer
        event.official_url = candidate.source_url
        event.image_credit = candidate.image_credit
        event.source_updated_at = timezone.now()
        event.status = Event.Status.PUBLISHED if publish else Event.Status.DRAFT
        event.save()

        rows = candidate.occurrences or [
            {
                "starts_at": candidate.starts_at.isoformat() if candidate.starts_at else None,
                "ends_at": candidate.ends_at.isoformat() if candidate.ends_at else None,
                "is_all_day": candidate.is_all_day,
            }
        ]
        seen_starts = []
        for row in rows:
            starts_at = _aware(row.get("starts_at"))
            ends_at = _aware(row.get("ends_at"), end=True)
            if not starts_at or not ends_at:
                continue
            EventOccurrence.objects.update_or_create(
                event=event,
                starts_at=starts_at,
                defaults={
                    "ends_at": ends_at,
                    "is_all_day": bool(row.get("is_all_day")),
                    "status": EventOccurrence.Status.SCHEDULED,
                },
            )
            seen_starts.append(starts_at)
        event.occurrences.filter(
            starts_at__gte=timezone.now(),
        ).exclude(
            starts_at__in=seen_starts
        ).update(status=EventOccurrence.Status.CANCELLED)

    if candidate.image_url:
        try:
            sync_source_image(event, candidate.image_url)
        except (requests.RequestException, ValueError):
            logger.warning("Image officielle non synchronisée pour %s", event.slug, exc_info=True)
    candidate.status = EventImportCandidate.Status.IMPORTED
    candidate.matched_event = event
    candidate.imported_at = timezone.now()
    candidate.save(update_fields=["status", "matched_event", "imported_at", "last_seen_at"])
    return event


def _upsert_candidate(source: EventSource, data: dict) -> tuple[EventImportCandidate, bool, bool]:
    existing = EventImportCandidate.objects.filter(
        source=source,
        source_uid=data["source_uid"],
    ).first()
    duplicate = None
    if existing is None:
        duplicate = (
            EventImportCandidate.objects.filter(
                fingerprint=data["fingerprint"],
                status=EventImportCandidate.Status.IMPORTED,
                matched_event__isnull=False,
            )
            .exclude(source=source)
            .select_related("matched_event")
            .first()
        )
    created = existing is None
    previous_payload = existing.raw_payload if existing else None
    payload_changed = previous_payload != data["raw_payload"]
    status = (
        EventImportCandidate.Status.INVALID
        if data["validation_errors"]
        else (
            EventImportCandidate.Status.DUPLICATE
            if duplicate
            else EventImportCandidate.Status.PENDING
        )
    )
    candidate, _ = EventImportCandidate.objects.update_or_create(
        source=source,
        source_uid=data["source_uid"],
        defaults={
            **data,
            "matched_event": (
                existing.matched_event
                if existing
                else duplicate.matched_event if duplicate else None
            ),
            "status": (
                existing.status
                if (
                    existing
                    and existing.status
                    in {
                        EventImportCandidate.Status.REJECTED,
                        EventImportCandidate.Status.IMPORTED,
                    }
                    and not (
                        data["extraction_method"] == EventImportCandidate.ExtractionMethod.MISTRAL
                        and payload_changed
                    )
                )
                else status
            ),
        },
    )
    updated = not created and previous_payload != data["raw_payload"]
    if candidate.status == EventImportCandidate.Status.IMPORTED and candidate.matched_event_id:
        import_candidate(
            candidate, publish=candidate.matched_event.status == Event.Status.PUBLISHED
        )
    return candidate, created, updated


def sync_event_source(source: EventSource) -> EventImportRun:
    run = EventImportRun.objects.create(source=source)
    source.last_status = EventSource.SyncStatus.RUNNING
    source.last_error = ""
    source.save(update_fields=["last_status", "last_error", "updated_at"])
    errors: list[str] = []
    try:
        if source.connector in {
            EventSource.Connector.JSON_LD,
            EventSource.Connector.CRAWL4AI,
        }:
            raw_items, extraction_errors, ai_called = _discover_json_ld(source)
            errors.extend(extraction_errors)
            normalized = [
                (
                    _normalize_ai_event(source, item)
                    if "ai_event" in item
                    else _normalize_json_ld(source, item)
                )
                for item in raw_items
            ]
            run.ai_extraction_count = sum(
                item["extraction_method"] == EventImportCandidate.ExtractionMethod.MISTRAL
                for item in normalized
            )
            if ai_called and run.ai_extraction_count == 0 and not extraction_errors:
                errors.append("Mistral n’a détecté aucun événement explicite.")
        elif source.connector == EventSource.Connector.ICS:
            raw_items = _discover_ics(source)
            normalized = [_normalize_ics(source, item) for item in raw_items]
        else:
            raise ValueError(f"Connecteur non pris en charge : {source.connector}")

        before_dedup = len(normalized)
        seen_fingerprints = set()
        deduplicated = []
        for item in normalized:
            if item["fingerprint"] in seen_fingerprints:
                continue
            seen_fingerprints.add(item["fingerprint"])
            deduplicated.append(item)
        normalized = deduplicated
        run.duplicate_count += before_dedup - len(normalized)
        run.discovered_count = len(normalized)
        for data in normalized:
            try:
                candidate, created, updated = _upsert_candidate(source, data)
                run.created_count += int(created)
                run.updated_count += int(updated)
                run.duplicate_count += int(
                    candidate.status == EventImportCandidate.Status.DUPLICATE
                )
                run.imported_count += int(candidate.status == EventImportCandidate.Status.IMPORTED)
            except Exception as exc:  # noqa: BLE001
                logger.exception("Candidat Agenda impossible pour %s", source.label)
                errors.append(str(exc)[:500])
        if not normalized:
            errors.append("Aucun événement structuré détecté")
        run.error_count = len(errors)
        run.error_details = errors
        run.status = (
            EventImportRun.Status.ERROR
            if not normalized
            else EventImportRun.Status.PARTIAL if errors else EventImportRun.Status.SUCCESS
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Synchronisation Agenda échouée pour %s", source.label)
        errors.append(str(exc)[:500])
        run.status = EventImportRun.Status.ERROR
        run.error_count = 1
        run.error_details = errors
    run.finished_at = timezone.now()
    run.save()
    source.last_synced_at = run.finished_at
    source.last_status = {
        EventImportRun.Status.SUCCESS: EventSource.SyncStatus.OK,
        EventImportRun.Status.PARTIAL: EventSource.SyncStatus.PARTIAL,
        EventImportRun.Status.ERROR: EventSource.SyncStatus.ERROR,
    }[run.status]
    source.last_error = "\n".join(errors)
    source.save(update_fields=["last_synced_at", "last_status", "last_error", "updated_at"])
    return run

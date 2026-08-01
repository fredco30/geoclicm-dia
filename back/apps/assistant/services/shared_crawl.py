"""Crawler persistant partage entre le RAG et les imports Agenda."""

from __future__ import annotations

import gzip
import hashlib
import ipaddress
import json
import logging
import re
import socket
from collections import deque
from dataclasses import dataclass
from datetime import timedelta
from urllib.parse import parse_qsl, urldefrag, urlencode, urljoin, urlparse, urlunparse

from bs4 import BeautifulSoup
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from apps.assistant.indexers.http_fetcher import fetcher
from apps.assistant.models import CrawledPage, CrawlRun, CrawlSource
from apps.events.crawl4ai_client import fetch_rendered_html

logger = logging.getLogger(__name__)
ASSET_SUFFIXES = (
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".svg",
    ".ico",
    ".pdf",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
    ".zip",
    ".mp3",
    ".mp4",
)
SKIP_PARTS = ("/login", "/connexion", "/wp-admin", "/cart", "/panier", "/account")
# Pages de listing / pagination : doublons d'extraction et cout IA multiplies
# par le nombre de pages de la liste. Jamais utiles (ni assistant ni boites de
# validation) : les fiches detaillees sont crawlees a part.
LISTING_SKIP_PARTS = (
    "?periode=",
    "&periode=",
    "/tous-les-agendas",
    "/l-agenda-",
    "?l-41-",
    "&l-41-",
    "?page=",
    "&page=",
)
# Pages non francaises : meme contenu traduit, analyse inutilement par l IA en
# plusieurs langues. Prefixes de chemin uniquement (evite les faux positifs sur
# des segments en plein milieu d une URL).
NON_FR_PATH_PARTS = ("/en/", "/es/", "/it/", "/de/")
TRACKING_KEYS = {"fbclid", "gclid", "mc_cid", "mc_eid"}


def canonicalize_url(url: str) -> str:
    raw = urldefrag(url.strip())[0]
    parsed = urlparse(raw)
    path = re.sub(r"/{2,}", "/", parsed.path or "/")
    if path != "/":
        path = path.rstrip("/")
    query = urlencode(
        sorted(
            (key, value)
            for key, value in parse_qsl(parsed.query, keep_blank_values=True)
            if not key.lower().startswith("utm_") and key.lower() not in TRACKING_KEYS
        )
    )
    return urlunparse((parsed.scheme.lower(), parsed.netloc.lower(), path, "", query, ""))


def _assert_public_http_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("URL distante non HTTP(S)")
    port = parsed.port or (443 if parsed.scheme == "https" else 80)
    for info in socket.getaddrinfo(parsed.hostname, port, type=socket.SOCK_STREAM):
        if not ipaddress.ip_address(info[4][0]).is_global:
            raise ValueError("Adresse distante privee ou reservee")


def _same_domain(url: str, domain: str) -> bool:
    return urlparse(url).netloc.lower().removeprefix("www.") == domain.removeprefix("www.")


def _patterns(value: str) -> list[str]:
    return [line.strip().lower() for line in value.splitlines() if line.strip()]


def _allowed(source: CrawlSource, url: str) -> bool:
    lower = url.lower()
    if urlparse(url).scheme not in {"http", "https"}:
        return False
    if urlparse(url).path.lower().endswith(ASSET_SUFFIXES) or any(
        part in lower for part in SKIP_PARTS + LISTING_SKIP_PARTS
    ):
        return False
    if any(part in urlparse(url).path.lower() for part in NON_FR_PATH_PARTS):
        return False
    includes, excludes = _patterns(source.include_patterns), _patterns(source.exclude_patterns)
    return (not includes or any(item in lower for item in includes)) and not any(
        item in lower for item in excludes
    )


def _meta_content(soup, *candidates) -> str:
    """Premier contenu meta non vide parmi plusieurs sélecteurs possibles."""
    for attrs in candidates:
        tag = soup.find("meta", attrs=attrs)
        if tag and tag.get("content"):
            return str(tag["content"]).strip()
    return ""


def _parse_html(html: str, page_url: str, method: str, status: int | None, depth: int) -> dict:
    page_url = canonicalize_url(page_url)
    soup = BeautifulSoup(html, "lxml")
    canonical = soup.find("link", rel=lambda value: value and "canonical" in value)
    canonical_url = (
        canonicalize_url(urljoin(page_url, canonical.get("href")))
        if canonical and canonical.get("href")
        else page_url
    )
    title = soup.title.get_text(" ", strip=True)[:500] if soup.title else ""
    image = soup.find("meta", attrs={"property": "og:image"})
    description = soup.find("meta", attrs={"name": "description"})

    metadata = {
        "image_url": (
            urljoin(page_url, image.get("content")) if image and image.get("content") else ""
        ),
        "description": description.get("content", "")[:2000] if description else "",
        "published_at": _meta_content(
            soup,
            {"property": "article:published_time"},
            {"name": "article:published_time"},
            {"name": "date"},
            {"name": "dc.date"},
            {"name": "dc.date.created"},
            {"itemprop": "datePublished"},
        ),
        "modified_at": _meta_content(
            soup,
            {"property": "article:modified_time"},
            {"name": "article:modified_time"},
            {"name": "last-modified"},
            {"itemprop": "dateModified"},
        ),
    }
    links = []
    for anchor in soup.find_all("a", href=True):
        candidate = canonicalize_url(urljoin(page_url, anchor["href"]))
        if candidate and candidate not in links:
            links.append(candidate)
    payloads = []
    for script in soup.find_all("script", attrs={"type": "application/ld+json"}):
        try:
            payloads.append(json.loads(script.string or script.get_text()))
        except (TypeError, json.JSONDecodeError):
            continue
    # Repli JSON-LD quand la meta HTML ne donne pas la date de publication
    # (Yoast n'expose datePublished qu'en JSON-LD sur beaucoup de sites).
    if not metadata["published_at"]:
        from apps.discovery.page_dates import _json_ld_dates

        ld_published, _ = _json_ld_dates(payloads)
        if ld_published:
            metadata["published_at"] = ld_published
    visible = BeautifulSoup(html, "lxml")
    for tag in visible.find_all(
        ["script", "style", "noscript", "svg", "nav", "footer", "header", "form"]
    ):
        tag.decompose()
    main = visible.find("main") or visible.find("article") or visible.body or visible
    text = "\n".join(
        line.strip() for line in main.get_text("\n", strip=True).splitlines() if line.strip()
    )
    return {
        "url": page_url,
        "canonical_url": canonical_url,
        "title": title,
        "text": text,
        "html": html,
        "links": links,
        "json_ld": payloads,
        "metadata": metadata,
        "fetch_method": method,
        "http_status": status,
        "depth": depth,
    }


def _render(url: str) -> str | None:
    if not getattr(settings, "CRAWL4AI_URL", ""):
        return None
    return fetch_rendered_html(
        url,
        base_url=settings.CRAWL4AI_URL,
        api_token=getattr(settings, "CRAWL4AI_TOKEN", ""),
        email=getattr(settings, "CRAWL4AI_EMAIL", ""),
    )


def _fetch(source: CrawlSource, url: str, depth: int) -> dict | None:
    html, status, method = None, None, CrawledPage.FetchMethod.HTTP
    if source.render_mode != CrawlSource.RenderMode.CRAWL4AI:
        response = fetcher.fetch(url, accept="text/html")
        if response is not None:
            html, status = response.text, response.status_code
    needs_render = source.render_mode == CrawlSource.RenderMode.CRAWL4AI or (
        source.render_mode == CrawlSource.RenderMode.AUTO
        and (not html or len(BeautifulSoup(html, "lxml").get_text(" ", strip=True)) < 200)
    )
    if needs_render and (rendered := _render(url)):
        html, status, method = rendered, 200, CrawledPage.FetchMethod.CRAWL4AI
    return _parse_html(html, url, method, status, depth) if html else None


def _sitemap_urls(source: CrawlSource) -> set[str]:
    if not source.use_sitemaps:
        return set()
    parsed = urlparse(source.seed_url)
    root = f"{parsed.scheme}://{parsed.netloc}"
    maps = deque([f"{root}/sitemap.xml", f"{root}/sitemap_index.xml"])
    robots = fetcher.fetch(f"{root}/robots.txt", accept="text/plain")
    if robots is not None:
        for line in robots.text.splitlines():
            if line.lower().startswith("sitemap:"):
                # Ne jamais suivre un sitemap d'un autre domaine : certains
                # WordPress mutualises listent des dizaines de sitemaps
                # d'autres communes (Yoast), ce qui ferait explorer des
                # domaines etrangers a la source (lenteur extreme, risque de
                # crawler hors perimetre).
                declared = line.split(":", 1)[1].strip()
                if _same_domain(declared, parsed.netloc.lower()):
                    maps.append(declared)
    seen, pages = set(), set()
    while maps and len(seen) < 100:
        sitemap_url = canonicalize_url(maps.popleft())
        if sitemap_url in seen:
            continue
        seen.add(sitemap_url)
        response = fetcher.fetch(sitemap_url, accept="application/xml,text/xml")
        if response is None:
            continue
        for loc in BeautifulSoup(response.text, "xml").find_all("loc"):
            candidate = canonicalize_url(loc.get_text(strip=True))
            if not _same_domain(candidate, parsed.netloc.lower()):
                continue
            if candidate.lower().endswith((".xml", ".xml.gz")):
                maps.append(candidate)
            elif _allowed(source, candidate):
                pages.add(candidate)
    return pages


def _page_identity_hash(page: dict) -> str:
    return hashlib.sha256(page["url"].encode()).hexdigest()


def _save_page(source: CrawlSource, page: dict, now) -> tuple[CrawledPage, bool]:
    # La canonique declaree n'est pas toujours une identite de page fiable.
    # Certains sites d'OT partagent une meme canonique generique entre toutes
    # leurs fiches evenement, qui s'ecraseraient alors entre elles. L'URL mise
    # en file est stable et conserve chaque fiche distincte ; la canonique
    # reste disponible comme metadonnee.
    url_hash = _page_identity_hash(page)
    content_hash = hashlib.sha256(page["html"].encode("utf-8", errors="replace")).hexdigest()
    current = CrawledPage.objects.filter(source=source, url_hash=url_hash).first()
    changed = current is None or current.content_hash != content_hash
    from apps.assistant.services.page_signals import compute_signals

    shared_count = (
        CrawledPage.objects.filter(source=source, canonical_url=page["canonical_url"])
        .exclude(pk=current.pk if current else None)
        .count()
    )
    signals = compute_signals(
        cleaned_text=page["text"],
        json_ld=page["json_ld"],
        links=page["links"],
        depth=page["depth"],
        canonical_url=page["canonical_url"],
        canonical_counts={page["canonical_url"]: shared_count + 1},
    )
    values = {
        "canonical_url": page["canonical_url"],
        "final_url": page["url"],
        "title": page["title"],
        "cleaned_text": page["text"],
        "raw_html_gzip": gzip.compress(page["html"].encode("utf-8", errors="replace")),
        "metadata": page["metadata"],
        "links": page["links"],
        "json_ld": page["json_ld"],
        "content_hash": content_hash,
        "fetch_method": page["fetch_method"],
        "http_status": page["http_status"],
        "depth": page["depth"],
        "signals": signals,
        "is_active": True,
        "fetched_at": now,
        "changed_at": now if changed else current.changed_at,
        "last_error": "",
    }
    obj, _ = CrawledPage.objects.update_or_create(source=source, url_hash=url_hash, defaults=values)
    return obj, changed


@dataclass(frozen=True)
class CrawlRefreshDecision:
    """Decision tracee : rafraichir le site ou reutiliser ses pages stockees."""

    refreshed: bool
    reason: str
    run: CrawlRun | None = None


def source_is_fresh(source: CrawlSource, *, at=None) -> bool:
    """Vrai si un corpus exploitable a ete collecte dans la fenetre configuree."""
    if source.last_status not in {CrawlRun.Status.OK, CrawlRun.Status.PARTIAL}:
        return False
    if source.last_crawled_at is None:
        return False
    freshness_seconds = max(
        0,
        int(getattr(settings, "SHARED_CRAWL_FRESHNESS_SECONDS", 6 * 60 * 60)),
    )
    if freshness_seconds == 0:
        return False
    now = at or timezone.now()
    if source.last_crawled_at < now - timedelta(seconds=freshness_seconds):
        return False
    return source.pages.filter(is_active=True).exists()


def ensure_source_fresh(
    source: CrawlSource,
    *,
    force: bool = False,
) -> CrawlRefreshDecision:
    """Rafraichit seulement un corpus du ou explicitement force."""
    if not force and source_is_fresh(source):
        return CrawlRefreshDecision(refreshed=False, reason="fresh")

    lock_key = f"assistant:crawl-source:{source.pk}:running"
    lock_timeout = max(
        300,
        int(getattr(settings, "SHARED_CRAWL_LOCK_SECONDS", 6 * 60 * 60)),
    )
    if not cache.add(lock_key, True, timeout=lock_timeout):
        if source.pages.filter(is_active=True).exists():
            return CrawlRefreshDecision(refreshed=False, reason="already_running")
        raise RuntimeError(f"Crawl de la source {source.pk} deja en cours")

    try:
        if not force and hasattr(source, "refresh_from_db"):
            source.refresh_from_db(fields=("last_status", "last_crawled_at", "last_truncated"))
            if source_is_fresh(source):
                return CrawlRefreshDecision(
                    refreshed=False,
                    reason="fresh_after_lock",
                )
        run = refresh_source(source)
        return CrawlRefreshDecision(refreshed=True, reason="refreshed", run=run)
    finally:
        cache.delete(lock_key)


def refresh_source(source: CrawlSource) -> CrawlRun:
    """Collecte sans limite metier; la garde serveur est signalee comme troncature."""
    run = CrawlRun.objects.create(source=source)
    now = timezone.now()
    hard_limit = max(1, int(getattr(settings, "SHARED_CRAWL_HARD_LIMIT", 5000)))
    effective_limit = min(source.max_pages or hard_limit, hard_limit)
    domain = urlparse(source.seed_url).netloc.lower()
    seed = canonicalize_url(source.seed_url)
    queue = deque([(seed, 0)])
    queued = {seed}
    errors: list[str] = []
    fetched_hashes: set[str] = set()
    changed = 0

    try:
        for url in sorted(_sitemap_urls(source)):
            if url not in queued:
                queue.append((url, 0))
                queued.add(url)
        run.discovered_count = len(queued)

        while queue and run.fetched_count < effective_limit:
            url, depth = queue.popleft()
            if not _same_domain(url, domain) or not _allowed(source, url):
                continue
            try:
                page = _fetch(source, url, depth)
            except Exception as exc:  # noqa: BLE001
                logger.warning("Echec crawl %s", url, exc_info=True)
                errors.append(f"{url}: {str(exc)[:300]}")
                run.failed_count += 1
                continue
            if page is None:
                errors.append(f"{url}: aucune reponse exploitable")
                run.failed_count += 1
                continue

            run.fetched_count += 1
            obj, was_changed = _save_page(source, page, now)
            fetched_hashes.add(obj.url_hash)
            run.stored_count += 1
            changed += int(was_changed)
            if depth < source.max_depth:
                for link in page["links"]:
                    if link not in queued and _same_domain(link, domain) and _allowed(source, link):
                        queue.append((link, depth + 1))
                        queued.add(link)
            run.discovered_count = len(queued)

        run.truncated = bool(queue)
        if not run.truncated and run.failed_count == 0:
            source.pages.filter(is_active=True).exclude(url_hash__in=fetched_hashes).update(
                is_active=False
            )
        run.changed_count = changed
        run.status = (
            CrawlRun.Status.PARTIAL if run.truncated or run.failed_count else CrawlRun.Status.OK
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Crawl partage impossible pour %s", source.label)
        errors.append(str(exc)[:500])
        run.status = CrawlRun.Status.ERROR

    run.error_details = errors[:200]
    run.finished_at = timezone.now()
    run.save()
    source.last_crawled_at = run.finished_at
    source.last_status = run.status
    source.last_error = "\n".join(errors[:10])
    source.last_discovered_count = run.discovered_count
    source.last_fetched_count = run.fetched_count
    source.last_stored_count = source.pages.filter(is_active=True).count()
    source.last_failed_count = run.failed_count
    source.last_changed_count = run.changed_count
    source.last_truncated = run.truncated
    source.save(
        update_fields=[
            "last_crawled_at",
            "last_status",
            "last_error",
            "last_discovered_count",
            "last_fetched_count",
            "last_stored_count",
            "last_failed_count",
            "last_changed_count",
            "last_truncated",
            "updated_at",
        ]
    )
    return run

"""
Crawler web générique — utilisé pour les mairies, offices de tourisme,
sites des commerçants déclarés.

Stratégie :
- Démarre sur seed_url (CrawlSource ou Business.website)
- Suit les liens internes (même domaine) jusqu'à max_depth
- Respecte robots.txt + rate limit (cf http_fetcher.PoliteFetcher)
- Extrait le texte propre via BeautifulSoup (skip nav, footer, scripts)
- Indexe chaque page utile (titre + texte > 200 chars) comme un chunk
- Désactive les pages qui n'apparaissent plus dans le crawl courant
  (= contenu retiré côté source)

Volontairement minimaliste : pas de queue distribuée, pas de gestion
JavaScript, pas de form login. Pour les sites de mairies / OT / TPE,
c'est largement suffisant.
"""

from __future__ import annotations

import logging
from urllib.parse import urldefrag, urljoin, urlparse

from bs4 import BeautifulSoup

from ..models import CrawlSource, KnowledgeChunk
from .base import ChunkInput, build_source_id_from_url, chunk_text, save_chunks
from .http_fetcher import fetcher

logger = logging.getLogger(__name__)


# Pages typiques à exclure (login, panier, recherche). Une URL qui matche
# une de ces patterns dans son path est ignorée.
SKIP_URL_KEYWORDS = (
    "/login",
    "/connexion",
    "/cart",
    "/panier",
    "/wp-admin",
    "/account",
    "/recherche?",
    "/search?",
    "/feed",
    "/rss",
    ".pdf",
    ".doc",
    ".xls",
    ".zip",
    ".jpg",
    ".png",
    ".gif",
)


def _is_same_domain(url: str, base_domain: str) -> bool:
    try:
        return urlparse(url).netloc.lower() == base_domain.lower()
    except Exception:  # noqa: BLE001
        return False


def _should_skip(url: str) -> bool:
    """True si l'URL est typiquement non utile (login, asset, etc.)."""
    lower = url.lower()
    for kw in SKIP_URL_KEYWORDS:
        if kw in lower:
            return True
    return False


def _extract_text(html: str) -> tuple[str, str]:
    """Extrait (title, body_text) d'une page HTML."""
    soup = BeautifulSoup(html, "lxml")

    # Titre : <title> ou <h1>
    title_tag = soup.find("title")
    title = title_tag.get_text(strip=True) if title_tag else ""
    if not title:
        h1 = soup.find("h1")
        title = h1.get_text(strip=True) if h1 else "Sans titre"

    # Retire les éléments non textuels
    for tag in soup(["script", "style", "nav", "footer", "aside", "form", "noscript"]):
        tag.decompose()

    # Cible le contenu principal s'il existe
    main = soup.find("main") or soup.find("article") or soup.body or soup
    text = main.get_text(separator="\n", strip=True)

    # Compacte les espaces
    lines = [line.strip() for line in text.splitlines()]
    lines = [line for line in lines if line]
    text = "\n".join(lines)

    return title, text


def crawl_site(
    seed_url: str,
    max_depth: int = 2,
    max_pages: int = 0,
) -> list[tuple[str, str, str]]:
    """
    Crawle un site à partir de seed_url. Renvoie une liste de tuples
    (url, title, body_text) pour chaque page utile collectée.
    """
    if not seed_url:
        return []

    base_domain = urlparse(seed_url).netloc
    if not base_domain:
        return []

    visited: set[str] = set()
    queue: list[tuple[str, int]] = [(seed_url, 0)]
    results: list[tuple[str, str, str]] = []

    while queue and (max_pages == 0 or len(results) < max_pages):
        url, depth = queue.pop(0)
        if url in visited:
            continue
        visited.add(url)

        if _should_skip(url):
            continue

        response = fetcher.fetch(url, accept="text/html")
        if response is None:
            continue

        title, text = _extract_text(response.text)
        if len(text) >= 200:
            results.append((url, title, text))

        # Suit les liens internes si on n'a pas atteint max_depth
        if depth < max_depth:
            try:
                soup = BeautifulSoup(response.text, "lxml")
            except Exception:  # noqa: BLE001
                continue
            for a in soup.find_all("a", href=True):
                next_url = urljoin(url, a["href"])
                next_url = urldefrag(next_url)[0]
                if not _is_same_domain(next_url, base_domain):
                    continue
                if next_url in visited:
                    continue
                if _should_skip(next_url):
                    continue
                queue.append((next_url, depth + 1))

    return results


def crawl_source(source: CrawlSource, *, force: bool = False) -> dict[str, int]:
    """Indexe le corpus partage et ne rafraichit le site que s'il est du."""
    from apps.assistant.services.shared_crawl import ensure_source_fresh

    decision = ensure_source_fresh(source, force=force)
    run = decision.run
    chunk_inputs: list[ChunkInput] = []
    for page in source.pages.filter(is_active=True).iterator():
        if len(page.cleaned_text) < 200:
            continue
        for i, content in enumerate(chunk_text(page.cleaned_text)):
            url_id = build_source_id_from_url(page.canonical_url)
            chunk_inputs.append(
                ChunkInput(
                    source_kind=source.kind,
                    source_id=f"src{source.id}:{url_id}#{i}",
                    source_url=page.canonical_url,
                    title=page.title if i == 0 else f"{page.title} (suite)",
                    content=content,
                    commune=source.commune,
                    is_premium=False,
                )
            )
    result = save_chunks(
        chunk_inputs,
        source_kind=source.kind,
        deactivate_others_for_source_prefix=f"src{source.id}:",
    )
    result.update(
        {
            "pages": source.pages.filter(is_active=True).count(),
            "failed_pages": run.failed_count if run else 0,
            "truncated": int(run.truncated) if run else int(source.last_truncated),
            "refreshed": int(decision.refreshed),
            "reused": int(not decision.refreshed),
        }
    )
    return result


def crawl_all_active_sources(*, force: bool = False) -> dict[str, int]:
    """Actualise seulement les sources dues, en sequence par respect des sites."""
    totals = {
        "created": 0,
        "updated": 0,
        "unchanged": 0,
        "deactivated": 0,
        "embedded": 0,
        "sources": 0,
        "refreshed_sources": 0,
        "reused_sources": 0,
    }
    for source in CrawlSource.objects.filter(is_active=True):
        try:
            result = crawl_source(source, force=force)
        except Exception as exc:  # noqa: BLE001
            logger.exception("crawl_source failed for %s: %s", source.label, exc)
            from django.utils import timezone

            source.last_status = "error"
            source.last_error = str(exc)[:500]
            source.last_crawled_at = timezone.now()
            source.save(update_fields=["last_status", "last_error", "last_crawled_at"])
            continue
        totals["sources"] += 1
        totals["refreshed_sources"] += result.get("refreshed", 0)
        totals["reused_sources"] += result.get("reused", 0)
        for key in ("created", "updated", "unchanged", "deactivated", "embedded"):
            totals[key] += result.get(key, 0)
    return totals


def crawl_business_websites() -> dict[str, int]:
    """Crawle les sites web des commerçants publiés qui ont déclaré
    une URL website. Profondeur 1 (juste la home, pas les sous-pages).

    Utile pour enrichir l'index avec leur description self-déclarée.
    """
    from apps.directory.models import Business

    totals = {"created": 0, "updated": 0, "unchanged": 0, "deactivated": 0, "embedded": 0}
    qs = Business.objects.filter(is_published=True).exclude(website="").select_related("commune")
    for business in qs:
        try:
            pages = crawl_site(business.website, max_depth=1, max_pages=3)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "crawl_site failed for %s (%s): %s", business.slug, business.website, exc
            )
            continue

        is_premium = business.plan in ("basic", "premium")
        chunk_inputs: list[ChunkInput] = []
        for url, title, body in pages:
            for i, ct in enumerate(chunk_text(body)):
                url_id = build_source_id_from_url(url)
                chunk_inputs.append(
                    ChunkInput(
                        source_kind=KnowledgeChunk.SourceKind.BUSINESS,
                        source_id=f"web:{business.slug}:{url_id}#{i}",
                        source_url=url,
                        title=f"{business.name} — {title}" if title else business.name,
                        content=ct,
                        commune=business.commune,
                        is_premium=is_premium,
                    )
                )

        result = save_chunks(
            chunk_inputs,
            source_kind=KnowledgeChunk.SourceKind.BUSINESS,
            deactivate_others_for_source_prefix=f"web:{business.slug}:",
        )
        for k in totals:
            totals[k] += result.get(k, 0)

    return totals

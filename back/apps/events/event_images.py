"""Sélection locale et traçable d'une image propre à un événement."""

from __future__ import annotations

import gzip
import math
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass
from urllib.parse import urljoin, urlparse

from bs4 import BeautifulSoup


@dataclass(frozen=True)
class EventImageSelection:
    url: str = ""
    method: str = "none"
    ambiguous: bool = False
    reason: str = ""


def _normalized(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = text.encode("ascii", "ignore").decode().casefold()
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def _first_url(value: object) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return next((url for item in value if (url := _first_url(item))), "")
    if isinstance(value, dict):
        return str(value.get("url") or value.get("contentUrl") or "")
    return ""


def generic_image_urls(crawl_source) -> set[str]:
    """Repère les OG manifestement globaux sans liste de domaines codée en dur."""
    pages = list(
        crawl_source.pages.filter(is_active=True).only(
            "final_url", "canonical_url", "metadata", "raw_html_gzip"
        )
    )
    counts: Counter[str] = Counter()
    for page in pages:
        page_url = page.final_url or page.canonical_url
        page_images = {
            str((page.metadata or {}).get("image_url") or ""),
        }
        if page.raw_html_gzip:
            html = gzip.decompress(bytes(page.raw_html_gzip)).decode(
                "utf-8", errors="replace"
            )
            soup = BeautifulSoup(html, "lxml")
            page_images.update(
                url for image in soup.find_all("img") if (url := _image_url(image, page_url))
            )
        counts.update(image for image in page_images if image)
    threshold = max(3, math.ceil(max(len(pages), 1) * 0.20))
    return {url for url, count in counts.items() if count >= threshold}


def _image_url(tag, page_url: str) -> str:
    raw = tag.get("src") or tag.get("data-src") or tag.get("data-lazy-src") or ""
    if not raw and tag.get("srcset"):
        raw = tag.get("srcset").split(",")[0].strip().split(" ")[0]
    absolute = urljoin(page_url, raw) if raw else ""
    return absolute if urlparse(absolute).scheme in {"http", "https"} else ""


def select_event_image(
    page,
    *,
    title: str,
    json_ld_image: object = None,
    generic_urls: set[str] | None = None,
) -> EventImageSelection:
    generic_urls = generic_urls or set()
    if raw_json_ld := _first_url(json_ld_image):
        url = urljoin(page.final_url or page.canonical_url, raw_json_ld)
        if url not in generic_urls:
            return EventImageSelection(url, "json_ld_event", reason="Event.image")

    if not page.raw_html_gzip:
        return EventImageSelection(reason="HTML stocké absent")
    html = gzip.decompress(bytes(page.raw_html_gzip)).decode("utf-8", errors="replace")
    soup = BeautifulSoup(html, "lxml")
    page_url = page.final_url or page.canonical_url
    wanted = _normalized(title)
    candidates: list[tuple[int, int, str, str]] = []
    for order, image in enumerate(soup.find_all("img")):
        url = _image_url(image, page_url)
        if not url or url in generic_urls:
            continue
        descriptor = _normalized(
            " ".join(
                str(value or "")
                for value in (image.get("alt"), image.get("title"), image.get("aria-label"))
            )
        )
        ancestor_text = ""
        current = image.parent
        for _ in range(4):
            if current is None:
                break
            ancestor_text += " " + current.get_text(" ", strip=True)[:1000]
            current = current.parent
        ancestor_text = _normalized(ancestor_text)
        score = 0
        method = ""
        if wanted and (wanted in descriptor or descriptor in wanted) and len(descriptor) >= 8:
            score += 100
            method = "dom_title"
        if wanted and wanted in ancestor_text:
            score += 40
            method = method or "dom_container"
        classes = _normalized(
            " ".join(image.get("class") or [])
            + " "
            + " ".join(image.parent.get("class") or [] if image.parent else [])
        )
        if any(token in classes for token in ("hero", "swiper slide", "gallery", "carousel")):
            score += 10
        if any(token in _normalized(url + " " + descriptor) for token in ("logo", "avatar", "icon")):
            score -= 80
        if score > 0:
            candidates.append((score, -order, url, method))

    if candidates:
        candidates.sort(reverse=True)
        top_score = candidates[0][0]
        top_urls = list(dict.fromkeys(row[2] for row in candidates if row[0] == top_score))
        # Une galerie explicitement liée au même titre utilise sa première image.
        if top_score >= 100:
            return EventImageSelection(top_urls[0], candidates[0][3], reason="Titre associé")
        if len(top_urls) == 1:
            return EventImageSelection(top_urls[0], candidates[0][3], reason="Bloc événement")
        return EventImageSelection(
            method="ambiguous",
            ambiguous=True,
            reason=f"{len(top_urls)} images de confiance équivalente",
        )

    og = soup.find("meta", attrs={"property": "og:image"})
    og_url = urljoin(page_url, og.get("content")) if og and og.get("content") else ""
    if og_url and og_url not in generic_urls:
        return EventImageSelection(og_url, "og_image", reason="OG non générique")
    return EventImageSelection(reason="Aucune image spécifique fiable")

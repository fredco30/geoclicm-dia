"""Client HTTP authentifié pour le service Crawl4AI isolé."""

from __future__ import annotations

import logging
import threading
import time

import requests

logger = logging.getLogger(__name__)
_TOKEN_TTL_SECONDS = 50 * 60
_TOKEN_CACHE: dict[tuple[str, str, str], tuple[str, float]] = {}
_TOKEN_LOCK = threading.Lock()


def _clear_token_cache() -> None:
    """Primitive réservée aux tests et au renouvellement forcé."""
    with _TOKEN_LOCK:
        _TOKEN_CACHE.clear()


def _access_token(
    base_url: str,
    api_token: str,
    email: str,
    *,
    force: bool = False,
) -> str:
    cache_key = (base_url, api_token, email)
    now = time.monotonic()
    with _TOKEN_LOCK:
        cached = _TOKEN_CACHE.get(cache_key)
        if not force and cached and now - cached[1] < _TOKEN_TTL_SECONDS:
            return cached[0]

        response = requests.post(
            base_url.rstrip("/") + "/token",
            json={"email": email, "api_token": api_token},
            timeout=20,
        )
        response.raise_for_status()
        token = response.json().get("access_token")
        if not isinstance(token, str) or not token.strip():
            raise ValueError("JWT Crawl4AI absent de la réponse /token.")
        _TOKEN_CACHE[cache_key] = (token, now)
        return token


def _headers(base_url: str, api_token: str, email: str, *, force: bool = False) -> dict:
    headers = {"Accept": "application/json", "Content-Type": "application/json"}
    if api_token:
        headers["Authorization"] = (
            f"Bearer {_access_token(base_url, api_token, email, force=force)}"
        )
    return headers


def fetch_rendered_html(
    url: str,
    *,
    base_url: str,
    api_token: str = "",
    email: str = "crawl4ai@gestia.ovh",
) -> str | None:
    """Retourne le HTML rendu, avec renouvellement unique du JWT sur 401."""
    endpoint = base_url.rstrip("/") + "/crawl"
    payloads = (
        {
            "urls": [url],
            "crawler_config": {
                "type": "CrawlerRunConfig",
                "params": {
                    "remove_overlay_elements": True,
                    "word_count_threshold": 5,
                    "exclude_external_links": True,
                },
            },
        },
        {"urls": [url]},
    )
    for payload in payloads:
        for attempt in range(2):
            try:
                response = requests.post(
                    endpoint,
                    json=payload,
                    headers=_headers(
                        base_url,
                        api_token,
                        email,
                        force=attempt == 1,
                    ),
                    timeout=90,
                )
                if response.status_code == 401 and api_token and attempt == 0:
                    continue
                response.raise_for_status()
                body = response.json()
                results = body.get("results") or body.get("data") or []
                if not results:
                    break
                result = results[0]
                if not result.get("success", True):
                    break
                status_code = result.get("status_code")
                if isinstance(status_code, int) and status_code >= 400:
                    break
                html = result.get("html") or result.get("cleaned_html") or result.get("fit_html")
                if isinstance(html, str) and html.strip():
                    return html
                break
            except (requests.RequestException, ValueError, TypeError):
                logger.warning("Crawl4AI impossible pour %s", url, exc_info=True)
                break
    return None

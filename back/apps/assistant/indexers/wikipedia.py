"""
Indexer Wikipedia — 1 article (résumé enrichi) par commune via API REST.

Source : https://fr.wikipedia.org/api/rest_v1/page/summary/<title>
Licence : CC-BY-SA, libre d'utilisation y compris commerciale.

L'API REST renvoie un résumé court mais riche (intro de l'article).
Suffisant pour donner du contexte historique/géographique aux réponses
de l'assistant. Pas besoin de scraper toute la page.

Pour aller plus loin (sections complètes), on pourrait utiliser l'API
classique (`?action=query&prop=extracts&explaintext=1`) — V2 si besoin.
"""
from __future__ import annotations

import logging

import requests

from apps.core.models import Commune

from ..models import KnowledgeChunk
from .base import ChunkInput, chunk_text, save_chunks

logger = logging.getLogger(__name__)


WIKIPEDIA_API = "https://fr.wikipedia.org/api/rest_v1/page/summary/{title}"
HTTP_TIMEOUT = 10


def _commune_to_wiki_title(commune: Commune) -> str:
    """Convertit un nom de commune en titre Wikipedia.

    Utilise le nom original de la commune avec underscores (convention
    Wikipedia). On gère les cas spéciaux comme « Le Grau-du-Roi » qui
    sur Wikipedia s'appelle simplement « Le Grau-du-Roi » (avec article).
    """
    return commune.name.replace(" ", "_")


def fetch_wikipedia_summary(title: str) -> dict | None:
    """Renvoie le payload résumé Wikipedia ou None si non trouvé."""
    url = WIKIPEDIA_API.format(title=title)
    try:
        response = requests.get(
            url,
            headers={
                "User-Agent": "geoclicmedia-assistant/1.0 (contact@geoclic.fr)",
                "Accept": "application/json",
            },
            timeout=HTTP_TIMEOUT,
        )
    except requests.RequestException as exc:
        logger.warning("Wikipedia fetch failed for %s: %s", title, exc)
        return None

    if response.status_code != 200:
        logger.info("Wikipedia HTTP %s for %s", response.status_code, title)
        return None

    return response.json()


def index_wikipedia_for_commune(commune: Commune) -> dict[str, int]:
    """Indexe le résumé Wikipedia de la commune."""
    title = _commune_to_wiki_title(commune)
    data = fetch_wikipedia_summary(title)

    if not data:
        return {"created": 0, "updated": 0, "unchanged": 0, "deactivated": 0, "embedded": 0}

    extract = data.get("extract") or ""
    if not extract.strip():
        logger.info("Wikipedia %s : extract vide", title)
        return {"created": 0, "updated": 0, "unchanged": 0, "deactivated": 0, "embedded": 0}

    page_url = (data.get("content_urls", {}) or {}).get("desktop", {}).get("page", "")

    text = f"Article Wikipedia : {commune.name}\n\n{extract}"
    chunks_text = chunk_text(text)

    chunk_inputs = [
        ChunkInput(
            source_kind=KnowledgeChunk.SourceKind.WIKIPEDIA,
            source_id=f"commune:{commune.slug}#{i}",
            source_url=page_url or f"https://fr.wikipedia.org/wiki/{title}",
            title=f"Wikipedia — {commune.name}" + (" (suite)" if i > 0 else ""),
            content=ct,
            commune=commune,
            is_premium=False,
        )
        for i, ct in enumerate(chunks_text)
    ]

    return save_chunks(
        chunk_inputs,
        source_kind=KnowledgeChunk.SourceKind.WIKIPEDIA,
        deactivate_others_for_source_prefix=f"commune:{commune.slug}#",
    )


def index_all_wikipedia() -> dict[str, int]:
    """Indexe Wikipedia pour les 7 communes du territoire."""
    totals = {"created": 0, "updated": 0, "unchanged": 0, "deactivated": 0, "embedded": 0}
    for commune in Commune.objects.filter(is_active=True):
        result = index_wikipedia_for_commune(commune)
        for k in totals:
            totals[k] += result.get(k, 0)
    return totals

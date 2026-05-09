"""
Indexer des articles éditoriaux.

Chunks générés : 1 chunk par section logique du body (séparé par titres
markdown ## ou par paragraphes longs). Chaque chunk inclut le titre +
chapeau pour conserver le contexte global.
"""
from __future__ import annotations

import logging

from apps.editorial.models import Article

from ..models import KnowledgeChunk
from .base import ChunkInput, chunk_text, save_chunks

logger = logging.getLogger(__name__)


def _build_article_text(article: Article) -> str:
    """Compose un texte indexable à partir de l'article."""
    parts: list[str] = []

    parts.append(f"Titre : {article.title}")
    parts.append(f"Catégorie : {article.category.name}")
    parts.append(f"Type : {article.get_article_type_display()}")
    if article.commune:
        parts.append(f"Commune : {article.commune.name}")
    if article.chapeau:
        parts.append(f"Chapeau : {article.chapeau}")

    if article.body:
        parts.append("\n--- Contenu ---\n")
        parts.append(article.body)

    return "\n".join(parts)


def index_article(article: Article) -> dict[str, int]:
    """Indexe (ou met à jour) un article dans le RAG.

    Les articles non publiés (status != published) ou archivés sont
    désactivés de l'index.
    """
    if article.status != Article.Status.PUBLISHED:
        n_deact = (
            KnowledgeChunk.objects
            .filter(
                source_kind=KnowledgeChunk.SourceKind.ARTICLE,
                source_id__startswith=f"{article.slug}#",
                is_active=True,
            )
            .update(is_active=False)
        )
        logger.info("Article %s status=%s — %d chunks désactivés",
                    article.slug, article.status, n_deact)
        return {
            "created": 0, "updated": 0, "unchanged": 0,
            "deactivated": n_deact, "embedded": 0,
        }

    text = _build_article_text(article)
    chunks_text = chunk_text(text)
    base_url = f"/articles/{article.slug}"

    chunk_inputs = [
        ChunkInput(
            source_kind=KnowledgeChunk.SourceKind.ARTICLE,
            source_id=f"{article.slug}#{i}",
            source_url=base_url,
            title=article.title if i == 0 else f"{article.title} (suite)",
            content=ct,
            commune=article.commune,
            is_premium=False,
        )
        for i, ct in enumerate(chunks_text)
    ]

    return save_chunks(
        chunk_inputs,
        source_kind=KnowledgeChunk.SourceKind.ARTICLE,
        deactivate_others_for_source_prefix=f"{article.slug}#",
    )


def index_all_articles() -> dict[str, int]:
    """Réindexe tous les articles publiés."""
    totals = {"created": 0, "updated": 0, "unchanged": 0, "deactivated": 0, "embedded": 0}
    qs = (
        Article.objects
        .filter(status=Article.Status.PUBLISHED)
        .select_related("category", "commune")
    )
    for article in qs:
        result = index_article(article)
        for k in totals:
            totals[k] += result.get(k, 0)
    return totals

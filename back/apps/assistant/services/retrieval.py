"""
Retrieval — recherche des chunks les plus pertinents pour une question.

Stratégie :
1. On embed la question avec Mistral (1024 dims).
2. On récupère les top_k chunks les plus proches en distance cosinus
   (pgvector CosineDistance).
3. Optionnel : filtre par commune.
4. Boost Premium : les chunks `is_premium=True` voient leur distance
   réduite de PREMIUM_BOOST avant le tri final, ce qui les fait remonter
   dans la liste. Mention transparente côté prompt.

Attention : un boost trop fort (> 0.15) écraserait la pertinence sémantique
et l'IA recommanderait des Premium hors-sujet. 0.05 garde la pertinence en
priorité, le Premium n'aide qu'à départager des résultats équivalents.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

from django.db.models import Q
from pgvector.django import CosineDistance

from apps.core.models import Commune

from ..models import KnowledgeChunk
from .mistral import embed_one

logger = logging.getLogger(__name__)

# Boost appliqué (soustrait de la distance) aux chunks Premium. La distance
# cosinus vaut entre 0 (identique) et 2 (opposé), donc 0.05 = ~2,5% du
# range. Suffisant pour départager des résultats proches sans biaiser.
PREMIUM_BOOST = 0.05

DEFAULT_TOP_K = 8


@dataclass
class RetrievedChunk:
    """Wrapper léger qui inclut la distance + le flag premium."""

    chunk: KnowledgeChunk
    distance: float
    boosted_distance: float


def retrieve_chunks(
    question: str,
    top_k: int = DEFAULT_TOP_K,
    commune_slug: Optional[str] = None,
) -> list[RetrievedChunk]:
    """
    Renvoie les top_k chunks les plus pertinents pour la question, triés
    par distance cosinus croissante (avec boost Premium appliqué).

    `commune_slug` filtre les chunks attachés à cette commune OU sans
    commune (info transversale du territoire). Utile quand le visiteur est
    sur une page commune et qu'on veut des réponses contextualisées.
    """
    if not question or not question.strip():
        return []

    try:
        query_embedding = embed_one(question)
    except Exception as exc:  # noqa: BLE001 — laisse l'appelant décider
        logger.error("Retrieval: embed question failed — %s", exc)
        raise

    qs = (
        KnowledgeChunk.objects.filter(is_active=True, embedding__isnull=False)
        .annotate(distance=CosineDistance("embedding", query_embedding))
    )

    if commune_slug:
        try:
            commune = Commune.objects.get(slug=commune_slug, is_active=True)
            # Filter : chunks de la commune OU chunks territorialement neutres.
            qs = qs.filter(Q(commune=commune) | Q(commune__isnull=True))
        except Commune.DoesNotExist:
            logger.warning("Retrieval: commune slug inconnu '%s'", commune_slug)

    # On récupère 2x top_k pour avoir une marge avant le boost (sinon on
    # pourrait perdre des bons résultats Premium loin dans le top initial).
    raw = list(
        qs.order_by("distance").only(
            "id", "source_kind", "source_id", "source_url", "title",
            "content", "is_premium", "commune_id",
        )[: top_k * 2]
    )

    # Application du boost Premium puis re-tri.
    enriched = [
        RetrievedChunk(
            chunk=c,
            distance=float(c.distance),
            boosted_distance=float(c.distance) - (PREMIUM_BOOST if c.is_premium else 0.0),
        )
        for c in raw
    ]
    enriched.sort(key=lambda r: r.boosted_distance)
    return enriched[:top_k]

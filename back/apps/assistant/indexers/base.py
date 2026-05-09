"""
Utilitaires partagés par tous les indexers.

- Chunking : découpe d'un texte long en fragments adaptés à l'embedding
  Mistral (~1500 caractères avec overlap 200 pour préserver le contexte
  aux frontières).
- Persistance : helper save_chunks qui upsert KnowledgeChunk en BDD,
  embed les nouveaux/modifiés en batch, et désactive les anciens chunks
  d'une source qui ne sont plus produits par l'indexation courante.
- Hashing : hash MD5 court pour générer des source_id stables à partir
  d'une URL ou d'un titre (utile pour les sources externes).
"""
from __future__ import annotations

import hashlib
import logging
from dataclasses import dataclass
from typing import Iterable, Optional

from apps.core.models import Commune

from ..models import KnowledgeChunk
from ..services.mistral import embed_batch

logger = logging.getLogger(__name__)


# Tailles de chunks calibrées pour Mistral embed (8K tokens max ≈ 32K
# caractères, mais on reste prudent pour la qualité sémantique : un
# chunk trop long perd en précision dans la recherche).
CHUNK_SIZE_CHARS = 1500
CHUNK_OVERLAP_CHARS = 200

# Batch size pour l'API embeddings Mistral. Au-delà, risque de timeout
# ou de payload trop volumineux.
EMBED_BATCH_SIZE = 32


@dataclass
class ChunkInput:
    """Représentation d'un chunk avant indexation, sans embedding."""

    source_kind: str
    source_id: str
    source_url: str
    title: str
    content: str
    commune: Optional[Commune] = None
    is_premium: bool = False


def chunk_text(
    text: str,
    chunk_size: int = CHUNK_SIZE_CHARS,
    overlap: int = CHUNK_OVERLAP_CHARS,
) -> list[str]:
    """
    Découpe un texte long en fragments avec overlap.

    Cherche à couper aux limites naturelles (paragraphe, phrase) avant
    de tomber sur un découpage brutal.
    """
    text = (text or "").strip()
    if not text:
        return []

    if len(text) <= chunk_size:
        return [text]

    chunks: list[str] = []
    start = 0
    n = len(text)

    while start < n:
        end = min(start + chunk_size, n)
        if end < n:
            # Cherche une coupure propre dans les 200 derniers chars
            look_back = max(end - 200, start + chunk_size // 2)
            slice_ = text[look_back:end]
            # Priorité : double newline, newline, point, espace
            for separator in ("\n\n", "\n", ". ", " "):
                idx = slice_.rfind(separator)
                if idx >= 0:
                    end = look_back + idx + len(separator)
                    break

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)

        if end >= n:
            break
        start = max(end - overlap, start + 1)

    return chunks


def build_source_id_from_url(url: str) -> str:
    """Hash court stable à partir d'une URL, utilisé pour source_id."""
    return hashlib.md5(url.encode()).hexdigest()[:24]


def save_chunks(
    chunks: Iterable[ChunkInput],
    *,
    source_kind: str,
    deactivate_others_for_source_prefix: Optional[str] = None,
) -> dict[str, int]:
    """
    Persiste une liste de chunks en BDD.

    Workflow :
    1. Pour chaque chunk : upsert sur (source_kind, source_id) — si le
       contenu n'a pas changé, on skippe l'embedding (économie Mistral).
    2. Embed en batch tous les chunks nouveaux ou modifiés.
    3. Si `deactivate_others_for_source_prefix` est fourni, on désactive
       les anciens chunks de cette source qui n'ont pas été touchés
       cette fois (= contenu supprimé côté source).

    Renvoie un dict {created, updated, unchanged, deactivated, embedded}.
    """
    chunks = list(chunks)
    if not chunks:
        # Cas particulier : si on a juste à désactiver tous les anciens
        # chunks d'une source vide aujourd'hui.
        if deactivate_others_for_source_prefix:
            n_deact = (
                KnowledgeChunk.objects
                .filter(
                    source_kind=source_kind,
                    source_id__startswith=deactivate_others_for_source_prefix,
                    is_active=True,
                )
                .update(is_active=False)
            )
            return {
                "created": 0, "updated": 0, "unchanged": 0,
                "deactivated": n_deact, "embedded": 0,
            }
        return {"created": 0, "updated": 0, "unchanged": 0, "deactivated": 0, "embedded": 0}

    created = 0
    updated = 0
    unchanged = 0
    to_embed: list[tuple[KnowledgeChunk, str]] = []
    seen_ids: set[str] = set()

    for ci in chunks:
        seen_ids.add(ci.source_id)
        existing = (
            KnowledgeChunk.objects
            .filter(source_kind=ci.source_kind, source_id=ci.source_id)
            .first()
        )
        if existing is None:
            obj = KnowledgeChunk.objects.create(
                source_kind=ci.source_kind,
                source_id=ci.source_id,
                source_url=ci.source_url,
                title=ci.title,
                content=ci.content,
                commune=ci.commune,
                is_premium=ci.is_premium,
                is_active=True,
                embedding=None,
            )
            created += 1
            to_embed.append((obj, ci.content))
        else:
            content_changed = existing.content != ci.content
            existing.source_url = ci.source_url
            existing.title = ci.title
            existing.commune = ci.commune
            existing.is_premium = ci.is_premium
            existing.is_active = True
            if content_changed:
                existing.content = ci.content
                existing.embedding = None
                existing.save()
                updated += 1
                to_embed.append((existing, ci.content))
            else:
                existing.save(update_fields=[
                    "source_url", "title", "commune", "is_premium", "is_active",
                ])
                unchanged += 1

    # Désactivation des chunks orphelins de cette source
    deactivated = 0
    if deactivate_others_for_source_prefix:
        deactivated = (
            KnowledgeChunk.objects
            .filter(
                source_kind=source_kind,
                source_id__startswith=deactivate_others_for_source_prefix,
                is_active=True,
            )
            .exclude(source_id__in=seen_ids)
            .update(is_active=False)
        )

    # Embedding en batch des chunks nouveaux/modifiés
    embedded = _embed_pending(to_embed)

    logger.info(
        "save_chunks[%s prefix=%s]: created=%d updated=%d unchanged=%d "
        "deactivated=%d embedded=%d",
        source_kind, deactivate_others_for_source_prefix,
        created, updated, unchanged, deactivated, embedded,
    )
    return {
        "created": created, "updated": updated, "unchanged": unchanged,
        "deactivated": deactivated, "embedded": embedded,
    }


def _embed_pending(items: list[tuple[KnowledgeChunk, str]]) -> int:
    """Embed en batch, sauve les vecteurs. Tolère les erreurs Mistral
    (les chunks restent avec embedding=NULL et seront retentés plus tard
    par la commande reindex_assistant)."""
    if not items:
        return 0
    embedded = 0
    for i in range(0, len(items), EMBED_BATCH_SIZE):
        batch = items[i:i + EMBED_BATCH_SIZE]
        texts = [content for _, content in batch]
        try:
            vectors = embed_batch(texts)
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "embed_batch failed (i=%d, size=%d): %s — chunks restent NULL",
                i, len(batch), exc,
            )
            continue
        for (obj, _), vec in zip(batch, vectors):
            obj.embedding = vec
            obj.save(update_fields=["embedding", "indexed_at"])
            embedded += 1
    return embedded

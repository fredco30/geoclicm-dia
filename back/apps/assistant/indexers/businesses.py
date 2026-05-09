"""
Indexer des fiches Business — version interne, pas de HTTP externe.

Une fiche produit 1 chunk « identité » (nom + description courte +
catégorie + adresse) et 0..N chunks complémentaires si la description
longue est volumineuse.
"""
from __future__ import annotations

import logging
from decimal import Decimal, InvalidOperation
from typing import Optional

from apps.directory.models import Business

from ..models import KnowledgeChunk
from .base import ChunkInput, chunk_text, save_chunks

logger = logging.getLogger(__name__)


def _build_business_text(business: Business) -> str:
    """
    Compose un texte structuré et complet à partir d'une fiche, prêt à
    être embeddé. Le LLM utilisera ce texte pour répondre, donc on inclut
    tout ce qui peut être pertinent : description, catégorie, adresse,
    spécialités, horaires (si simples), zones desservies.
    """
    parts: list[str] = []

    parts.append(f"Nom commercial : {business.name}")
    if business.legal_name:
        parts.append(f"Raison sociale : {business.legal_name}")

    parts.append(f"Catégorie : {business.category.name}")
    if business.secondary_categories.exists():
        secondary = ", ".join(c.name for c in business.secondary_categories.all())
        parts.append(f"Catégories secondaires : {secondary}")

    if business.short_description:
        parts.append(f"Description courte : {business.short_description}")
    if business.description:
        parts.append(f"Description : {business.description}")

    if business.specialties:
        specialties = ", ".join(business.specialties)
        parts.append(f"Spécialités : {specialties}")

    address_line = f"{business.address}"
    if business.address_complement:
        address_line += f", {business.address_complement}"
    address_line += f", {business.postal_code} {business.city}"
    parts.append(f"Adresse : {address_line}")
    parts.append(f"Commune : {business.commune.name}")

    service_areas = list(business.service_areas.all())
    if service_areas:
        areas = ", ".join(c.name for c in service_areas)
        parts.append(f"Zones desservies en plus : {areas}")

    contacts: list[str] = []
    if business.phone:
        contacts.append(f"téléphone {business.phone}")
    if business.mobile:
        contacts.append(f"mobile {business.mobile}")
    if business.email:
        contacts.append(f"email {business.email}")
    if business.website:
        contacts.append(f"site web {business.website}")
    if contacts:
        parts.append("Contact : " + ", ".join(contacts))

    socials: list[str] = []
    if business.facebook_url:
        socials.append(business.facebook_url)
    if business.instagram_url:
        socials.append(business.instagram_url)
    if business.tiktok_url:
        socials.append(business.tiktok_url)
    if socials:
        parts.append("Réseaux sociaux : " + " ; ".join(socials))

    if business.plan != "free":
        parts.append(f"Plan d'abonnement : {business.get_plan_display()}")

    return "\n".join(parts)


def _business_latlng(business: Business) -> tuple[Optional[Decimal], Optional[Decimal]]:
    """Extrait (lat, lng) en Decimal depuis le PointField (SRID 4326).

    PointField.x = longitude, PointField.y = latitude. Renvoie (None, None)
    si la fiche n'a pas de location géocodée.
    """
    point = getattr(business, "location", None)
    if point is None:
        return None, None
    try:
        return Decimal(str(point.y)), Decimal(str(point.x))
    except (InvalidOperation, TypeError, ValueError, AttributeError):
        return None, None


def index_business(business: Business) -> dict[str, int]:
    """Indexe (ou met à jour) une fiche Business dans le RAG.

    Si la fiche n'est pas publiée, on retire ses chunks de l'index
    (désactivation, pas suppression — on garde la trace).
    """
    if not business.is_published:
        n_deact = (
            KnowledgeChunk.objects
            .filter(
                source_kind=KnowledgeChunk.SourceKind.BUSINESS,
                source_id__startswith=f"{business.slug}#",
                is_active=True,
            )
            .update(is_active=False)
        )
        logger.info("Business %s non publié — %d chunks désactivés", business.slug, n_deact)
        return {
            "created": 0, "updated": 0, "unchanged": 0,
            "deactivated": n_deact, "embedded": 0,
        }

    text = _build_business_text(business)
    chunks_text = chunk_text(text)

    is_premium = business.plan in ("basic", "premium")
    base_url = f"/commerces/{business.slug}"
    lat, lng = _business_latlng(business)

    chunk_inputs = [
        ChunkInput(
            source_kind=KnowledgeChunk.SourceKind.BUSINESS,
            source_id=f"{business.slug}#{i}",
            source_url=base_url,
            title=business.name if i == 0 else f"{business.name} (suite)",
            content=ct,
            commune=business.commune,
            is_premium=is_premium,
            latitude=lat,
            longitude=lng,
        )
        for i, ct in enumerate(chunks_text)
    ]

    return save_chunks(
        chunk_inputs,
        source_kind=KnowledgeChunk.SourceKind.BUSINESS,
        deactivate_others_for_source_prefix=f"{business.slug}#",
    )


def index_all_businesses() -> dict[str, int]:
    """Réindexe toutes les fiches publiées. Lent, à lancer manuellement
    via la commande reindex_assistant."""
    totals = {"created": 0, "updated": 0, "unchanged": 0, "deactivated": 0, "embedded": 0}
    qs = (
        Business.objects
        .filter(is_published=True)
        .select_related("category", "commune")
        .prefetch_related("secondary_categories", "service_areas")
    )
    for business in qs:
        result = index_business(business)
        for k in totals:
            totals[k] += result.get(k, 0)
    return totals

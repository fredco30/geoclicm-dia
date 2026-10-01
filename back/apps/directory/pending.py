"""Relecture des modifications d'une fiche publiée par son annonceur.

Une fiche publiée modifiée par son propriétaire garde sa version en ligne :
les changements sont stockés dans ``Business.pending_changes`` (format
d'entrée de ``BusinessAdvertiserWriteSerializer``, les images dans
``pending_logo`` / ``pending_cover_image``), puis appliqués ou refusés par
l'équipe depuis le back-office.
"""
from __future__ import annotations

from django.db import models, transaction
from django.utils import timezone

from .models import Business

IMAGE_FIELDS = ("logo", "cover_image")


def _to_input(value):
    """Valeur validée -> valeur ré-injectable dans le serializer (JSON)."""
    if isinstance(value, models.Model):
        return value.pk
    if isinstance(value, (list, tuple)) or hasattr(value, "all"):
        items = value.all() if hasattr(value, "all") else value
        return [_to_input(item) for item in items]
    return value


def needs_review(business: Business, user) -> bool:
    """Seules les modifications d'un annonceur sur une fiche en ligne sont relues."""
    from apps.core.models import User

    return (
        business.is_published
        and not user.is_superuser
        and getattr(user, "role", None) == User.Role.ADVERTISER
    )


def submit_pending_changes(business: Business, validated_data: dict) -> Business:
    """Fusionne de nouvelles modifications avec celles déjà en attente."""
    pending = dict(business.pending_changes or {})
    update_fields = ["pending_changes", "pending_submitted_at"]
    for key, value in validated_data.items():
        if key in IMAGE_FIELDS:
            # Marqueur : True = nouvelle image en attente, None = suppression.
            setattr(business, f"pending_{key}", value or None)
            pending[key] = True if value else None
            update_fields.append(f"pending_{key}")
        else:
            pending[key] = _to_input(value)
    business.pending_changes = pending
    business.pending_submitted_at = timezone.now()
    business.save(update_fields=update_fields)
    return business


def _clear_pending(business: Business, *, delete_files: bool) -> None:
    for key in IMAGE_FIELDS:
        field = getattr(business, f"pending_{key}")
        if delete_files and field:
            field.delete(save=False)
        setattr(business, f"pending_{key}", None)
    business.pending_changes = None
    business.pending_submitted_at = None


@transaction.atomic
def apply_pending_changes(business: Business, request) -> Business:
    """Applique les modifications en attente (validation rejouée)."""
    from .serializers import BusinessAdvertiserWriteSerializer

    data = dict(business.pending_changes or {})
    images = {key: data.pop(key) for key in IMAGE_FIELDS if key in data}
    serializer = BusinessAdvertiserWriteSerializer(
        business, data=data, partial=True, context={"request": request}
    )
    serializer.is_valid(raise_exception=True)
    business = serializer.save()
    for key, marker in images.items():
        pending_file = getattr(business, f"pending_{key}")
        # On réutilise le fichier en attente (pas de copie) : il devient l'image publiée.
        setattr(business, key, pending_file.name if marker and pending_file else None)
    _clear_pending(business, delete_files=False)
    business.save()
    return business


def discard_pending_changes(business: Business) -> Business:
    _clear_pending(business, delete_files=True)
    business.save(
        update_fields=[
            "pending_changes", "pending_submitted_at", "pending_logo", "pending_cover_image",
        ]
    )
    return business

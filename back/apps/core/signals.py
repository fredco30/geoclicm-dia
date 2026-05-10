"""
Signals : pipeline image en 2 phases au upload (cap original + 3 variants).

Cf. apps/core/services/images.py pour les paliers (LOGO_MAX_SIZE,
COVER_MAX_SIZE, GALLERY_MAX_SIZE).
"""
from __future__ import annotations

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Commune, Media, User
from .services.images import (
    COVER_MAX_SIZE,
    GALLERY_MAX_SIZE,
    LOGO_MAX_SIZE,
    cap_original_image,
    generate_resized_versions,
)

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Media)
def media_post_save_resize(sender, instance: Media, created, **kwargs) -> None:
    """Cap (gallery 1920) + variants pour un Media uploadé."""
    if not instance.file:
        return
    try:
        cap_original_image(instance.file, GALLERY_MAX_SIZE)
        generate_resized_versions(instance.file)
    except Exception:
        logger.exception("Failed to process Media %s", instance.pk)


@receiver(post_save, sender=Commune)
def commune_post_save_resize(sender, instance: Commune, created, **kwargs) -> None:
    """Cap (cover 1600) + variants pour la cover_image d'une commune."""
    if not instance.cover_image:
        return
    try:
        cap_original_image(instance.cover_image, COVER_MAX_SIZE)
        generate_resized_versions(instance.cover_image)
    except Exception:
        logger.exception("Failed to process Commune cover %s", instance.pk)


@receiver(post_save, sender=User)
def user_post_save_resize_avatar(sender, instance: User, created, **kwargs) -> None:
    """Cap (logo 600) + variants pour l'avatar utilisateur."""
    if not instance.avatar:
        return
    try:
        cap_original_image(instance.avatar, LOGO_MAX_SIZE)
        generate_resized_versions(instance.avatar)
    except Exception:
        logger.exception("Failed to process User avatar %s", instance.pk)

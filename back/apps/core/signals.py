"""
Signals : redimensionnement d'images automatique après upload.
"""
from __future__ import annotations

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Commune, Media
from .services.images import generate_resized_versions

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Media)
def media_post_save_resize(sender, instance: Media, created, **kwargs) -> None:
    """Génère les versions redimensionnées d'un Media après save."""
    if not instance.file:
        return
    try:
        generate_resized_versions(instance.file)
    except Exception:
        logger.exception("Failed to resize Media %s", instance.pk)


@receiver(post_save, sender=Commune)
def commune_post_save_resize(sender, instance: Commune, created, **kwargs) -> None:
    """Génère les versions redimensionnées de la cover_image d'une commune."""
    if not instance.cover_image:
        return
    try:
        generate_resized_versions(instance.cover_image)
    except Exception:
        logger.exception("Failed to resize Commune cover %s", instance.pk)

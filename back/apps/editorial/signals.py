"""Signals editorial : redimensionnement cover_image article."""
from __future__ import annotations

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.core.services.images import generate_resized_versions

from .models import Article

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Article)
def article_post_save_resize(sender, instance: Article, created, **kwargs) -> None:
    """Génère les versions redimensionnées de la cover_image après save."""
    if not instance.cover_image:
        return
    try:
        generate_resized_versions(instance.cover_image)
    except Exception:
        logger.exception("Failed to resize Article cover %s", instance.pk)

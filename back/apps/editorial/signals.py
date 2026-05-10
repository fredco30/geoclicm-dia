"""Signals editorial : pipeline image cover_image article (cap 1600 + variants)."""
from __future__ import annotations

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.core.services.images import (
    COVER_MAX_SIZE,
    cap_original_image,
    generate_resized_versions,
)

from .models import Article

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Article)
def article_post_save_resize(sender, instance: Article, created, **kwargs) -> None:
    """Cap (cover 1600) + variants pour la cover_image d'un article."""
    if not instance.cover_image:
        return
    try:
        cap_original_image(instance.cover_image, COVER_MAX_SIZE)
        generate_resized_versions(instance.cover_image)
    except Exception:
        logger.exception("Failed to process Article cover %s", instance.pk)

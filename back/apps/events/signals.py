"""Traitement des images de couverture Agenda."""
from __future__ import annotations

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.core.services.images import (
    COVER_MAX_SIZE,
    cap_original_image,
    generate_resized_versions,
)

from .models import Event

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Event)
def event_post_save_resize(sender, instance: Event, **kwargs) -> None:
    if not instance.cover_image:
        return
    try:
        cap_original_image(instance.cover_image, COVER_MAX_SIZE)
        generate_resized_versions(instance.cover_image)
    except Exception:
        logger.exception("Failed to process Event cover %s", instance.pk)

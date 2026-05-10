"""
Signals directory : pipeline image pour Business.logo + Business.cover_image.

Paliers (cf. apps/core/services/images.py) :
- Business.logo        → LOGO_MAX_SIZE (600px) — affichage max ~150px en vignette
- Business.cover_image → COVER_MAX_SIZE (1600px) — bandeau de fiche desktop retina
"""
from __future__ import annotations

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.core.services.images import (
    COVER_MAX_SIZE,
    LOGO_MAX_SIZE,
    cap_original_image,
    generate_resized_versions,
)

from .models import Business

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Business)
def business_post_save_resize_images(
    sender, instance: Business, created, **kwargs
) -> None:
    """Cap + variants pour logo et cover_image du commerce."""
    if instance.logo:
        try:
            cap_original_image(instance.logo, LOGO_MAX_SIZE)
            generate_resized_versions(instance.logo)
        except Exception:
            logger.exception("Failed to process Business logo %s", instance.pk)

    if instance.cover_image:
        try:
            cap_original_image(instance.cover_image, COVER_MAX_SIZE)
            generate_resized_versions(instance.cover_image)
        except Exception:
            logger.exception("Failed to process Business cover %s", instance.pk)

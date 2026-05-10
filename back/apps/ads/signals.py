"""
Signals ads : pipeline image pour AdCampaign.image (bannière publicitaire).

Palier : COVER_MAX_SIZE (1600px) — bannière 16:9 affichée en pleine largeur
sur home/articles/annuaire, doit rester nette sur desktop retina.
"""
from __future__ import annotations

import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.core.services.images import (
    COVER_MAX_SIZE,
    cap_original_image,
    generate_resized_versions,
)

from .models import AdCampaign

logger = logging.getLogger(__name__)


@receiver(post_save, sender=AdCampaign)
def adcampaign_post_save_resize_image(
    sender, instance: AdCampaign, created, **kwargs
) -> None:
    """Cap (cover 1600) + variants pour la bannière de campagne pub."""
    if not instance.image:
        return
    try:
        cap_original_image(instance.image, COVER_MAX_SIZE)
        generate_resized_versions(instance.image)
    except Exception:
        logger.exception("Failed to process AdCampaign image %s", instance.pk)

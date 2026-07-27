import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.core.services.images import COVER_MAX_SIZE, cap_original_image, generate_resized_versions

from .models import Place

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Place)
def resize_place_cover(sender, instance: Place, **kwargs) -> None:
    if not instance.cover_image:
        return
    try:
        cap_original_image(instance.cover_image, COVER_MAX_SIZE)
        generate_resized_versions(instance.cover_image)
    except Exception:
        logger.exception("Failed to process Place cover %s", instance.pk)

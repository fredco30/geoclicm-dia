"""Signals editorial : pipeline image cover_image article (cap 1600 + variants)."""
from __future__ import annotations

import logging

from django.db.models.signals import post_migrate, post_save
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


SCHEDULED_TASK_NAME = "Articles — publication programmée (toutes les 5 min)"


@receiver(post_migrate)
def ensure_scheduled_publication_task(sender, **kwargs) -> None:
    """Crée (ou réactive) la tâche Celery Beat de publication programmée."""
    if getattr(sender, "name", None) != "apps.editorial":
        return
    try:
        from django_celery_beat.models import IntervalSchedule, PeriodicTask

        schedule, _ = IntervalSchedule.objects.get_or_create(
            every=5, period=IntervalSchedule.MINUTES
        )
        PeriodicTask.objects.update_or_create(
            name=SCHEDULED_TASK_NAME,
            defaults={
                "interval": schedule,
                "task": "editorial.publish_scheduled",
                "enabled": True,
            },
        )
    except Exception as exc:  # noqa: BLE001 — table absente au tout premier migrate
        logger.warning("Création de la tâche de publication programmée impossible : %s", exc)

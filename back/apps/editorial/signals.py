"""Signals editorial : pipeline image cover_image article (cap 1600 + variants)."""
from __future__ import annotations

import logging

from django.db import transaction
from django.db.models.signals import post_migrate, post_save, pre_save
from django.dispatch import receiver
from django.utils import timezone

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


@receiver(pre_save, sender=Article)
def remember_previous_status(sender, instance: Article, **kwargs) -> None:
    instance._previous_status = (
        Article.objects.filter(pk=instance.pk).values_list("status", flat=True).first()
        if instance.pk
        else None
    )


@receiver(post_save, sender=Article)
def share_on_facebook_when_published(sender, instance: Article, **kwargs) -> None:
    """Publie sur la page Facebook au passage en ligne (pas à chaque mise à jour).

    Couvre « Publier », « Publier maintenant » et la publication programmée.
    Sans configuration Facebook, ne fait rien.
    """
    from . import facebook

    if not facebook.is_enabled() or not instance.auto_publish_to_facebook:
        return
    if instance.status != Article.Status.PUBLISHED or instance.facebook_post_id:
        return
    if getattr(instance, "_previous_status", None) == Article.Status.PUBLISHED:
        return
    if instance.published_at and instance.published_at > timezone.now():
        return
    from .tasks import publish_to_facebook

    transaction.on_commit(lambda: publish_to_facebook.delay(instance.pk))

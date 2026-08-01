"""Traitement des images de couverture Agenda."""
from __future__ import annotations

import logging

from django.db.models.signals import post_migrate, post_save
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
    for image_field in (instance.cover_image, instance.source_cover_image):
        if not image_field:
            continue
        try:
            cap_original_image(image_field, COVER_MAX_SIZE)
            generate_resized_versions(image_field)
        except Exception:
            logger.exception("Failed to process Event image %s for %s", image_field.name, instance.pk)


@receiver(post_migrate)
def ensure_event_sync_schedule(sender, **kwargs) -> None:
    """Desactive la synchronisation automatique des sources Agenda.

    Regle produit (1er aout 2026) : aucune depense IA sans declenchement
    manuel. La tache ``events.sync_all_sources`` (toutes les 6 h) pouvait
    appeler l IA ; on la force a ``enabled=False`` a chaque migrate. Les
    extractions se lancent desormais a la main (passe IA multi ou sync par
    source)."""
    if getattr(sender, "name", None) != "apps.events":
        return
    try:
        from django_celery_beat.models import IntervalSchedule, PeriodicTask

        schedule, _ = IntervalSchedule.objects.get_or_create(
            every=6,
            period=IntervalSchedule.HOURS,
        )
        PeriodicTask.objects.update_or_create(
            name="Agenda — synchronisation des sources toutes les 6 h",
            defaults={
                "interval": schedule,
                "task": "events.sync_all_sources",
                "enabled": False,
            },
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning("Création de la tâche périodique Agenda impossible : %s", exc)

"""
Auto-création de la PeriodicTask Celery beat au prochain `migrate`.

Idempotent : si la tâche existe déjà, on ne fait rien. Sinon on crée un
IntervalSchedule de 15 min + une PeriodicTask qui appelle weather.prefetch_all.
"""
from __future__ import annotations

import logging

from django.db.models.signals import post_migrate
from django.dispatch import receiver

logger = logging.getLogger(__name__)

PERIODIC_TASK_NAME = "Weather — prefetch toutes les 15 min"
TASK_DOTTED = "weather.prefetch_all"


@receiver(post_migrate)
def ensure_weather_schedule(sender, **kwargs):
    if getattr(sender, "name", None) != "apps.weather":
        return

    try:
        from django_celery_beat.models import IntervalSchedule, PeriodicTask
    except Exception as exc:  # noqa: BLE001 — django_celery_beat absent ou pas migré
        logger.warning("django_celery_beat indisponible, skip schedule: %s", exc)
        return

    try:
        schedule, _ = IntervalSchedule.objects.get_or_create(
            every=15,
            period=IntervalSchedule.MINUTES,
        )
        PeriodicTask.objects.update_or_create(
            name=PERIODIC_TASK_NAME,
            defaults={
                "interval": schedule,
                "task": TASK_DOTTED,
                "enabled": True,
            },
        )
    except Exception as exc:  # noqa: BLE001 — table pas encore créée au 1er migrate
        logger.warning("Création PeriodicTask météo échouée: %s", exc)

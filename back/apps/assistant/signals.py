"""
Signaux Django — réindexation automatique au save.

Au post_save Business / Article :
- on déclenche la tâche Celery correspondante en async (.delay)
- comme ça la sauvegarde en BDD reste rapide (pas de blocage sur l'API
  Mistral d'embedding) et l'index est mis à jour en quelques secondes

Au post_migrate (sur cette app uniquement) :
- on crée les PeriodicTask Celery beat pour les indexations périodiques
- idempotent : ne crée pas de doublon si on relance migrate
"""
from __future__ import annotations

import logging

from django.db.models.signals import post_migrate, post_save
from django.dispatch import receiver

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Réindexation automatique au save
# ---------------------------------------------------------------------------

@receiver(post_save, sender="directory.Business")
def reindex_business_on_save(sender, instance, **kwargs):
    """Déclenche la réindexation async de la fiche modifiée."""
    from .tasks import index_business_async

    try:
        index_business_async.delay(instance.pk)
    except Exception as exc:  # noqa: BLE001
        # Si Celery est down, on ne plante pas le save. La réindexation
        # se fera au prochain `python manage.py reindex_assistant`.
        logger.warning("Could not enqueue index_business_async(%s): %s", instance.pk, exc)


@receiver(post_save, sender="editorial.Article")
def reindex_article_on_save(sender, instance, **kwargs):
    """Déclenche la réindexation async de l'article modifié."""
    from .tasks import index_article_async

    try:
        index_article_async.delay(instance.pk)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Could not enqueue index_article_async(%s): %s", instance.pk, exc)


# ---------------------------------------------------------------------------
# PeriodicTask Celery beat — créées au premier migrate
# ---------------------------------------------------------------------------

PERIODIC_TASKS = [
    # (name, task, every, period)
    ("Assistant — Wikipedia hebdo", "assistant.reindex_wikipedia", 7, "days"),
    ("Assistant — OSM hebdo", "assistant.reindex_osm", 7, "days"),
    ("Assistant — DataTourisme hebdo", "assistant.reindex_datatourisme", 7, "days"),
    ("Assistant — Crawl sources externes hebdo", "assistant.crawl_external_sources", 7, "days"),
    ("Assistant — Crawl sites commerçants mensuel", "assistant.crawl_business_websites", 30, "days"),
]


@receiver(post_migrate)
def ensure_periodic_tasks(sender, **kwargs):
    """Crée les PeriodicTask Celery beat si elles n'existent pas."""
    if getattr(sender, "name", None) != "apps.assistant":
        return

    try:
        from django_celery_beat.models import IntervalSchedule, PeriodicTask
    except Exception as exc:  # noqa: BLE001
        logger.warning("django_celery_beat indisponible, skip schedule: %s", exc)
        return

    period_map = {
        "minutes": IntervalSchedule.MINUTES,
        "hours": IntervalSchedule.HOURS,
        "days": IntervalSchedule.DAYS,
    }

    for name, task, every, period_name in PERIODIC_TASKS:
        try:
            schedule, _ = IntervalSchedule.objects.get_or_create(
                every=every,
                period=period_map[period_name],
            )
            PeriodicTask.objects.update_or_create(
                name=name,
                defaults={
                    "interval": schedule,
                    "task": task,
                    "enabled": True,
                },
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("Création PeriodicTask '%s' échouée: %s", name, exc)

"""
Tâche Celery beat — pré-charge le cache météo pour toutes les communes actives.

Programmée toutes les 15 minutes par le signal post_migrate de l'app
(voir signals.py). Effet net : la première visite après une expiration de
cache est instantanée, on n'attend pas Open-Meteo.
"""
from __future__ import annotations

import logging

from celery import shared_task

from apps.core.models import Commune

from .services import prefetch_commune

logger = logging.getLogger(__name__)


@shared_task(name="weather.prefetch_all")
def prefetch_all_weather() -> dict[str, int]:
    communes = Commune.objects.filter(is_active=True, location__isnull=False)
    success = 0
    failed = 0
    for commune in communes:
        result = prefetch_commune(commune)
        if result is not None:
            success += 1
        else:
            failed += 1
    logger.info("Weather prefetch — success=%d failed=%d", success, failed)
    return {"success": success, "failed": failed}

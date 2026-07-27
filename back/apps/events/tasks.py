"""Tâches Celery de collecte et synchronisation Agenda."""
from __future__ import annotations

from celery import shared_task

from .imports import sync_event_source
from .models import EventSource


@shared_task(name="events.sync_source_now", ignore_result=True)
def sync_event_source_now(source_id: int) -> dict[str, int | str]:
    source = EventSource.objects.get(pk=source_id)
    run = sync_event_source(source)
    return {
        "run_id": run.pk,
        "status": run.status,
        "discovered": run.discovered_count,
        "created": run.created_count,
        "updated": run.updated_count,
        "imported": run.imported_count,
        "errors": run.error_count,
    }


@shared_task(name="events.sync_all_sources", ignore_result=True)
def sync_all_event_sources() -> dict[str, int]:
    result = {"sources": 0, "success": 0, "partial": 0, "errors": 0}
    for source in EventSource.objects.filter(is_active=True):
        run = sync_event_source(source)
        result["sources"] += 1
        if run.status == run.Status.SUCCESS:
            result["success"] += 1
        elif run.status == run.Status.PARTIAL:
            result["partial"] += 1
        else:
            result["errors"] += 1
    return result

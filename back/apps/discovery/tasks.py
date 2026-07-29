"""Tâches Celery de la passe IA multi-catégories (Découvrir, marchés)."""
from __future__ import annotations

from celery import shared_task

from apps.assistant.models import CrawlSource

from .multi_sync import run_multi_extraction


@shared_task(name="discovery.multi_extract_source", ignore_result=True)
def multi_extract_source(crawl_source_id: int) -> dict:
    """Passe IA multi-catégories sur le corpus d'une source de crawl."""
    source = CrawlSource.objects.get(pk=crawl_source_id)
    return run_multi_extraction(source)


@shared_task(name="discovery.multi_extract_all", ignore_result=True)
def multi_extract_all() -> dict:
    """Passe multi-catégories sur toutes les sources de crawl actives."""
    result = {"sources": 0, "events": 0, "markets": 0, "places": 0, "errors": 0}
    for source in CrawlSource.objects.filter(is_active=True):
        try:
            summary = run_multi_extraction(source)
        except Exception:  # noqa: BLE001
            result["errors"] += 1
            continue
        result["sources"] += 1
        result["events"] += summary["events"]
        result["markets"] += summary["markets"]
        result["places"] += summary["places"]
        result["errors"] += summary["errors"]
    return result

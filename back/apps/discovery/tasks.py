"""Tâches Celery de la passe IA multi-catégories (Découvrir, marchés)."""
from __future__ import annotations

from celery import shared_task

from apps.assistant.models import CrawlSource

from .multi_sync import process_page_batch, run_multi_extraction, source_page_urls

# Taille d'un lot de pages analysées par tâche. Assez petit pour ne pas
# monopoliser un worker (concurrency=2) pendant des heures, assez grand pour
# limiter le nombre de tâches. ~24 s/page nominal => un lot de 15 ~ 6-12 min.
BATCH_SIZE = 15


def _page_batches(urls: list[str]) -> list[list[str]]:
    return [urls[i : i + BATCH_SIZE] for i in range(0, len(urls), BATCH_SIZE)]


@shared_task(name="discovery.multi_extract_source", ignore_result=True)
def multi_extract_source(crawl_source_id: int) -> dict:
    """Passe IA multi-catégories sur le corpus d'une source de crawl."""
    source = CrawlSource.objects.get(pk=crawl_source_id)
    return run_multi_extraction(source)


@shared_task(
    name="discovery.multi_extract_batch",
    ignore_result=True,
    bind=True,
    max_retries=3,
    retry_backoff=True,
)
def multi_extract_batch(self, crawl_source_id: int, page_urls: list[str]) -> dict:
    """Traite un lot de pages d'une source (IA + routage), avec reprise."""
    source = CrawlSource.objects.get(pk=crawl_source_id)
    try:
        return process_page_batch(source, page_urls)
    except Exception as exc:  # noqa: BLE001
        raise self.retry(exc=exc) from exc


@shared_task(name="discovery.multi_extract_source_chunked", ignore_result=True)
def multi_extract_source_chunked(crawl_source_id: int, short_first: bool = False) -> dict:
    """Découpe le corpus d'une source en lots et les met en file (passe complète
    en tâche de fond, entrelacée avec les autres traitements Celery)."""
    source = CrawlSource.objects.get(pk=crawl_source_id)
    urls = source_page_urls(source, short_first=short_first)
    batches = _page_batches(urls)
    for batch in batches:
        multi_extract_batch.delay(source.pk, batch)
    return {"source": source.label, "pages": len(urls), "batches": len(batches)}


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

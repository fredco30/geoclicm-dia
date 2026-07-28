"""
Tâches Celery de l'assistant — indexation asynchrone et batch.

Hooks via signals (post_save Business / Article) → réindexation en
quelques secondes après modification.

Tâches périodiques (Celery beat, configurées via post_migrate signal) :
- Wikipedia : 1x / semaine
- OSM      : 1x / semaine
- DataTourisme : 1x / semaine (no-op tant que clé absente)
- CrawlSource externes (mairies, OT) : 1x / semaine
- Sites commerçants : 1x / mois
"""
from __future__ import annotations

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(name="assistant.index_business_async", ignore_result=True)
def index_business_async(business_id: int) -> dict[str, int]:
    """Réindexe une fiche Business. Appelé par signal post_save."""
    from apps.directory.models import Business

    from .indexers.businesses import index_business

    try:
        business = Business.objects.select_related("category", "commune").get(pk=business_id)
    except Business.DoesNotExist:
        logger.info("index_business_async: Business %s introuvable (supprimé ?)", business_id)
        return {"created": 0, "updated": 0, "unchanged": 0, "deactivated": 0, "embedded": 0}

    return index_business(business)


@shared_task(name="assistant.index_article_async", ignore_result=True)
def index_article_async(article_id: int) -> dict[str, int]:
    """Réindexe un article. Appelé par signal post_save."""
    from apps.editorial.models import Article

    from .indexers.articles import index_article

    try:
        article = Article.objects.select_related("category", "commune").get(pk=article_id)
    except Article.DoesNotExist:
        logger.info("index_article_async: Article %s introuvable (supprimé ?)", article_id)
        return {"created": 0, "updated": 0, "unchanged": 0, "deactivated": 0, "embedded": 0}

    return index_article(article)


@shared_task(name="assistant.reindex_wikipedia", ignore_result=True)
def reindex_wikipedia() -> dict[str, int]:
    """Réindexe Wikipedia pour les 7 communes. Hebdo."""
    from .indexers.wikipedia import index_all_wikipedia

    return index_all_wikipedia()


@shared_task(name="assistant.reindex_osm", ignore_result=True)
def reindex_osm() -> dict[str, int]:
    """Réindexe les POI OSM pour les 7 communes. Hebdo."""
    from .indexers.osm import index_all_osm

    return index_all_osm()


@shared_task(name="assistant.reindex_datatourisme", ignore_result=True)
def reindex_datatourisme() -> dict[str, int]:
    """Réindexe DataTourisme. No-op tant que la clé n'est pas configurée."""
    from .indexers.datatourisme import index_all_datatourisme

    return index_all_datatourisme()


@shared_task(name="assistant.crawl_external_sources", ignore_result=True)
def crawl_external_sources() -> dict[str, int]:
    """Crawle toutes les CrawlSource actives (mairies, OT). Hebdo."""
    from django.core.cache import cache

    from .indexers.web_crawler import crawl_all_active_sources

    lock_key = "assistant:crawl-all:running"
    if not cache.add(lock_key, True, timeout=6 * 60 * 60):
        logger.warning("crawl_external_sources ignore : un crawl global est deja en cours")
        return {"skipped": 1}
    try:
        return crawl_all_active_sources()
    finally:
        cache.delete(lock_key)


@shared_task(name="assistant.crawl_source_now", ignore_result=True)
def crawl_external_source_now(source_id: int) -> dict[str, int]:
    """Crawl manuel d'UNE source précise. Déclenchée par bouton admin."""
    from .indexers.web_crawler import crawl_source
    from .models import CrawlSource

    try:
        source = CrawlSource.objects.get(pk=source_id)
    except CrawlSource.DoesNotExist:
        logger.warning("crawl_external_source_now: source %s introuvable", source_id)
        return {"created": 0, "updated": 0, "unchanged": 0, "deactivated": 0, "embedded": 0}

    return crawl_source(source, force=True)


@shared_task(name="assistant.crawl_business_websites", ignore_result=True)
def crawl_business_websites_task() -> dict[str, int]:
    """Crawle les sites web déclarés par les commerçants publiés. Mensuel."""
    from .indexers.web_crawler import crawl_business_websites

    return crawl_business_websites()


@shared_task(name="assistant.reindex_all", ignore_result=True)
def reindex_all_task() -> dict[str, dict[str, int]]:
    """Réindexation complète — appelée manuellement par la commande
    reindex_assistant. Lent (~plusieurs minutes selon le volume)."""
    from .indexers.articles import index_all_articles
    from .indexers.businesses import index_all_businesses
    from .indexers.osm import index_all_osm
    from .indexers.web_crawler import crawl_all_active_sources, crawl_business_websites
    from .indexers.wikipedia import index_all_wikipedia

    return {
        "businesses": index_all_businesses(),
        "articles": index_all_articles(),
        "wikipedia": index_all_wikipedia(),
        "osm": index_all_osm(),
        "external_sources": crawl_all_active_sources(force=True),
        "business_websites": crawl_business_websites(),
    }

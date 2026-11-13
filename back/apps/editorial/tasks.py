"""Tâches Celery du module éditorial."""
from __future__ import annotations

import logging

from celery import shared_task
from django.utils import timezone

from .models import Article

logger = logging.getLogger(__name__)


def publish_due_articles(now=None) -> list[str]:
    """Publie les articles programmés dont l'heure est passée.

    La date programmée devient la date de publication. Renvoie les adresses
    web publiées (pour les journaux et les tests).
    """
    now = now or timezone.now()
    published = []
    due = Article.objects.filter(
        status=Article.Status.SCHEDULED, published_at__lte=now
    ).order_by("published_at")
    for article in due:
        article.status = Article.Status.PUBLISHED
        # save() complet (et non update()) : signaux et date de mise à jour.
        article.save()
        published.append(article.slug)
    if published:
        logger.info("Articles programmés publiés : %s", ", ".join(published))
    return published


@shared_task(name="editorial.publish_scheduled")
def publish_scheduled() -> int:
    return len(publish_due_articles())

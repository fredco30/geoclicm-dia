"""Tâches Celery de la zone annonceur."""
from __future__ import annotations

import logging
from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from apps.directory.models import Business

logger = logging.getLogger(__name__)

# Délai laissé au webhook Stripe de renouvellement avant de rétrograder.
EXPIRY_GRACE = timedelta(days=3)


@shared_task(name="advertisers.expire_business_plans")
def expire_business_plans() -> int:
    """Repasse en « free » les fiches dont le plan payant est échu.

    Filet de sécurité si un webhook Stripe est perdu, et fin automatique
    des plans accordés à la main avec une date de fin. Les plans sans date
    de fin (plan_ends_at vide) ne sont jamais touchés.
    """
    cutoff = timezone.now() - EXPIRY_GRACE
    expired = Business.objects.exclude(plan="free").filter(
        plan_ends_at__isnull=False, plan_ends_at__lt=cutoff
    )
    count = expired.update(plan="free")
    if count:
        logger.info("%s fiche(s) repassée(s) en plan gratuit (plan échu)", count)
    return count

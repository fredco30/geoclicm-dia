"""Publication d'un article sur la page Facebook (API Graph de Meta).

Inactive tant que FACEBOOK_PAGE_ID et FACEBOOK_PAGE_ACCESS_TOKEN ne sont pas
renseignés dans le .env (docs/08 pour obtenir un jeton de page).

Garanties :
- un article n'est publié qu'une fois : l'emplacement facebook_post_id est
  « réservé » par une mise à jour conditionnelle avant l'appel à Meta, ce qui
  empêche deux tâches simultanées de publier deux fois ;
- seul un article publié, dont la date est passée, peut partir ;
- un échec libère la réservation : on peut relancer depuis le back-office.
"""
from __future__ import annotations

import logging

import requests
from django.conf import settings
from django.utils import timezone

from .models import Article

logger = logging.getLogger(__name__)

PENDING = "pending"
TIMEOUT_SECONDS = 20


class FacebookError(Exception):
    """Message lisible par la rédaction."""


def is_enabled() -> bool:
    return bool(settings.FACEBOOK_PAGE_ID and settings.FACEBOOK_PAGE_ACCESS_TOKEN)


def article_url(article: Article) -> str:
    return f"{settings.SITE_URL.rstrip('/')}/articles/{article.slug}"


def post_message(article: Article) -> str:
    return "\n\n".join(part for part in (article.title, article.chapeau) if part)


def _graph_url(path: str) -> str:
    version = settings.FACEBOOK_GRAPH_VERSION.strip("/")
    base = "https://graph.facebook.com"
    return f"{base}/{version}/{path}" if version else f"{base}/{path}"


def publish_article(article: Article) -> str:
    """Publie l'article sur la page et renvoie l'identifiant du post."""
    if not is_enabled():
        raise FacebookError("La publication Facebook n'est pas configurée.")
    if article.status != Article.Status.PUBLISHED or (
        article.published_at and article.published_at > timezone.now()
    ):
        raise FacebookError("Seul un article publié peut être partagé sur Facebook.")
    if article.facebook_post_id and article.facebook_post_id != PENDING:
        raise FacebookError("Cet article est déjà publié sur Facebook.")

    claimed = Article.objects.filter(pk=article.pk, facebook_post_id="").update(
        facebook_post_id=PENDING
    )
    if not claimed:
        raise FacebookError("Une publication Facebook est déjà en cours pour cet article.")

    try:
        response = requests.post(
            _graph_url(f"{settings.FACEBOOK_PAGE_ID}/feed"),
            data={
                "message": post_message(article),
                "link": article_url(article),
                "access_token": settings.FACEBOOK_PAGE_ACCESS_TOKEN,
            },
            timeout=TIMEOUT_SECONDS,
        )
        payload = response.json() if response.content else {}
        if not response.ok or not payload.get("id"):
            detail = (payload.get("error") or {}).get("message") or f"HTTP {response.status_code}"
            raise FacebookError(f"Facebook a refusé la publication : {detail}")
    except requests.RequestException as exc:
        Article.objects.filter(pk=article.pk, facebook_post_id=PENDING).update(facebook_post_id="")
        raise FacebookError("Facebook ne répond pas. Réessayez dans quelques minutes.") from exc
    except FacebookError:
        Article.objects.filter(pk=article.pk, facebook_post_id=PENDING).update(facebook_post_id="")
        raise

    now = timezone.now()
    Article.objects.filter(pk=article.pk).update(
        facebook_post_id=payload["id"], facebook_published_at=now
    )
    article.facebook_post_id = payload["id"]
    article.facebook_published_at = now
    logger.info("Article %s publié sur Facebook (%s)", article.slug, payload["id"])
    return payload["id"]

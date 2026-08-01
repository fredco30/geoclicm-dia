"""
Vue principale : POST /api/assistant/ask/

Workflow :
1. Validation rate limit (20 questions/h/IP par défaut)
2. Validation payload (question, session_id, language, commune_slug)
3. Embed question + retrieve top_k chunks
4. Build prompt système + contexte injecté + question
5. Appel Mistral chat completions
6. Sauvegarde conversation + messages + tokens
7. Retour JSON {answer, citations, session_id, language}
"""
from __future__ import annotations

import logging

from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AssistantConversation, AssistantMessage, CrawlSource
from .prompts import SYSTEM_PROMPT, build_user_message
from .rate_limit import check_rate_limit, get_client_ip
from .serializers import (
    AskRequestSerializer,
    AskResponseSerializer,
    CrawlSourceAdminSerializer,
)
from .services.mistral import MistralError, MistralNotConfigured, chat
from .services.retrieval import retrieve_chunks

logger = logging.getLogger(__name__)


class IsAdminOrEditor(permissions.BasePermission):
    """Editor ou admin peut gérer les sources à crawler."""

    def has_permission(self, request, view) -> bool:
        if not request.user.is_authenticated:
            return False
        return (
            request.user.is_superuser
            or request.user.role in {"editor", "admin"}
        )


class AssistantAskView(APIView):
    """POST /api/assistant/ask/ — pose une question à l'assistant."""

    permission_classes = (permissions.AllowAny,)

    def post(self, request):
        # 1. Rate limit
        ip = get_client_ip(request)
        allowed, remaining = check_rate_limit(ip)
        if not allowed:
            return Response(
                {
                    "detail": "Trop de questions ces dernières minutes. "
                              "Réessayez dans 1 heure.",
                    "code": "rate_limit",
                },
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )

        # 2. Validation
        serializer = AskRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        question: str = data["question"].strip()
        session_id: str = data["session_id"]
        language: str = data.get("language", "fr")
        commune_slug: str = (data.get("commune_slug") or "").strip()

        # 3. Retrieval
        try:
            retrieved = retrieve_chunks(
                question,
                top_k=8,
                commune_slug=commune_slug or None,
            )
        except MistralNotConfigured as exc:
            return Response(
                {"detail": str(exc), "code": "not_configured"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except MistralError as exc:
            logger.error("Mistral error during retrieval: %s", exc)
            return Response(
                {"detail": "Service IA temporairement indisponible.",
                 "code": "mistral_error"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception:
            logger.exception("Retrieval failed unexpectedly")
            return Response(
                {"detail": "Erreur interne lors de la recherche.",
                 "code": "internal"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # 4. Conversation : on enregistre la question
        conversation, _ = AssistantConversation.objects.get_or_create(
            session_id=session_id,
            defaults={"language": language},
        )
        if conversation.language != language:
            conversation.language = language

        AssistantMessage.objects.create(
            conversation=conversation,
            role=AssistantMessage.Role.USER,
            content=question,
        )

        # 5. Construction du prompt et appel Mistral
        user_message = build_user_message(question, retrieved)
        try:
            result = chat(
                system_prompt=SYSTEM_PROMPT,
                user_question=user_message,
            )
        except MistralNotConfigured as exc:
            return Response(
                {"detail": str(exc), "code": "not_configured"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except MistralError as exc:
            logger.error("Mistral chat error: %s", exc)
            return Response(
                {"detail": "L'assistant n'a pas pu répondre, réessayez.",
                 "code": "mistral_error"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception:
            logger.exception("Chat call failed unexpectedly")
            return Response(
                {"detail": "Erreur interne.",
                 "code": "internal"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # 6. Sauvegarde réponse + citations + tokens
        # Les coordonnées sont sérialisées en str (Decimal n'est pas JSON-
        # safe pour le JSONField citations stocké côté ORM).
        citations = [
            {
                "chunk_id": r.chunk.id,
                "title": r.chunk.title,
                "source_url": r.chunk.source_url,
                "source_kind": r.chunk.source_kind,
                "is_premium": r.chunk.is_premium,
                "latitude": str(r.chunk.latitude) if r.chunk.latitude is not None else None,
                "longitude": str(r.chunk.longitude) if r.chunk.longitude is not None else None,
            }
            for r in retrieved
        ]
        AssistantMessage.objects.create(
            conversation=conversation,
            role=AssistantMessage.Role.ASSISTANT,
            content=result["answer"],
            citations=citations,
            cost_tokens_in=result["tokens_in"],
            cost_tokens_out=result["tokens_out"],
        )
        conversation.message_count = conversation.messages.count()
        conversation.save(update_fields=["message_count", "language", "last_message_at"])

        # 7. Réponse
        response_payload = {
            "answer": result["answer"],
            "citations": citations,
            "session_id": session_id,
            "language": language,
        }
        response = Response(response_payload, status=status.HTTP_200_OK)
        response["X-RateLimit-Remaining"] = str(remaining)
        return response


# ============================================================================
# Admin CrawlSource — CRUD + bouton « Crawler maintenant »
# ============================================================================


class CrawlSourceAdminViewSet(viewsets.ModelViewSet):
    """
    /api/admin/crawl-sources/        — list / create
    /api/admin/crawl-sources/<id>/   — retrieve / update / delete
    /api/admin/crawl-sources/<id>/run/  — POST : déclenche un crawl async
    /api/admin/crawl-sources/<id>/run-multi/  -- POST : passe IA multi (payante, manuelle)
    /api/admin/crawl-sources/run-all/  — POST : actualise seulement les sources dues

    Réservé editor/admin/superuser. Les CrawlSource ne sont pas du contenu
    public, juste de la config.
    """

    queryset = (
        CrawlSource.objects.all()
        .select_related("commune")
        .order_by("-updated_at")
    )
    serializer_class = CrawlSourceAdminSerializer
    permission_classes = (IsAdminOrEditor,)
    pagination_class = None

    @action(detail=True, methods=["post"], url_path="run")
    def run(self, request, pk=None):
        """Déclenche un crawl manuel de la source. Asynchrone via Celery."""
        from .tasks import crawl_external_source_now

        source = self.get_object()
        if not source.is_active:
            return Response(
                {"detail": "Cette source est désactivée. Activez-la d'abord."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            crawl_external_source_now.delay(source.id)
        except Exception as exc:  # noqa: BLE001 — Celery down ou erreur de queue
            logger.warning(
                "crawl_external_source_now.delay(%s) failed: %s", source.id, exc,
            )
            return Response(
                {
                    "detail": (
                        "Le crawl n'a pas pu être lancé en async (Celery indisponible). "
                        "Réessayez ou utilisez la commande "
                        "`python manage.py reindex_assistant --source external_sources` "
                        "côté serveur."
                    ),
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            {"detail": "Crawl lancé en arrière-plan.", "source_id": source.id},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["post"], url_path="run-multi")
    def run_multi(self, request, pk=None):
        """Lance la passe IA multi-categories (payante) sur la source.

        Declenchement strictement manuel : aucune tache periodique n appelle ce
        endpoint, conformement a la regle "pas un centime sans action explicite".
        La passe est decoupee en lots Celery et n analyse que les segments dont
        le contenu a change (cache multi_extraction_cache).
        """
        source = self.get_object()
        if not source.is_active:
            return Response(
                {"detail": "Cette source est desactivee. Activez-la d abord."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            from apps.discovery.tasks import multi_extract_source_chunked

            multi_extract_source_chunked.delay(source.id)
        except Exception as exc:  # noqa: BLE001
            logger.warning(
                "multi_extract_source_chunked.delay(%s) failed: %s", source.id, exc,
            )
            return Response(
                {"detail": (
                    "La passe IA n a pas pu etre lancee en async "
                    "(Celery indisponible)."
                )},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            {
                "detail": (
                    "Passe IA multi lancee en arriere-plan : seuls les contenus "
                    "modifies sont analyses (cache)."
                ),
                "source_id": source.id,
            },
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=False, methods=["post"], url_path="run-all")
    def run_all(self, request):
        """Actualise uniquement les sources actives dont le corpus est du."""
        from django.core.cache import cache

        from .services.shared_crawl import source_is_fresh
        from .tasks import crawl_external_sources

        active_sources = list(CrawlSource.objects.filter(is_active=True))
        due_count = sum(not source_is_fresh(source) for source in active_sources)
        if not active_sources:
            return Response(
                {"detail": "Aucune source active à actualiser."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if due_count == 0:
            return Response(
                {
                    "detail": "Tous les corpus sont encore à jour : aucun recrawl lancé.",
                    "due_sources": 0,
                },
                status=status.HTTP_200_OK,
            )

        enqueue_lock = "assistant:crawl-all:enqueue"
        if not cache.add(enqueue_lock, True, timeout=60):
            return Response(
                {"detail": "Une actualisation globale vient déjà d'être lancée."},
                status=status.HTTP_409_CONFLICT,
            )
        try:
            crawl_external_sources.delay()
        except Exception as exc:  # noqa: BLE001
            cache.delete(enqueue_lock)
            logger.warning("crawl_external_sources.delay() failed: %s", exc)
            return Response(
                {
                    "detail": (
                        "L'actualisation n'a pas pu être lancée "
                        "(file Celery indisponible)."
                    )
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            {
                "detail": (
                    f"Actualisation de {due_count} source(s) due(s) lancée "
                    "en arrière-plan."
                ),
                "due_sources": due_count,
            },
            status=status.HTTP_202_ACCEPTED,
        )

"""
Endpoints DRF pour ai_assist.

Tous les endpoints sont :
- POST uniquement (générations = action, pas resource)
- protégés par IsAIAssistAllowed (authentifié)
- audités via le service `services.mistral.generate()` qui crée une
  ligne `AIGeneration` quel que soit le statut (succès, erreur, budget)
"""
from __future__ import annotations

import json
import logging
from decimal import Decimal

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.directory.models import Business, Category as BusinessCategory
from apps.core.models import Commune

from .permissions import IsAIAssistAllowed
from .prompts.business import build_describe_prompts
from .prompts.rewrite import build_rewrite_prompts
from .serializers import (
    BusinessDescribeRequestSerializer,
    BusinessDescribeResponseSerializer,
    TextRewriteRequestSerializer,
    TextRewriteResponseSerializer,
)
from .services.mistral import (
    BudgetExceeded,
    MistralError,
    MistralNotConfigured,
    generate,
)

logger = logging.getLogger(__name__)


# ============================================================================
# Business — génération de fiche assistée
# ============================================================================


class BusinessDescribeView(APIView):
    """
    POST /api/ai-assist/business/describe/

    Génère un brouillon de fiche commerçant (short_description,
    description, specialties, faq) depuis :
    - soit les données minimales (name + category + keywords) en mode
      pré-création (l'annonceur n'a pas encore de fiche),
    - soit l'ID d'une fiche existante (mode complétion).

    Output : 200 + JSON structuré, ou 400 (payload invalide), 429
    (budget atteint), 503 (Mistral indisponible).
    """

    permission_classes = (IsAIAssistAllowed,)

    def post(self, request):
        serializer = BusinessDescribeRequestSerializer(
            data=request.data, context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Construire le payload "business_data" pour le prompt
        business_data = self._build_business_data(data)

        # Construire les prompts ancrés dans la ligne éditoriale
        system_prompt, user_prompt = build_describe_prompts(
            business_data=business_data,
            tone=data.get("tone", "pro"),
        )

        # Appel Mistral en mode JSON output
        try:
            result = generate(
                user=request.user,
                endpoint="business.describe",
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                use_large=False,  # mistral-small suffit pour ce cas
                temperature=0.5,
                max_tokens=1500,
                response_format={"type": "json_object"},
            )
        except BudgetExceeded as exc:
            return Response(
                {"detail": str(exc), "code": "budget_exceeded"},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        except MistralNotConfigured as exc:
            return Response(
                {"detail": str(exc), "code": "not_configured"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except MistralError as exc:
            logger.error("BusinessDescribeView Mistral error: %s", exc)
            return Response(
                {
                    "detail": "L'assistance IA est temporairement indisponible. "
                              "Réessayez dans quelques minutes.",
                    "code": "mistral_error",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception:
            logger.exception("BusinessDescribeView unexpected error")
            return Response(
                {"detail": "Erreur interne.", "code": "internal"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Parsing JSON tolérant — Mistral peut occasionnellement
        # entourer le JSON de markdown malgré response_format
        parsed = _parse_json_lenient(result["answer"])
        if parsed is None:
            logger.warning(
                "BusinessDescribeView: JSON invalide de Mistral, generation_id=%s",
                result.get("generation_id"),
            )
            return Response(
                {
                    "detail": "Réponse IA mal formée, réessayez.",
                    "code": "bad_format",
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        # Normalisation + validation du payload
        normalized = _normalize_business_describe_output(parsed)

        response_payload = {
            **normalized,
            "model": result["model"],
            "cost_eur": result["cost_eur"],
            "generation_id": result["generation_id"],
        }
        out = BusinessDescribeResponseSerializer(response_payload)
        return Response(out.data, status=status.HTTP_200_OK)

    def _build_business_data(self, data: dict) -> dict:
        """Compose les données réelles à injecter dans le prompt depuis
        soit business_id (DB lookup), soit les champs manuels."""
        if data.get("business_id"):
            business = (
                Business.objects
                .select_related("category", "commune")
                .get(pk=data["business_id"])
            )
            return {
                "name": business.name,
                "category": business.category.name if business.category_id else "",
                "commune": business.commune.name if business.commune_id else "",
                "keywords": data.get("keywords") or [],
                "existing_short_description": business.short_description or "",
                "existing_description": business.description or "",
                "existing_specialties": list(business.specialties or []),
            }
        # Mode pré-création
        category = BusinessCategory.objects.get(pk=data["category_id"])
        commune_name = ""
        commune_id = data.get("commune_id")
        if commune_id:
            commune = Commune.objects.get(pk=commune_id)
            commune_name = commune.name
        return {
            "name": data["name"].strip(),
            "category": category.name,
            "commune": commune_name,
            "keywords": data.get("keywords") or [],
        }


# ============================================================================
# Text — réécriture pro d'un paragraphe
# ============================================================================


class TextRewriteView(APIView):
    """
    POST /api/ai-assist/text/rewrite/

    Réécrit un texte (paragraphe ou phrase) avec un ton choisi tout en
    préservant les faits. Renvoie une version principale + N
    alternatives courtes pour laisser à l'utilisateur le choix.

    Utilisé partout où un long champ texte doit être amélioré :
    descriptions de fiche, body d'article, headline pub.
    """

    permission_classes = (IsAIAssistAllowed,)

    def post(self, request):
        serializer = TextRewriteRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        system_prompt, user_prompt = build_rewrite_prompts(
            text=data["text"],
            tone=data.get("tone", "pro"),
            context=data.get("context", "general"),
            n_alternatives=2,
        )

        try:
            result = generate(
                user=request.user,
                endpoint="text.rewrite",
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                use_large=False,
                temperature=0.6,
                max_tokens=900,
                response_format={"type": "json_object"},
            )
        except BudgetExceeded as exc:
            return Response(
                {"detail": str(exc), "code": "budget_exceeded"},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        except MistralNotConfigured as exc:
            return Response(
                {"detail": str(exc), "code": "not_configured"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except MistralError as exc:
            logger.error("TextRewriteView Mistral error: %s", exc)
            return Response(
                {
                    "detail": "L'assistance IA est temporairement indisponible.",
                    "code": "mistral_error",
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except Exception:
            logger.exception("TextRewriteView unexpected error")
            return Response(
                {"detail": "Erreur interne.", "code": "internal"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        parsed = _parse_json_lenient(result["answer"])
        if parsed is None:
            return Response(
                {"detail": "Réponse IA mal formée, réessayez.",
                 "code": "bad_format"},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        rewritten = (parsed.get("rewritten") or "").strip()
        alternatives_raw = parsed.get("alternatives") or []
        alternatives = [
            s.strip()
            for s in alternatives_raw
            if isinstance(s, str) and s.strip()
        ][:4]

        # Si Mistral n'a pas mis "rewritten", on retombe sur la 1re
        # alternative ou sur le texte original.
        if not rewritten:
            rewritten = alternatives[0] if alternatives else data["text"]
            alternatives = alternatives[1:]

        out_payload = {
            "rewritten": rewritten,
            "alternatives": alternatives,
            "model": result["model"],
            "cost_eur": result["cost_eur"],
            "generation_id": result["generation_id"],
        }
        out = TextRewriteResponseSerializer(out_payload)
        return Response(out.data, status=status.HTTP_200_OK)


def _parse_json_lenient(raw: str) -> dict | None:
    """Parse Mistral JSON output, tolère un wrapping markdown éventuel.

    Mistral est censé respecter response_format=json_object et renvoyer
    du JSON pur, mais on a vu en pratique des cas où il ajoute ```json
    autour. On extrait l'objet JSON depuis la première { jusqu'à la
    dernière } pour gérer ces cas.
    """
    if not raw:
        return None
    # Tentative 1 : parse direct
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        pass
    # Tentative 2 : extraire entre la première { et la dernière }
    try:
        first = raw.index("{")
        last = raw.rindex("}")
        return json.loads(raw[first:last + 1])
    except (ValueError, json.JSONDecodeError):
        return None


def _normalize_business_describe_output(parsed: dict) -> dict:
    """
    Garantit les clés attendues même si Mistral en oublie une.
    Tronque les longueurs si Mistral dépasse les limites métier.
    """
    short = (parsed.get("short_description") or "").strip()
    description = (parsed.get("description") or "").strip()
    specialties = parsed.get("specialties") or []
    faq = parsed.get("faq") or []

    # Tronquer si Mistral dépasse les bornes
    if len(short) > 200:
        short = short[:200].rstrip()
    if len(description) > 1500:
        description = description[:1500].rstrip()

    # Filtrer les specialties non-string et tronquer chacune à 50 chars
    specialties_clean: list[str] = []
    for s in specialties:
        if isinstance(s, str):
            s = s.strip()
            if s:
                specialties_clean.append(s[:50])
    specialties_clean = specialties_clean[:8]

    # Filtrer les items FAQ malformés
    faq_clean: list[dict] = []
    for item in faq:
        if not isinstance(item, dict):
            continue
        q = (item.get("q") or "").strip()
        a = (item.get("a") or "").strip()
        if q and a:
            faq_clean.append({"q": q[:200], "a": a[:600]})
    faq_clean = faq_clean[:5]

    return {
        "short_description": short,
        "description": description,
        "specialties": specialties_clean,
        "faq": faq_clean,
    }

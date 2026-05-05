from __future__ import annotations

import logging

from django.shortcuts import get_object_or_404
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import Commune

from .services import get_or_fetch_weather

logger = logging.getLogger(__name__)


class WeatherView(APIView):
    """GET /api/weather/<commune-slug>/ → météo classique + marine si côtier."""

    permission_classes = [AllowAny]

    def get(self, request, commune_slug: str):
        commune = get_object_or_404(Commune, slug=commune_slug, is_active=True)

        if commune.location is None:
            return Response(
                {"detail": "Coordonnées indisponibles pour cette commune."},
                status=503,
            )

        try:
            payload, source = get_or_fetch_weather(commune)
        except Exception as exc:
            logger.exception("Weather fetch failed for %s", commune.slug)
            return Response(
                {"detail": "Service météo temporairement indisponible.", "error": str(exc)},
                status=503,
            )

        response = Response(payload)
        response["X-Cache"] = source
        if source == "cache":
            response["Cache-Control"] = "public, max-age=300"
        elif source == "stale":
            response["Cache-Control"] = "public, max-age=60"
        else:
            response["Cache-Control"] = "public, max-age=300"
        return response

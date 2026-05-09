"""
Vues Tile — séparation lecture publique / écriture admin.
"""
from __future__ import annotations

from django.db.models import Prefetch
from rest_framework import permissions, viewsets
from rest_framework.generics import ListAPIView

from apps.core.models import Commune

from .models import Tile
from .serializers import (
    TileAdminSerializer,
    TilePublicSerializer,
)


class IsAdminOrEditor(permissions.BasePermission):
    """Editor ou admin peuvent créer/modifier les tuiles. Lecture libre."""

    def has_permission(self, request, view) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user.is_authenticated:
            return False
        return (
            request.user.is_superuser
            or request.user.role in {"editor", "admin"}
        )


class TileAdminViewSet(viewsets.ModelViewSet):
    """
    /api/admin/tiles/        — list / create
    /api/admin/tiles/<id>/   — retrieve / update / delete
    """

    queryset = (
        Tile.objects.all()
        .select_related("parent")
        .prefetch_related("visible_on_communes")
        .order_by("parent_id", "sort_order", "label")
    )
    serializer_class = TileAdminSerializer
    permission_classes = (IsAdminOrEditor,)
    pagination_class = None  # liste courte typiquement (< 50 tuiles)


class TilePublicListView(ListAPIView):
    """
    /api/tiles/                       — toutes les tuiles racine actives
    /api/tiles/?on_home=true          — tuiles visibles sur la home globale
    /api/tiles/?commune=<slug>        — tuiles visibles sur une commune

    Renvoie uniquement les **tuiles racine** (parent=null) avec leurs
    sous-tuiles actives nestées via le serializer.
    """

    serializer_class = TilePublicSerializer
    permission_classes = (permissions.AllowAny,)
    pagination_class = None

    def get_queryset(self):
        # Sous-tuiles actives uniquement, triées
        active_children = Tile.objects.filter(is_active=True).order_by(
            "sort_order", "label",
        )

        qs = (
            Tile.objects.filter(is_active=True, parent__isnull=True)
            .prefetch_related(
                Prefetch("children", queryset=active_children),
                "visible_on_communes",
            )
            .order_by("sort_order", "label")
        )

        on_home = self.request.query_params.get("on_home")
        commune_slug = self.request.query_params.get("commune")

        if on_home == "true":
            # Tuiles racine destinées à la home : show_on_home=True
            # ET pas de filtre commune restrictif (visible_on_communes vide
            # = visible partout, donc OK pour la home).
            qs = qs.filter(show_on_home=True)

        if commune_slug:
            try:
                commune = Commune.objects.get(slug=commune_slug, is_active=True)
            except Commune.DoesNotExist:
                return qs.none()
            # Tuiles visibles sur cette commune : visible_on_communes vide
            # OU contient la commune.
            from django.db.models import Count, Q
            qs = qs.annotate(
                _has_commune_filter=Count("visible_on_communes"),
            ).filter(
                Q(_has_commune_filter=0)
                | Q(visible_on_communes=commune),
            ).distinct()

        return qs

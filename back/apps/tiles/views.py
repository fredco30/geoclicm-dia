"""
Vues Tile — séparation lecture publique / écriture admin.
"""
from __future__ import annotations

from django.db import transaction
from django.db.models import Prefetch
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response

from apps.core.models import Commune

from .models import Tile
from .serializers import (
    TileAdminSerializer,
    TilePublicSerializer,
)


def _active_children_qs():
    """Sous-queryset des tuiles enfants actives, triées."""
    return Tile.objects.filter(is_active=True).order_by("sort_order", "label")


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
    /api/admin/tiles/                — list / create
    /api/admin/tiles/<id>/           — retrieve / update / delete
    /api/admin/tiles/reorder/        — POST : update bulk sort_order
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

    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request):
        """
        POST {"tiles": [{"id": 1, "sort_order": 0}, {"id": 2, "sort_order": 1}, ...]}

        Met à jour `sort_order` en bulk pour un set de tuiles. Utilisé par
        la liste admin draggable : à chaque drop, le client envoie l'ordre
        complet de la liste visible.

        Validation :
        - Le payload doit être une liste d'objets {id, sort_order}.
        - Tous les IDs doivent exister (sinon 400).
        - Pas de check de cohérence parent-enfant (un drag ne change pas
          le parent, juste l'ordre au sein du même niveau).
        """
        items = request.data.get("tiles")
        if not isinstance(items, list) or not items:
            return Response(
                {"detail": "Payload attendu : { tiles: [{id, sort_order}, ...] }"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Construire un dict {id: sort_order} et valider le format
        try:
            new_orders = {int(item["id"]): int(item["sort_order"]) for item in items}
        except (KeyError, TypeError, ValueError):
            return Response(
                {"detail": "Chaque entrée doit avoir des champs id et sort_order entiers."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        ids = list(new_orders.keys())
        tiles = list(Tile.objects.filter(id__in=ids))
        if len(tiles) != len(ids):
            missing = set(ids) - {t.id for t in tiles}
            return Response(
                {"detail": f"Tuiles introuvables : {sorted(missing)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        for tile in tiles:
            tile.sort_order = new_orders[tile.id]

        with transaction.atomic():
            Tile.objects.bulk_update(tiles, ["sort_order"])

        return Response(
            {"updated": len(tiles)},
            status=status.HTTP_200_OK,
        )


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
        qs = (
            Tile.objects.filter(is_active=True, parent__isnull=True)
            .prefetch_related(
                Prefetch("children", queryset=_active_children_qs()),
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


class TilePublicDetailView(RetrieveAPIView):
    """
    GET /api/tiles/<id>/ — récupère une tuile racine active avec ses
    sous-tuiles imbriquées.

    Utilisée par la page /tiles/[id] côté front pour afficher la grille
    des sous-tuiles quand le visiteur clique sur une tuile racine qui a
    des enfants. 404 si la tuile n'existe pas, n'est pas active, ou n'est
    pas une racine (les sous-tuiles ne sont pas accessibles directement
    par cette vue — elles s'affichent uniquement à travers leur parent).
    """

    serializer_class = TilePublicSerializer
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        return (
            Tile.objects.filter(is_active=True, parent__isnull=True)
            .prefetch_related(
                Prefetch("children", queryset=_active_children_qs()),
                "visible_on_communes",
            )
        )

"""
Vues UsefulContact :

- /api/utility/contacts/?kind=useful_number (ou procedure) — lecture
  publique pour les pages /numeros-utiles et /demarches.
- /api/admin/utility/contacts/ — CRUD complet, réservé editor/admin.
"""
from __future__ import annotations

from rest_framework import permissions, viewsets
from rest_framework.generics import ListAPIView

from .models import UsefulContact
from .serializers import (
    UsefulContactAdminSerializer,
    UsefulContactPublicSerializer,
)


class IsAdminOrEditor(permissions.BasePermission):
    """Editor ou admin peut gérer les entrées Pratique."""

    def has_permission(self, request, view) -> bool:
        if not request.user.is_authenticated:
            return False
        return (
            request.user.is_superuser
            or request.user.role in {"editor", "admin"}
        )


class UsefulContactPublicListView(ListAPIView):
    """
    GET /api/utility/contacts/?kind=useful_number
    GET /api/utility/contacts/?kind=procedure&commune=<slug>

    Filtre optionnel par commune. Les entrées sans commune (NULL) sont
    toujours incluses (= valables pour tout le territoire).
    """

    serializer_class = UsefulContactPublicSerializer
    permission_classes = (permissions.AllowAny,)
    pagination_class = None

    def get_queryset(self):
        qs = (
            UsefulContact.objects
            .filter(is_active=True)
            .select_related("commune")
            .order_by("category_label", "sort_order", "label")
        )

        kind = self.request.query_params.get("kind")
        if kind in {
            UsefulContact.Kind.USEFUL_NUMBER,
            UsefulContact.Kind.PROCEDURE,
        }:
            qs = qs.filter(kind=kind)

        commune_slug = self.request.query_params.get("commune")
        if commune_slug:
            from django.db.models import Q
            qs = qs.filter(
                Q(commune__isnull=True) | Q(commune__slug=commune_slug),
            )

        return qs


class UsefulContactAdminViewSet(viewsets.ModelViewSet):
    """
    /api/admin/utility/contacts/        — list / create
    /api/admin/utility/contacts/<id>/   — retrieve / update / delete

    Réservé editor/admin. Pas de pagination — la liste reste courte
    (typiquement < 100 entrées en V1).
    """

    queryset = (
        UsefulContact.objects.all()
        .select_related("commune")
        .order_by("kind", "category_label", "sort_order", "label")
    )
    serializer_class = UsefulContactAdminSerializer
    permission_classes = (IsAdminOrEditor,)
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        kind = self.request.query_params.get("kind")
        if kind in {
            UsefulContact.Kind.USEFUL_NUMBER,
            UsefulContact.Kind.PROCEDURE,
        }:
            qs = qs.filter(kind=kind)
        return qs

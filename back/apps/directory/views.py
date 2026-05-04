"""
ViewSets DRF pour l'API directory.

- Lecture publique sur Business publiés uniquement (is_published=True).
- Le back-office (editor/admin) voit tous les états + tous les champs Stripe/owner.
- BusinessCategory : read public, write admin.
"""
from __future__ import annotations

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets

from apps.editorial.permissions import IsEditorOrAdmin

from .filters import BusinessFilter
from .models import Business, BusinessCategory
from .serializers import (
    BusinessCategorySerializer,
    BusinessDetailSerializer,
    BusinessListSerializer,
    BusinessWriteSerializer,
)


class BusinessCategoryViewSet(viewsets.ModelViewSet):
    """
    /api/business-categories/         — list (publique)
    /api/business-categories/<slug>/  — detail
    POST/PATCH/DELETE                 — réservés editor/admin
    """

    queryset = BusinessCategory.objects.select_related("parent").all()
    serializer_class = BusinessCategorySerializer
    lookup_field = "slug"
    permission_classes = (IsEditorOrAdmin,)
    pagination_class = None  # liste courte (~50 items), on retourne tout
    filter_backends = (DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter)
    filterset_fields = ("parent", "is_active", "schema_type")
    search_fields = ("name", "description")
    ordering_fields = ("sort_order", "name")
    ordering = ("sort_order", "name")


class BusinessViewSet(viewsets.ModelViewSet):
    """
    /api/businesses/         — list (publics seulement pour anon)
    /api/businesses/<slug>/  — detail
    POST/PATCH/DELETE        — réservés editor/admin
    """

    lookup_field = "slug"
    permission_classes = (IsEditorOrAdmin,)
    filterset_class = BusinessFilter
    filter_backends = (DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter)
    search_fields = ("name", "legal_name", "short_description", "description", "siret")
    ordering_fields = ("name", "created_at", "updated_at", "view_count")
    ordering = ("name",)

    def get_queryset(self):
        qs = (
            Business.objects.select_related("category", "commune", "owner")
            .prefetch_related("secondary_categories", "photos")
        )
        user = self.request.user
        if not user.is_authenticated or not getattr(user, "can_publish", False):
            qs = qs.filter(is_published=True)
        return qs

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return BusinessWriteSerializer
        if self.action == "list":
            return BusinessListSerializer
        return BusinessDetailSerializer

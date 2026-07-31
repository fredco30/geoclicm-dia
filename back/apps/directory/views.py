"""
ViewSets DRF pour l'API directory.

- Lecture publique sur Business publiés uniquement (is_published=True).
- Le back-office (editor/admin) voit tous les états + tous les champs Stripe/owner.
- L'espace annonceur (advertiser) voit/édite ses propres Business uniquement.
- BusinessCategory : read public, write admin.
"""
from __future__ import annotations

from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.models import User
from apps.editorial.permissions import IsEditorOrAdmin

from .filters import BusinessFilter
from .models import Business, BusinessCategory, BusinessImportCandidate
from .permissions import IsAdvertiserOrTeam, IsBusinessOwnerOrTeam
from .serializers import (
    BusinessAdvertiserWriteSerializer,
    BusinessCategorySerializer,
    BusinessDetailSerializer,
    BusinessImportCandidateSerializer,
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


class BusinessImportCandidateAdminViewSet(viewsets.ModelViewSet):
    """Boîte « À valider » Commerçants : validation humaine des fiches détectées."""

    queryset = BusinessImportCandidate.objects.all().select_related(
        "crawl_source", "commune", "category", "matched_business"
    )
    serializer_class = BusinessImportCandidateSerializer
    permission_classes = (permissions.IsAuthenticated, IsEditorOrAdmin)
    pagination_class = None
    http_method_names = ("get", "patch", "post", "head", "options")

    def get_queryset(self):
        qs = super().get_queryset()
        if source_id := self.request.query_params.get("source"):
            qs = qs.filter(crawl_source_id=source_id)
        if candidate_status := self.request.query_params.get("status"):
            qs = qs.filter(status=candidate_status)
        else:
            qs = qs.filter(
                status__in=(
                    BusinessImportCandidate.Status.PENDING,
                    BusinessImportCandidate.Status.INVALID,
                )
            )
        if self.action == "list" and "limit" in self.request.query_params:
            try:
                limit = min(max(int(self.request.query_params["limit"]), 1), 100)
                offset = max(int(self.request.query_params.get("offset", 0)), 0)
            except (TypeError, ValueError):
                limit, offset = 50, 0
            qs = qs[offset : offset + limit]
        return qs

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        from apps.discovery.multi_sync import import_business_candidate

        candidate = self.get_object()
        serializer = self.get_serializer(
            candidate, data=request.data or {}, partial=True
        )
        serializer.is_valid(raise_exception=True)
        candidate = serializer.save()
        missing = []
        if candidate.category_id is None:
            missing.append("catégorie")
        if candidate.commune_id is None:
            missing.append("commune")
        if missing:
            return Response(
                {"detail": "Champs requis : " + ", ".join(missing)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            business = import_business_candidate(
                candidate, user=request.user, publish=True
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            BusinessDetailSerializer(business, context={"request": request}).data
        )

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        candidate = self.get_object()
        candidate.status = BusinessImportCandidate.Status.REJECTED
        candidate.save(update_fields=["status", "last_seen_at"])
        return Response(self.get_serializer(candidate).data)


class AdvertiserBusinessViewSet(viewsets.ModelViewSet):
    """
    /api/advertiser/businesses/         — list (limité aux fiches du user)
    /api/advertiser/businesses/<slug>/  — detail
    POST/PATCH/DELETE                   — gestion par l'annonceur de SES fiches

    Différences vs BusinessViewSet (admin) :
    - Filtre auto sur owner = user courant (advertiser)
    - À la création : owner = user, is_claimed = True, is_published = False
      (validation manuelle par l'équipe avant publication)
    - WriteSerializer restreint : pas de champs workflow / commerciaux
    """

    lookup_field = "slug"
    permission_classes = (IsAdvertiserOrTeam, IsBusinessOwnerOrTeam)

    def get_queryset(self):
        qs = (
            Business.objects.select_related("category", "commune", "owner")
            .prefetch_related("secondary_categories", "service_areas")
        )
        user = self.request.user
        # Editor / admin / superuser : voit tout (peut éditer pour le compte
        # d'un commerçant)
        if user.is_superuser or user.role in {User.Role.EDITOR, User.Role.ADMIN}:
            return qs
        # Advertiser : uniquement ses fiches
        return qs.filter(owner=user)

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return BusinessAdvertiserWriteSerializer
        if self.action == "list":
            return BusinessListSerializer
        return BusinessDetailSerializer

    def perform_create(self, serializer):
        # Force owner = user courant (sauf si admin crée pour qqn d'autre,
        # auquel cas il devrait passer par /api/businesses/ admin)
        user = self.request.user
        if user.role == User.Role.ADVERTISER:
            serializer.save(
                owner=user,
                is_claimed=True,
                is_published=False,  # validation par l'équipe
            )
        else:
            serializer.save()

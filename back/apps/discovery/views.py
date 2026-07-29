from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.editorial.permissions import IsEditorOrAdmin

from .models import Place, PlaceCategory, PlaceImportCandidate
from .multi_sync import import_place_candidate
from .serializers import (
    PlaceCategorySerializer,
    PlaceDetailSerializer,
    PlaceImportCandidateSerializer,
    PlaceListSerializer,
    PlaceWriteSerializer,
)


def base_queryset():
    return Place.objects.select_related("category", "commune", "created_by").prefetch_related("related_articles", "related_businesses", "related_events")


class PlacePublicViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = PlaceListSerializer
    lookup_field = "slug"
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        qs = base_queryset().filter(status=Place.Status.PUBLISHED)
        params = self.request.query_params
        if params.get("category"):
            qs = qs.filter(category__slug=params["category"])
        if params.get("commune"):
            qs = qs.filter(commune__slug=params["commune"])
        if params.get("featured") in ("true", "1"):
            qs = qs.filter(is_featured=True)
        return qs

    def get_serializer_class(self):
        return PlaceListSerializer if self.action == "list" else PlaceDetailSerializer


class PlaceCategoryPublicViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = PlaceCategory.objects.filter(is_active=True)
    serializer_class = PlaceCategorySerializer
    lookup_field = "slug"
    permission_classes = (permissions.AllowAny,)
    pagination_class = None


class PlaceAdminViewSet(viewsets.ModelViewSet):
    queryset = base_queryset()
    lookup_field = "slug"
    permission_classes = (permissions.IsAuthenticated, IsEditorOrAdmin)
    pagination_class = None

    def get_serializer_class(self):
        return PlaceWriteSerializer if self.action in ("create", "update", "partial_update") else PlaceDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class PlaceCategoryAdminViewSet(viewsets.ModelViewSet):
    queryset = PlaceCategory.objects.all()
    serializer_class = PlaceCategorySerializer
    lookup_field = "slug"
    permission_classes = (permissions.IsAuthenticated, IsEditorOrAdmin)
    pagination_class = None


class PlaceImportCandidateAdminViewSet(viewsets.ModelViewSet):
    """Boîte « À valider » Découvrir : validation humaine des lieux détectés."""

    queryset = PlaceImportCandidate.objects.all().select_related(
        "crawl_source", "commune", "category", "matched_place"
    )
    serializer_class = PlaceImportCandidateSerializer
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
                    PlaceImportCandidate.Status.PENDING,
                    PlaceImportCandidate.Status.INVALID,
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
            place = import_place_candidate(candidate, user=request.user, publish=True)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            PlaceDetailSerializer(place, context={"request": request}).data
        )

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        candidate = self.get_object()
        candidate.status = PlaceImportCandidate.Status.REJECTED
        candidate.save(update_fields=["status", "last_seen_at"])
        return Response(self.get_serializer(candidate).data)

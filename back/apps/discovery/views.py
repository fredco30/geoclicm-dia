from rest_framework import mixins, permissions, viewsets

from apps.editorial.permissions import IsEditorOrAdmin

from .models import Place, PlaceCategory
from .serializers import PlaceCategorySerializer, PlaceDetailSerializer, PlaceListSerializer, PlaceWriteSerializer


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

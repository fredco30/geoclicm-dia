"""
ViewSets DRF pour l'API editorial.

- Lecture publique sur articles publiés uniquement.
- Le back-office voit tous les statuts (drafts inclus) si auth + role editor/admin.
"""
from __future__ import annotations

from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
from django.db.models import F, Q
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import filters, mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.models import Commune

from .filters import ArticleFilter
from .models import Article, Category, Tag
from .permissions import IsAuthorOrReadOnly, IsEditorOrAdmin
from .serializers import (
    ArticleDetailSerializer,
    ArticleListSerializer,
    ArticleWriteSerializer,
    CategorySerializer,
    CommuneSerializer,
    TagSerializer,
)


CACHE_LIST_SECONDS = 60


class ArticleViewSet(viewsets.ModelViewSet):
    """
    /api/articles/         — list (publics seulement pour anon)
    /api/articles/<slug>/  — detail
    POST/PATCH/DELETE      — réservés editor/admin
    """

    lookup_field = "slug"
    permission_classes = (IsEditorOrAdmin, IsAuthorOrReadOnly)
    filterset_class = ArticleFilter
    filter_backends = (
        filters.OrderingFilter,
    )  # django-filter ajouté via DEFAULT_FILTER_BACKENDS, OrderingFilter explicite ici
    ordering_fields = ("published_at", "created_at", "view_count")
    ordering = ("-published_at",)

    def get_queryset(self):
        qs = (
            Article.objects.select_related("category", "commune", "author")
            .prefetch_related("tags", "gallery")
        )
        # Lecture anonyme : seulement publiés et avec date passée
        user = self.request.user
        if not user.is_authenticated or not getattr(user, "can_publish", False):
            qs = qs.filter(
                status=Article.Status.PUBLISHED,
                published_at__lte=timezone.now(),
            )
        return qs

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return ArticleWriteSerializer
        if self.action == "list":
            return ArticleListSerializer
        return ArticleDetailSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Incrément view_count atomique (anon only)
        if not request.user.is_authenticated:
            Article.objects.filter(pk=instance.pk).update(view_count=F("view_count") + 1)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class CategoryViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    lookup_field = "slug"
    permission_classes = (AllowAny,)
    pagination_class = None  # liste courte, on retourne tout


class TagViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Tag.objects.all()
    serializer_class = TagSerializer
    lookup_field = "slug"
    permission_classes = (AllowAny,)
    pagination_class = None


class CommuneViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Commune.objects.filter(is_active=True)
    serializer_class = CommuneSerializer
    lookup_field = "slug"
    permission_classes = (AllowAny,)
    pagination_class = None


class SearchViewSet(viewsets.ViewSet):
    """
    /api/search/?q=...

    Recherche full-text PostgreSQL sur title + chapeau + body (tsvector français).
    Restreinte aux articles publiés.
    """

    permission_classes = (AllowAny,)

    @method_decorator(cache_page(CACHE_LIST_SECONDS))
    def list(self, request):
        query = (request.query_params.get("q") or "").strip()
        if not query:
            return Response({"results": [], "count": 0, "query": ""})

        vector = SearchVector("title", weight="A", config="french") + SearchVector(
            "chapeau", weight="B", config="french"
        ) + SearchVector("body", weight="C", config="french")
        sq = SearchQuery(query, config="french")

        qs = (
            Article.objects.filter(
                status=Article.Status.PUBLISHED,
                published_at__lte=timezone.now(),
            )
            .annotate(rank=SearchRank(vector, sq))
            .filter(rank__gte=0.05)
            .order_by("-rank")[:50]
            .select_related("category", "commune", "author")
        )

        serializer = ArticleListSerializer(qs, many=True, context={"request": request})
        return Response({
            "results": serializer.data,
            "count": qs.count() if hasattr(qs, "count") else len(serializer.data),
            "query": query,
        })

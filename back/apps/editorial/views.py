"""
ViewSets DRF pour l'API editorial.

- Lecture publique sur articles publiés uniquement.
- Le back-office voit tous les statuts (drafts inclus) si auth + role editor/admin.
"""
from __future__ import annotations

import hashlib

from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
from django.core.cache import cache
from django.db.models import F
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, mixins, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.assistant.rate_limit import get_client_ip
from apps.core.models import Commune

from .filters import ArticleFilter
from .models import Article, Category, Tag
from .permissions import IsAuthorOrReadOnly, IsEditorOrAdmin
from .serializers import (
    ArticleDetailSerializer,
    ArticleListSerializer,
    ArticleWriteSerializer,
    CategoryAdminSerializer,
    CategorySerializer,
    CommuneSerializer,
    TagSerializer,
)

CACHE_LIST_SECONDS = 60
VIEW_DEDUP_SECONDS = 30 * 60


class ArticleViewSet(viewsets.ModelViewSet):
    """
    /api/articles/         — list (publics seulement pour anon)
    /api/articles/<slug>/  — detail
    POST/PATCH/DELETE      — réservés editor/admin
    """

    lookup_field = "slug"
    permission_classes = (IsEditorOrAdmin, IsAuthorOrReadOnly)
    filterset_class = ArticleFilter
    # Override explicite : DjangoFilterBackend (pour ?category=, ?commune=, etc.) +
    # OrderingFilter (pour ?ordering=). Les DEFAULT_FILTER_BACKENDS sont écrasés
    # quand on définit filter_backends ici, donc on les liste tous.
    filter_backends = (DjangoFilterBackend, filters.OrderingFilter)
    ordering_fields = ("published_at", "created_at", "view_count")
    ordering = ("-published_at",)

    def get_queryset(self):
        qs = (
            Article.objects.select_related("category", "commune", "author", "sponsor")
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

    @action(
        detail=True,
        methods=["post"],
        permission_classes=(AllowAny,),
        authentication_classes=(),
    )
    def view(self, request, slug=None):
        """POST /api/articles/<slug>/view/ — une lecture, envoyée par le navigateur.

        Le compteur était incrémenté au rendu serveur, c'est-à-dire au plus
        une fois par revalidation du cache Next (1 h) : il ne mesurait rien.
        Une vue par IP (hashée) et par article toutes les 30 minutes.
        """
        article = get_object_or_404(
            Article,
            slug=slug,
            status=Article.Status.PUBLISHED,
            published_at__lte=timezone.now(),
        )
        ip_hash = hashlib.sha256(f"article-view:{get_client_ip(request)}".encode()).hexdigest()[:24]
        if cache.add(f"article-view:{article.pk}:{ip_hash}", 1, VIEW_DEDUP_SECONDS):
            Article.objects.filter(pk=article.pk).update(view_count=F("view_count") + 1)
        return Response(status=204)


class CategoryViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    lookup_field = "slug"
    permission_classes = (AllowAny,)
    pagination_class = None  # liste courte, on retourne tout


class CategoryAdminViewSet(viewsets.ModelViewSet):
    """
    /api/admin/categories/        — list / create
    /api/admin/categories/<id>/   — retrieve / update / delete

    CRUD complet pour les catégories d'articles éditoriaux. Réservé
    editor/admin (les rédacteurs créent leurs propres catégories pour
    éviter de toucher à Django Admin).

    PROTECT côté FK Article→Category : la suppression d'une catégorie qui
    contient encore des articles renverra une erreur 400 (DRF traduit
    ProtectedError en payload JSON).
    """

    queryset = Category.objects.all().order_by("sort_order", "name")
    serializer_class = CategoryAdminSerializer
    permission_classes = (IsEditorOrAdmin,)
    pagination_class = None  # liste courte (typique < 30 catégories)


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

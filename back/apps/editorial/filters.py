"""Filtres django-filter pour l'API publique."""
import django_filters

from apps.core.models import Commune

from .models import Article, Category, Tag


class ArticleFilter(django_filters.FilterSet):
    """Filtres exposés sur GET /api/articles/?..."""

    category = django_filters.CharFilter(field_name="category__slug", lookup_expr="exact")
    commune = django_filters.CharFilter(field_name="commune__slug", lookup_expr="exact")
    tag = django_filters.CharFilter(field_name="tags__slug", lookup_expr="exact")
    department = django_filters.CharFilter(field_name="commune__department")
    article_type = django_filters.CharFilter(field_name="article_type")
    is_featured = django_filters.BooleanFilter(field_name="is_featured")
    published_after = django_filters.IsoDateTimeFilter(
        field_name="published_at", lookup_expr="gte"
    )
    published_before = django_filters.IsoDateTimeFilter(
        field_name="published_at", lookup_expr="lte"
    )

    class Meta:
        model = Article
        fields = (
            "category", "commune", "tag", "department",
            "article_type", "is_featured",
            "published_after", "published_before",
        )

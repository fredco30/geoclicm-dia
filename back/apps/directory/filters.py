"""Filtres django-filter pour l'API directory."""
import django_filters

from .models import Business


class BusinessFilter(django_filters.FilterSet):
    """Filtres exposés sur GET /api/businesses/?..."""

    category = django_filters.CharFilter(field_name="category__slug", lookup_expr="exact")
    commune = django_filters.CharFilter(field_name="commune__slug", lookup_expr="exact")
    department = django_filters.CharFilter(field_name="commune__department")
    plan = django_filters.CharFilter(field_name="plan")
    is_published = django_filters.BooleanFilter(field_name="is_published")
    is_featured = django_filters.BooleanFilter(field_name="is_featured")
    is_claimed = django_filters.BooleanFilter(field_name="is_claimed")
    owner = django_filters.NumberFilter(field_name="owner_id")

    class Meta:
        model = Business
        fields = (
            "category", "commune", "department",
            "plan", "is_published", "is_featured",
            "is_claimed", "owner",
        )

"""Filtres django-filter pour l'API directory."""
from django.db.models import Q
import django_filters

from .models import Business


class BusinessFilter(django_filters.FilterSet):
    """Filtres exposés sur GET /api/businesses/?..."""

    category = django_filters.CharFilter(field_name="category__slug", lookup_expr="exact")
    commune = django_filters.CharFilter(field_name="commune__slug", lookup_expr="exact")
    # `area` matche commune principale OU une zone desservie (service_areas).
    # Utile pour la page publique d'une commune : afficher tous les commerçants
    # qui y ont leur siège ET ceux qui interviennent sur le territoire.
    area = django_filters.CharFilter(method="filter_by_area")
    department = django_filters.CharFilter(field_name="commune__department")
    plan = django_filters.CharFilter(field_name="plan")
    is_published = django_filters.BooleanFilter(field_name="is_published")
    is_featured = django_filters.BooleanFilter(field_name="is_featured")
    is_claimed = django_filters.BooleanFilter(field_name="is_claimed")
    owner = django_filters.NumberFilter(field_name="owner_id")

    class Meta:
        model = Business
        fields = (
            "category", "commune", "area", "department",
            "plan", "is_published", "is_featured",
            "is_claimed", "owner",
        )

    def filter_by_area(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(
            Q(commune__slug=value) | Q(service_areas__slug=value)
        ).distinct()

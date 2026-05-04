"""Filtres django-filter pour l'API ads."""
import django_filters

from .models import AdCampaign


class AdCampaignFilter(django_filters.FilterSet):
    """Filtres exposés sur GET /api/ad-campaigns/?... (back-office)."""

    business = django_filters.NumberFilter(field_name="business_id")
    placement = django_filters.CharFilter(field_name="placement")
    is_active = django_filters.BooleanFilter(field_name="is_active")
    is_paid = django_filters.BooleanFilter(field_name="is_paid")
    starts_after = django_filters.IsoDateTimeFilter(
        field_name="starts_at", lookup_expr="gte"
    )
    ends_before = django_filters.IsoDateTimeFilter(
        field_name="ends_at", lookup_expr="lte"
    )

    class Meta:
        model = AdCampaign
        fields = (
            "business", "placement", "is_active", "is_paid",
            "starts_after", "ends_before",
        )

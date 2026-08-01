"""Filtres django-filter pour l'API directory."""
from django.db.models import Q
import django_filters

from .models import Business, BusinessCategory


class BusinessFilter(django_filters.FilterSet):
    """Filtres exposés sur GET /api/businesses/?..."""

    # `category` matche la branche entiere : la categorie visee ET ses
    # descendantes (les fiches sont rangees dans les sous-categories) :
    # ?category=associations remonte toute la branche, pas la racine seule.
    category = django_filters.CharFilter(method="filter_by_category_branch")
    commune = django_filters.CharFilter(field_name="commune__slug", lookup_expr="exact")
    # `area` matche commune principale OU une zone desservie (service_areas).
    # Utile pour la page publique d'une commune : afficher tous les commerçants
    # qui y ont leur siège ET ceux qui interviennent sur le territoire.
    area = django_filters.CharFilter(method="filter_by_area")
    # `exclude_category` retire toute une branche (slug racine ou non) des
    # resultats. Utilise par /commerces pour exclure la gastronomie, qui a sa
    # propre section autonome.
    exclude_category = django_filters.CharFilter(method="filter_exclude_category_branch")
    # `specialty` matche une envie stockee dans le JSONField `specialties`
    # (valeur exacte, ex "Pizzeria"). Utilise par la section Gastronomie.
    specialty = django_filters.CharFilter(method="filter_by_specialty")
    department = django_filters.CharFilter(field_name="commune__department")
    plan = django_filters.CharFilter(field_name="plan")
    is_published = django_filters.BooleanFilter(field_name="is_published")
    is_featured = django_filters.BooleanFilter(field_name="is_featured")
    local_producer = django_filters.BooleanFilter(field_name="is_local_producer")
    is_claimed = django_filters.BooleanFilter(field_name="is_claimed")
    owner = django_filters.NumberFilter(field_name="owner_id")

    class Meta:
        model = Business
        fields = (
            "category", "commune", "area", "exclude_category", "specialty",
            "department",
            "plan", "is_published", "is_featured", "local_producer",
            "is_claimed", "owner",
        )

    def filter_by_area(self, queryset, name, value):
        if not value:
            return queryset
        return queryset.filter(
            Q(commune__slug=value) | Q(service_areas__slug=value)
        ).distinct()

    def filter_by_category_branch(self, queryset, name, value):
        if not value:
            return queryset
        category = BusinessCategory.objects.filter(slug=value).first()
        if category is None:
            return queryset.none()
        ids = self._branch_ids(category)
        return queryset.filter(
            Q(category_id__in=ids) | Q(secondary_categories__id__in=ids)
        ).distinct()

    def filter_exclude_category_branch(self, queryset, name, value):
        if not value:
            return queryset
        category = BusinessCategory.objects.filter(slug=value).first()
        if category is None:
            return queryset
        ids = self._branch_ids(category)
        return queryset.exclude(
            Q(category_id__in=ids) | Q(secondary_categories__id__in=ids)
        ).distinct()

    def filter_by_specialty(self, queryset, name, value):
        if not value:
            return queryset
        # JSONField : la valeur exacte doit etre un element de la liste.
        return queryset.filter(specialties__contains=[value])

    @staticmethod
    def _branch_ids(category: BusinessCategory) -> set[int]:
        # Descendance recursive (2 niveaux aujourd hui, generique si une
        # 3e profondeur apparait).
        ids = {category.id}
        frontier = [category.id]
        while frontier:
            children = list(
                BusinessCategory.objects.filter(parent_id__in=frontier).values_list(
                    "id", flat=True
                )
            )
            new = [c for c in children if c not in ids]
            ids.update(new)
            frontier = new
        return ids

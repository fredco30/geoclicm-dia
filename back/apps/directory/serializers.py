"""
Sérialiseurs DRF pour les modèles directory.

Pattern aligné sur editorial : List/Detail/Write distincts.
Les coordonnées GPS sont exposées en latitude/longitude (float) pour
simplifier la consommation côté front (geocoding Nominatim renvoie ce format).
"""
from __future__ import annotations

from django.contrib.gis.geos import Point
from rest_framework import serializers

from apps.core.models import Commune
from apps.editorial.serializers import ImageVariantsField

from .models import Business, BusinessCategory, BusinessImportCandidate


class CommuneMiniSerializer(serializers.ModelSerializer):
    """Représentation légère d'une commune (id+name+slug+department)."""

    class Meta:
        model = Commune
        fields = ("id", "name", "slug", "department")


# ============================================================================
# BusinessCategory — read+write unique (objet simple)
# ============================================================================

class BusinessCategorySerializer(serializers.ModelSerializer):
    parent_name = serializers.CharField(source="parent.name", read_only=True, default=None)

    class Meta:
        model = BusinessCategory
        fields = (
            "id", "name", "slug", "parent", "parent_name",
            "icon", "description", "schema_type",
            "sort_order", "is_active",
            "created_at", "updated_at",
        )
        read_only_fields = ("id", "slug", "created_at", "updated_at")


# ============================================================================
# Business — listing (back-office)
# ============================================================================

class BusinessListSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    commune_name = serializers.CharField(source="commune.name", read_only=True)
    owner_username = serializers.CharField(source="owner.username", read_only=True, default=None)
    logo = ImageVariantsField(read_only=True)
    service_areas_count = serializers.IntegerField(
        source="service_areas.count", read_only=True
    )
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = Business
        fields = (
            "id", "name", "slug", "city",
            "category", "category_name",
            "specialties",
            "commune", "commune_name",
            "service_areas_count",
            "latitude", "longitude",
            "owner", "owner_username",
            "logo", "plan",
            "is_published", "is_featured", "is_local_producer", "is_claimed",
            "created_at", "updated_at",
        )

    def get_latitude(self, obj: Business) -> float | None:
        return obj.location.y if obj.location else None

    def get_longitude(self, obj: Business) -> float | None:
        return obj.location.x if obj.location else None


# ============================================================================
# Business — detail (read public + back-office)
# ============================================================================

class BusinessDetailSerializer(serializers.ModelSerializer):
    category = BusinessCategorySerializer(read_only=True)
    secondary_categories = BusinessCategorySerializer(many=True, read_only=True)
    commune_name = serializers.CharField(source="commune.name", read_only=True)
    service_areas = CommuneMiniSerializer(many=True, read_only=True)
    logo = ImageVariantsField(read_only=True)
    cover_image = ImageVariantsField(read_only=True)
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = Business
        fields = (
            "id", "name", "slug", "legal_name", "siret",
            "category", "secondary_categories",
            "short_description", "description", "specialties",
            "logo", "cover_image",
            "address", "address_complement", "postal_code", "city",
            "latitude", "longitude", "commune", "commune_name", "service_areas",
            "phone", "mobile", "email", "website",
            "facebook_url", "instagram_url", "tiktok_url",
            "opening_hours", "seasonal_closures",
            "plan", "plan_starts_at", "plan_ends_at",
            "is_published", "is_featured", "is_local_producer", "is_claimed",
            "meta_description", "view_count",
            "created_at", "updated_at",
        )

    def get_latitude(self, obj: Business) -> float | None:
        return obj.location.y if obj.location else None

    def get_longitude(self, obj: Business) -> float | None:
        return obj.location.x if obj.location else None


# ============================================================================
# Business — write (back-office)
# ============================================================================

class BusinessWriteSerializer(serializers.ModelSerializer):
    """
    Sérialiseur d'écriture pour le back-office custom.

    - latitude/longitude (float) en write-only : convertis en Point côté create/update
    - Stripe + view_count : read-only (gérés par webhooks Stripe et code interne)
    """

    latitude = serializers.FloatField(write_only=True, required=False, allow_null=True)
    longitude = serializers.FloatField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = Business
        fields = (
            "id", "name", "slug", "legal_name", "siret",
            "category", "secondary_categories",
            "short_description", "description", "specialties",
            "logo", "cover_image",
            "address", "address_complement", "postal_code", "city",
            "latitude", "longitude", "commune", "service_areas",
            "phone", "mobile", "email", "website",
            "facebook_url", "instagram_url", "tiktok_url",
            "opening_hours", "seasonal_closures",
            "plan", "plan_starts_at", "plan_ends_at",
            "owner", "is_claimed",
            "is_published", "is_featured", "is_local_producer",
            "meta_description",
        )
        read_only_fields = ("id", "slug")

    def validate_short_description(self, value: str) -> str:
        if value and len(value) > 200:
            raise serializers.ValidationError(
                "La description courte ne peut pas dépasser 200 caractères."
            )
        return value

    def validate_siret(self, value: str) -> str:
        cleaned = (value or "").replace(" ", "")
        if cleaned and len(cleaned) != 14:
            raise serializers.ValidationError(
                "Le SIRET doit contenir exactement 14 chiffres."
            )
        return cleaned

    def _set_location(self, validated_data: dict) -> None:
        lat = validated_data.pop("latitude", None)
        lng = validated_data.pop("longitude", None)
        if lat is not None and lng is not None:
            validated_data["location"] = Point(lng, lat, srid=4326)
        elif lat is None and lng is None and "latitude" in self.initial_data:
            # Reset explicite (lat/lng = null envoyés)
            validated_data["location"] = None

    def create(self, validated_data):
        self._set_location(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        self._set_location(validated_data)
        return super().update(instance, validated_data)


class BusinessAdvertiserWriteSerializer(BusinessWriteSerializer):
    """
    Sérialiseur d'écriture pour l'espace annonceur self-service.

    Différences vs BusinessWriteSerializer (admin) :
    - Pas de champs workflow (is_published / is_featured) : la publication
      est validée par l'équipe geoclicMédia après vérification de la fiche
    - Pas de champs commerciaux (plan / plan_dates) : gérés par admin/Stripe
    - Pas de champs annonceur internes (owner / is_claimed) : forcés par
      la vue (owner = user courant, is_claimed=True dès création)
    """

    class Meta(BusinessWriteSerializer.Meta):
        fields = (
            "id", "name", "slug", "legal_name", "siret",
            "category", "secondary_categories",
            "short_description", "description", "specialties",
            "logo", "cover_image",
            "address", "address_complement", "postal_code", "city",
            "latitude", "longitude", "commune", "service_areas",
            "phone", "mobile", "email", "website",
            "facebook_url", "instagram_url", "tiktok_url",
            "opening_hours", "seasonal_closures",
            "meta_description",
        )


# ============================================================================
# BusinessImportCandidate — boîte « À valider » Commerçants
# ============================================================================

class BusinessImportCandidateSerializer(serializers.ModelSerializer):
    crawl_source_label = serializers.CharField(source="crawl_source.label", read_only=True)
    commune_name = serializers.CharField(source="commune.name", read_only=True, default=None)
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    matched_business_slug = serializers.CharField(
        source="matched_business.slug",
        read_only=True,
        default=None,
    )
    extraction_evidence = serializers.SerializerMethodField()

    class Meta:
        model = BusinessImportCandidate
        fields = (
            "id",
            "crawl_source",
            "crawl_source_label",
            "source_uid",
            "extraction_method",
            "source_url",
            "name",
            "short_description",
            "description",
            "image_url",
            "address",
            "postal_code",
            "city",
            "latitude",
            "longitude",
            "phone",
            "email",
            "website",
            "commune",
            "commune_name",
            "category",
            "category_name",
            "status",
            "validation_errors",
            "extraction_evidence",
            "matched_business_slug",
            "first_seen_at",
            "last_seen_at",
        )
        read_only_fields = (
            "id",
            "crawl_source",
            "source_uid",
            "extraction_method",
            "source_url",
            "image_url",
            "status",
            "validation_errors",
            "extraction_evidence",
            "matched_business_slug",
            "first_seen_at",
            "last_seen_at",
        )

    def get_extraction_evidence(self, obj):
        payload = obj.raw_payload or {}
        evidence = payload.get("verified_evidence") or []
        return [str(item) for item in evidence if item]

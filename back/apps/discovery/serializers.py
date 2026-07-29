import json

from django.contrib.gis.geos import Point
from django.db import transaction
from rest_framework import serializers

from apps.editorial.serializers import ImageVariantsField

from .models import Place, PlaceCategory, PlaceImportCandidate


class PlaceCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = PlaceCategory
        fields = ("id", "name", "slug", "description", "icon", "color", "sort_order", "is_active")
        read_only_fields = ("id",)
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}


class PlaceListSerializer(serializers.ModelSerializer):
    category = PlaceCategorySerializer(read_only=True)
    commune_name = serializers.CharField(source="commune.name", read_only=True)
    commune_slug = serializers.CharField(source="commune.slug", read_only=True)
    cover_image = ImageVariantsField(read_only=True)
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()

    class Meta:
        model = Place
        fields = ("id", "title", "slug", "short_description", "cover_image", "category", "commune_name", "commune_slug", "latitude", "longitude", "duration", "difficulty", "status", "is_featured", "sort_order", "updated_at")

    def get_latitude(self, obj):
        return obj.location.y if obj.location else None

    def get_longitude(self, obj):
        return obj.location.x if obj.location else None


class PlaceDetailSerializer(PlaceListSerializer):
    category_id = serializers.IntegerField(read_only=True)
    commune_id = serializers.IntegerField(read_only=True)
    related_articles = serializers.SerializerMethodField()
    related_businesses = serializers.SerializerMethodField()
    related_events = serializers.SerializerMethodField()
    related_article_ids = serializers.PrimaryKeyRelatedField(source="related_articles", many=True, read_only=True)
    related_business_ids = serializers.PrimaryKeyRelatedField(source="related_businesses", many=True, read_only=True)
    related_event_ids = serializers.PrimaryKeyRelatedField(source="related_events", many=True, read_only=True)

    class Meta(PlaceListSerializer.Meta):
        fields = PlaceListSerializer.Meta.fields + ("description", "address", "accessibility", "best_season", "practical_info", "official_url", "category_id", "commune_id", "related_articles", "related_businesses", "related_events", "related_article_ids", "related_business_ids", "related_event_ids", "meta_title", "meta_description", "published_at", "created_at")

    def get_related_articles(self, obj):
        return [{"id": item.id, "title": item.title, "slug": item.slug, "short_description": item.chapeau} for item in obj.related_articles.filter(status="published")]

    def get_related_businesses(self, obj):
        return [{"id": item.id, "name": item.name, "slug": item.slug, "short_description": item.short_description} for item in obj.related_businesses.filter(is_published=True)]

    def get_related_events(self, obj):
        return [{"id": item.id, "title": item.title, "slug": item.slug, "short_description": item.short_description} for item in obj.related_events.filter(status="published")]


class PlaceWriteSerializer(serializers.ModelSerializer):
    latitude = serializers.FloatField(write_only=True, required=False, allow_null=True)
    longitude = serializers.FloatField(write_only=True, required=False, allow_null=True)
    related_articles_json = serializers.CharField(write_only=True, required=False)
    related_businesses_json = serializers.CharField(write_only=True, required=False)
    related_events_json = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = Place
        fields = ("id", "title", "slug", "short_description", "description", "cover_image", "category", "commune", "address", "latitude", "longitude", "duration", "difficulty", "accessibility", "best_season", "practical_info", "official_url", "related_articles_json", "related_businesses_json", "related_events_json", "status", "is_featured", "sort_order", "meta_title", "meta_description")
        read_only_fields = ("id",)
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}

    def _set_location(self, data):
        has_lat = "latitude" in data
        has_lng = "longitude" in data
        lat = data.pop("latitude", None)
        lng = data.pop("longitude", None)
        if lat is not None and lng is not None:
            data["location"] = Point(lng, lat, srid=4326)
        elif has_lat and has_lng and lat is None and lng is None:
            data["location"] = None

    def _relations(self, data):
        result = {}
        for field in ("related_articles", "related_businesses", "related_events"):
            key = f"{field}_json"
            if key not in data:
                continue
            raw = data.pop(key)
            try:
                ids = json.loads(raw)
            except json.JSONDecodeError as exc:
                raise serializers.ValidationError({key: "JSON invalide."}) from exc
            if not isinstance(ids, list) or not all(isinstance(item, int) for item in ids):
                raise serializers.ValidationError({key: "Une liste d'identifiants est attendue."})
            result[field] = ids
        return result

    @transaction.atomic
    def create(self, validated_data):
        relations = self._relations(validated_data)
        self._set_location(validated_data)
        place = super().create(validated_data)
        for field, ids in relations.items():
            getattr(place, field).set(ids)
        return place

    @transaction.atomic
    def update(self, instance, validated_data):
        relations = self._relations(validated_data)
        self._set_location(validated_data)
        place = super().update(instance, validated_data)
        for field, ids in relations.items():
            getattr(place, field).set(ids)
        return place


class PlaceImportCandidateSerializer(serializers.ModelSerializer):
    crawl_source_label = serializers.CharField(source="crawl_source.label", read_only=True)
    commune_name = serializers.CharField(source="commune.name", read_only=True, default=None)
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    matched_place_slug = serializers.CharField(
        source="matched_place.slug",
        read_only=True,
        default=None,
    )
    extraction_evidence = serializers.SerializerMethodField()

    class Meta:
        model = PlaceImportCandidate
        fields = (
            "id",
            "crawl_source",
            "crawl_source_label",
            "source_uid",
            "extraction_method",
            "source_url",
            "title",
            "short_description",
            "description",
            "image_url",
            "image_credit",
            "address",
            "latitude",
            "longitude",
            "duration",
            "difficulty",
            "accessibility",
            "best_season",
            "practical_info",
            "official_url",
            "commune",
            "commune_name",
            "category",
            "category_name",
            "status",
            "validation_errors",
            "extraction_evidence",
            "matched_place_slug",
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
            "image_credit",
            "official_url",
            "status",
            "validation_errors",
            "extraction_evidence",
            "matched_place_slug",
            "first_seen_at",
            "last_seen_at",
        )

    def get_extraction_evidence(self, obj):
        payload = obj.raw_payload or {}
        evidence = payload.get("verified_evidence") or []
        return [str(item) for item in evidence if item]

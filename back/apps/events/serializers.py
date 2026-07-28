"""Serializers publics et admin du module Agenda."""

from __future__ import annotations

import json

from django.contrib.gis.geos import Point
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.editorial.serializers import ImageVariantsField

from .models import (
    Event,
    EventCategory,
    EventImportCandidate,
    EventImportRun,
    EventOccurrence,
    EventSource,
)


class EventCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = EventCategory
        fields = (
            "id",
            "name",
            "slug",
            "icon",
            "color",
            "sort_order",
            "is_active",
        )
        read_only_fields = ("id",)
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}


class EventOccurrenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventOccurrence
        fields = (
            "id",
            "starts_at",
            "ends_at",
            "is_all_day",
            "status",
            "note",
        )
        read_only_fields = ("id",)


class EventListSerializer(serializers.ModelSerializer):
    category = EventCategorySerializer(read_only=True)
    commune_name = serializers.CharField(source="commune.name", read_only=True)
    commune_slug = serializers.CharField(source="commune.slug", read_only=True)
    cover_image = ImageVariantsField(source="resolved_cover_image", read_only=True)
    source_cover_image = ImageVariantsField(read_only=True)
    next_occurrence = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    source_label = serializers.CharField(source="source.label", read_only=True, default=None)

    class Meta:
        model = Event
        fields = (
            "id",
            "title",
            "slug",
            "short_description",
            "cover_image",
            "kind",
            "category",
            "commune_name",
            "commune_slug",
            "venue_name",
            "address",
            "latitude",
            "longitude",
            "price",
            "organizer",
            "official_url",
            "status",
            "is_featured",
            "source_label",
            "source_cover_image",
            "next_occurrence",
            "updated_at",
        )

    def get_latitude(self, obj: Event) -> float | None:
        return obj.location.y if obj.location else None

    def get_longitude(self, obj: Event) -> float | None:
        return obj.location.x if obj.location else None

    def get_next_occurrence(self, obj: Event):
        now = timezone.now()
        occurrence = next(
            (
                item
                for item in obj.occurrences.all()
                if item.status == EventOccurrence.Status.SCHEDULED and item.ends_at >= now
            ),
            None,
        )
        return EventOccurrenceSerializer(occurrence).data if occurrence else None


class EventDetailSerializer(EventListSerializer):
    occurrences = serializers.SerializerMethodField()
    business_slug = serializers.CharField(
        source="business.slug",
        read_only=True,
        default=None,
    )
    business_name = serializers.CharField(
        source="business.name",
        read_only=True,
        default=None,
    )
    category_id = serializers.IntegerField(read_only=True)
    commune_id = serializers.IntegerField(read_only=True)
    business_id = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta(EventListSerializer.Meta):
        fields = EventListSerializer.Meta.fields + (
            "description",
            "booking_url",
            "contact_phone",
            "contact_email",
            "organizer",
            "official_url",
            "business_slug",
            "business_name",
            "category_id",
            "commune_id",
            "business_id",
            "occurrences",
            "meta_title",
            "meta_description",
            "published_at",
            "created_at",
            "source_image_url",
            "source_image_hash",
            "image_credit",
            "source_sync_enabled",
        )

    def get_occurrences(self, obj: Event):
        return EventOccurrenceSerializer(obj.occurrences.all(), many=True).data


class EventOccurrenceWriteSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)

    class Meta:
        model = EventOccurrence
        fields = ("id", "starts_at", "ends_at", "is_all_day", "status", "note")

    def validate(self, attrs):
        if attrs["ends_at"] <= attrs["starts_at"]:
            raise serializers.ValidationError(
                {"ends_at": "La fin doit être après le début."},
            )
        return attrs


class EventWriteSerializer(serializers.ModelSerializer):
    latitude = serializers.FloatField(write_only=True, required=False, allow_null=True)
    longitude = serializers.FloatField(write_only=True, required=False, allow_null=True)
    occurrences_json = serializers.CharField(
        write_only=True,
        required=False,
        help_text="Tableau JSON des dates. Ce format reste compatible avec l'envoi multipart d'une image.",
    )

    class Meta:
        model = Event
        fields = (
            "id",
            "title",
            "slug",
            "short_description",
            "description",
            "cover_image",
            "kind",
            "category",
            "commune",
            "venue_name",
            "address",
            "latitude",
            "longitude",
            "price",
            "booking_url",
            "contact_phone",
            "contact_email",
            "organizer",
            "official_url",
            "business",
            "related_articles",
            "status",
            "is_featured",
            "meta_title",
            "meta_description",
            "image_credit",
            "source_sync_enabled",
            "occurrences_json",
        )
        read_only_fields = ("id",)
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}

    def validate_occurrences_json(self, value: str) -> list[dict]:
        try:
            rows = json.loads(value)
        except json.JSONDecodeError as exc:
            raise serializers.ValidationError("JSON de dates invalide.") from exc
        if not isinstance(rows, list):
            raise serializers.ValidationError("Un tableau de dates est attendu.")
        serializer = EventOccurrenceWriteSerializer(data=rows, many=True)
        serializer.is_valid(raise_exception=True)
        starts = [row["starts_at"] for row in serializer.validated_data]
        if len(starts) != len(set(starts)):
            raise serializers.ValidationError(
                "Deux dates ne peuvent pas commencer au même instant.",
            )
        return list(serializer.validated_data)

    def validate(self, attrs):
        status = attrs.get("status", getattr(self.instance, "status", Event.Status.DRAFT))
        occurrences = attrs.get("occurrences_json")
        if status == Event.Status.PUBLISHED:
            if occurrences is None:
                has_upcoming = bool(
                    self.instance
                    and self.instance.occurrences.filter(
                        status=EventOccurrence.Status.SCHEDULED,
                        ends_at__gte=timezone.now(),
                    ).exists()
                )
            else:
                has_upcoming = any(
                    row["status"] == EventOccurrence.Status.SCHEDULED
                    and row["ends_at"] >= timezone.now()
                    for row in occurrences
                )
            if not has_upcoming:
                raise serializers.ValidationError(
                    {
                        "occurrences_json": (
                            "Un événement publié doit avoir au moins une date à venir."
                        ),
                    }
                )
        return attrs

    def _set_location(self, validated_data: dict) -> None:
        has_lat = "latitude" in validated_data
        has_lng = "longitude" in validated_data
        lat = validated_data.pop("latitude", None)
        lng = validated_data.pop("longitude", None)
        if lat is not None and lng is not None:
            validated_data["location"] = Point(lng, lat, srid=4326)
        elif has_lat and has_lng and lat is None and lng is None:
            validated_data["location"] = None

    @staticmethod
    def _create_occurrences(event: Event, rows: list[dict]) -> None:
        EventOccurrence.objects.bulk_create(
            [EventOccurrence(event=event, **row) for row in rows],
        )

    @transaction.atomic
    def create(self, validated_data):
        occurrences = validated_data.pop("occurrences_json", [])
        self._set_location(validated_data)
        event = super().create(validated_data)
        self._create_occurrences(event, occurrences)
        return event

    @transaction.atomic
    def update(self, instance, validated_data):
        occurrences = validated_data.pop("occurrences_json", None)
        self._set_location(validated_data)
        event = super().update(instance, validated_data)
        if occurrences is not None:
            existing = {item.id: item for item in event.occurrences.all()}
            kept_ids: set[int] = set()
            new_rows: list[dict] = []
            for row in occurrences:
                occurrence_id = row.pop("id", None)
                if occurrence_id is None:
                    new_rows.append(row)
                    continue
                occurrence = existing.get(occurrence_id)
                if occurrence is None:
                    raise serializers.ValidationError(
                        {"occurrences": f"Date inconnue : {occurrence_id}."},
                    )
                for field, value in row.items():
                    setattr(occurrence, field, value)
                occurrence.full_clean()
                occurrence.save()
                kept_ids.add(occurrence_id)
            self._create_occurrences(event, new_rows)
            event.occurrences.exclude(id__in=kept_ids).filter(
                starts_at__gte=timezone.now(),
            ).delete()
        return event


class EventImportRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventImportRun
        fields = (
            "id",
            "status",
            "started_at",
            "finished_at",
            "discovered_count",
            "created_count",
            "updated_count",
            "imported_count",
            "ai_extraction_count",
            "duplicate_count",
            "error_count",
            "error_details",
        )


class EventSourceSerializer(serializers.ModelSerializer):
    commune_name = serializers.CharField(source="commune.name", read_only=True, default=None)
    default_category_name = serializers.CharField(
        source="default_category.name",
        read_only=True,
        default=None,
    )
    pending_count = serializers.SerializerMethodField()
    last_run = serializers.SerializerMethodField()
    crawl4ai_available = serializers.SerializerMethodField()
    detected_methods = serializers.SerializerMethodField()

    class Meta:
        model = EventSource
        fields = (
            "id",
            "label",
            "crawl_source",
            "url_patterns",
            "connector",
            "source_url",
            "website_url",
            "commune",
            "commune_name",
            "default_category",
            "default_category_name",
            "default_kind",
            "max_pages",
            "is_active",
            "sync_images",
            "rights_note",
            "last_synced_at",
            "last_status",
            "last_error",
            "ai_provider",
            "ai_model",
            "ai_total_parts",
            "ai_completed_parts",
            "ai_failed_parts",
            "pending_count",
            "last_run",
            "crawl4ai_available",
            "detected_methods",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "last_synced_at",
            "last_status",
            "last_error",
            "ai_provider",
            "ai_model",
            "ai_total_parts",
            "ai_completed_parts",
            "ai_failed_parts",
            "pending_count",
            "last_run",
            "crawl4ai_available",
            "detected_methods",
            "created_at",
            "updated_at",
        )

    def get_detected_methods(self, obj: EventSource) -> list[str]:
        return sorted(
            set(obj.candidates.values_list("extraction_method", flat=True))
        )

    def get_crawl4ai_available(self, obj: EventSource) -> bool:
        from django.conf import settings

        return bool(settings.CRAWL4AI_URL)

    def get_pending_count(self, obj: EventSource) -> int:
        return obj.candidates.filter(
            status__in=(
                EventImportCandidate.Status.PENDING,
                EventImportCandidate.Status.INVALID,
            ),
        ).count()

    def get_last_run(self, obj: EventSource):
        run = obj.runs.first()
        return EventImportRunSerializer(run).data if run else None


class EventImportCandidateSerializer(serializers.ModelSerializer):
    source_label = serializers.CharField(source="source.label", read_only=True)
    commune_name = serializers.CharField(source="commune.name", read_only=True, default=None)
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    matched_event_slug = serializers.CharField(
        source="matched_event.slug",
        read_only=True,
        default=None,
    )
    extraction_evidence = serializers.SerializerMethodField()
    generation_id = serializers.SerializerMethodField()

    class Meta:
        model = EventImportCandidate
        fields = (
            "id",
            "source",
            "source_label",
            "source_uid",
            "extraction_method",
            "source_url",
            "title",
            "short_description",
            "description",
            "image_url",
            "image_credit",
            "starts_at",
            "ends_at",
            "occurrences",
            "is_all_day",
            "venue_name",
            "address",
            "latitude",
            "longitude",
            "price",
            "booking_url",
            "organizer",
            "commune",
            "commune_name",
            "category",
            "category_name",
            "kind",
            "status",
            "validation_errors",
            "extraction_evidence",
            "generation_id",
            "matched_event",
            "matched_event_slug",
            "first_seen_at",
            "last_seen_at",
            "imported_at",
        )
        read_only_fields = (
            "id",
            "source_uid",
            "extraction_method",
            "status",
            "matched_event",
            "first_seen_at",
            "last_seen_at",
            "imported_at",
        )

    def get_extraction_evidence(self, obj: EventImportCandidate) -> list[str]:
        return obj.raw_payload.get("verified_evidence") or []

    def get_generation_id(self, obj: EventImportCandidate) -> int | None:
        raw = obj.raw_payload.get("ai") or obj.raw_payload.get("mistral") or {}
        return raw.get("_generation_id") if isinstance(raw, dict) else None

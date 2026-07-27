"""Serializers publics et admin du module Agenda."""
from __future__ import annotations

import json

from django.contrib.gis.geos import Point
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.editorial.serializers import ImageVariantsField

from .models import Event, EventCategory, EventOccurrence


class EventCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = EventCategory
        fields = (
            "id", "name", "slug", "icon", "color", "sort_order", "is_active",
        )
        read_only_fields = ("id",)
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}


class EventOccurrenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = EventOccurrence
        fields = (
            "id", "starts_at", "ends_at", "is_all_day", "status", "note",
        )
        read_only_fields = ("id",)


class EventListSerializer(serializers.ModelSerializer):
    category = EventCategorySerializer(read_only=True)
    commune_name = serializers.CharField(source="commune.name", read_only=True)
    commune_slug = serializers.CharField(source="commune.slug", read_only=True)
    cover_image = ImageVariantsField(read_only=True)
    next_occurrence = serializers.SerializerMethodField()

    class Meta:
        model = Event
        fields = (
            "id", "title", "slug", "short_description", "cover_image",
            "kind", "category", "commune_name", "commune_slug",
            "venue_name", "price", "status", "is_featured",
            "next_occurrence", "updated_at",
        )

    def get_next_occurrence(self, obj: Event):
        now = timezone.now()
        occurrence = next(
            (
                item
                for item in obj.occurrences.all()
                if item.status == EventOccurrence.Status.SCHEDULED
                and item.ends_at >= now
            ),
            None,
        )
        return EventOccurrenceSerializer(occurrence).data if occurrence else None


class EventDetailSerializer(EventListSerializer):
    occurrences = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    business_slug = serializers.CharField(
        source="business.slug", read_only=True, default=None,
    )
    business_name = serializers.CharField(
        source="business.name", read_only=True, default=None,
    )
    category_id = serializers.IntegerField(read_only=True)
    commune_id = serializers.IntegerField(read_only=True)
    business_id = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta(EventListSerializer.Meta):
        fields = EventListSerializer.Meta.fields + (
            "description", "address", "latitude", "longitude",
            "booking_url", "contact_phone", "contact_email", "organizer",
            "official_url", "business_slug", "business_name",
            "category_id", "commune_id", "business_id",
            "occurrences", "meta_title", "meta_description",
            "published_at", "created_at",
        )

    def get_occurrences(self, obj: Event):
        return EventOccurrenceSerializer(obj.occurrences.all(), many=True).data

    def get_latitude(self, obj: Event) -> float | None:
        return obj.location.y if obj.location else None

    def get_longitude(self, obj: Event) -> float | None:
        return obj.location.x if obj.location else None


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
            "id", "title", "slug", "short_description", "description",
            "cover_image", "kind", "category", "commune", "venue_name",
            "address", "latitude", "longitude", "price", "booking_url",
            "contact_phone", "contact_email", "organizer", "official_url",
            "business", "related_articles", "status", "is_featured",
            "meta_title", "meta_description", "occurrences_json",
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
                raise serializers.ValidationError({
                    "occurrences_json": (
                        "Un événement publié doit avoir au moins une date à venir."
                    ),
                })
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

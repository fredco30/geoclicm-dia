"""API publique et administration du module Agenda."""
from __future__ import annotations

from datetime import UTC, datetime, time

from django.conf import settings
from django.db.models import Min, Q
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import mixins, permissions, viewsets

from apps.editorial.permissions import IsEditorOrAdmin

from .models import Event, EventCategory, EventOccurrence
from .serializers import (
    EventCategorySerializer,
    EventDetailSerializer,
    EventListSerializer,
    EventWriteSerializer,
)


def _public_events_queryset():
    now = timezone.now()
    return (
        Event.objects.filter(
            status=Event.Status.PUBLISHED,
            occurrences__status=EventOccurrence.Status.SCHEDULED,
            occurrences__ends_at__gte=now,
        )
        .select_related("category", "commune", "business")
        .prefetch_related("occurrences")
        .annotate(
            next_start=Min(
                "occurrences__starts_at",
                filter=Q(
                    occurrences__status=EventOccurrence.Status.SCHEDULED,
                    occurrences__ends_at__gte=now,
                ),
            ),
        )
        .distinct()
    )


class EventPublicViewSet(viewsets.ReadOnlyModelViewSet):
    lookup_field = "slug"
    permission_classes = (permissions.AllowAny,)
    ordering = ("next_start",)

    def get_queryset(self):
        qs = _public_events_queryset()
        params = self.request.query_params
        kind = params.get("kind")
        if kind in Event.Kind.values:
            qs = qs.filter(kind=kind)
        if params.get("category"):
            qs = qs.filter(category__slug=params["category"])
        if params.get("commune"):
            qs = qs.filter(commune__slug=params["commune"])
        if date_from := parse_date(params.get("from", "")):
            start = timezone.make_aware(datetime.combine(date_from, time.min))
            qs = qs.filter(occurrences__ends_at__gte=start)
        if date_to := parse_date(params.get("to", "")):
            end = timezone.make_aware(datetime.combine(date_to, time.max))
            qs = qs.filter(occurrences__starts_at__lte=end)
        return qs.order_by("next_start", "title").distinct()

    def get_serializer_class(self):
        return EventListSerializer if self.action == "list" else EventDetailSerializer


class EventCategoryPublicViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    queryset = EventCategory.objects.filter(is_active=True)
    serializer_class = EventCategorySerializer
    lookup_field = "slug"
    permission_classes = (permissions.AllowAny,)
    pagination_class = None


class EventAdminViewSet(viewsets.ModelViewSet):
    queryset = (
        Event.objects.all()
        .select_related("category", "commune", "business", "created_by")
        .prefetch_related("occurrences", "related_articles")
    )
    lookup_field = "slug"
    permission_classes = (permissions.IsAuthenticated, IsEditorOrAdmin)
    pagination_class = None

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return EventWriteSerializer
        return EventDetailSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        if params.get("kind") in Event.Kind.values:
            qs = qs.filter(kind=params["kind"])
        if params.get("status") in Event.Status.values:
            qs = qs.filter(status=params["status"])
        if params.get("commune"):
            qs = qs.filter(commune__slug=params["commune"])
        return qs.order_by("-updated_at")


class EventCategoryAdminViewSet(viewsets.ModelViewSet):
    queryset = EventCategory.objects.all()
    serializer_class = EventCategorySerializer
    lookup_field = "slug"
    permission_classes = (permissions.IsAuthenticated, IsEditorOrAdmin)
    pagination_class = None


def event_ics(request, slug: str):
    event = _public_events_queryset().filter(slug=slug).first()
    if event is None:
        return HttpResponse(status=404)

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//geoclicMedia//Agenda//FR",
        "CALSCALE:GREGORIAN",
    ]
    for occurrence in event.occurrences.all():
        if occurrence.status != EventOccurrence.Status.SCHEDULED:
            continue
        uid = f"event-{event.pk}-{occurrence.pk}@media.geoclic.fr"
        lines.extend([
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTAMP:{timezone.now().astimezone(UTC):%Y%m%dT%H%M%SZ}",
            f"DTSTART:{occurrence.starts_at.astimezone(UTC):%Y%m%dT%H%M%SZ}",
            f"DTEND:{occurrence.ends_at.astimezone(UTC):%Y%m%dT%H%M%SZ}",
            f"SUMMARY:{_ics_escape(event.title)}",
            f"LOCATION:{_ics_escape(' — '.join(filter(None, [event.venue_name, event.address, event.commune.name])))}",
            f"DESCRIPTION:{_ics_escape(event.short_description)}",
            f"URL:{_ics_escape(f'{settings.SITE_URL}/agenda/{event.slug}')}",
            "END:VEVENT",
        ])
    lines.append("END:VCALENDAR")
    response = HttpResponse("\r\n".join(lines) + "\r\n", content_type="text/calendar; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{event.slug}.ics"'
    return response


def _ics_escape(value: str) -> str:
    return (
        value.replace("\\", "\\\\")
        .replace(";", "\\;")
        .replace(",", "\\,")
        .replace("\n", "\\n")
    )

"""API publique et administration du module Agenda."""
from __future__ import annotations

from datetime import UTC, datetime, time

from django.conf import settings
from django.contrib.gis.geos import Polygon
from django.db.models import Min, Q
from django.http import HttpResponse
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.editorial.permissions import IsEditorOrAdmin

from .imports import import_candidate, sync_source_image
from .models import (
    Event,
    EventCategory,
    EventImportCandidate,
    EventOccurrence,
    EventSource,
)
from .serializers import (
    EventCategorySerializer,
    EventDetailSerializer,
    EventImportCandidateSerializer,
    EventListSerializer,
    EventSourceSerializer,
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
        .select_related("category", "commune", "business", "source")
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
        return EventListSerializer if self.action in ("list", "map") else EventDetailSerializer

    @action(detail=False, methods=["get"], url_path="map")
    def map(self, request):
        qs = self.get_queryset().filter(location__isnull=False)
        bbox = request.query_params.get("bbox", "")
        if bbox:
            try:
                west, south, east, north = (float(value) for value in bbox.split(","))
                qs = qs.filter(location__within=Polygon.from_bbox((west, south, east, north)))
            except (TypeError, ValueError):
                return Response(
                    {"bbox": "Format attendu : ouest,sud,est,nord."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        serializer = self.get_serializer(qs[:500], many=True)
        return Response(serializer.data)


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
        .select_related("category", "commune", "business", "created_by", "source")
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

    @action(detail=True, methods=["post"], url_path="revert-source-image")
    def revert_source_image(self, request, slug=None):
        event = self.get_object()
        if event.cover_image:
            event.cover_image.delete(save=False)
            event.cover_image = None
            event.save(update_fields=["cover_image", "updated_at"])
        return Response(EventDetailSerializer(event, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="refresh-source-image")
    def refresh_source_image(self, request, slug=None):
        event = self.get_object()
        if not event.source_image_url:
            return Response(
                {"detail": "Aucune image officielle détectée."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            changed = sync_source_image(event, event.source_image_url)
        except Exception as exc:  # noqa: BLE001
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"changed": changed})

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



class EventSourceAdminViewSet(viewsets.ModelViewSet):
    queryset = (
        EventSource.objects.all()
        .select_related("commune", "default_category", "created_by")
        .prefetch_related("runs")
    )
    serializer_class = EventSourceSerializer
    permission_classes = (permissions.IsAuthenticated, IsEditorOrAdmin)
    pagination_class = None

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["post"])
    def run(self, request, pk=None):
        source = self.get_object()
        if not source.is_active:
            return Response(
                {"detail": "Active la source avant de la synchroniser."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from .tasks import sync_event_source_now
        try:
            task = sync_event_source_now.delay(source.pk)
        except Exception as exc:  # noqa: BLE001
            return Response(
                {"detail": f"Celery indisponible : {exc}"},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response({"task_id": task.id}, status=status.HTTP_202_ACCEPTED)


class EventImportCandidateAdminViewSet(viewsets.ModelViewSet):
    queryset = (
        EventImportCandidate.objects.all()
        .select_related("source", "commune", "category", "matched_event")
    )
    serializer_class = EventImportCandidateSerializer
    permission_classes = (permissions.IsAuthenticated, IsEditorOrAdmin)
    pagination_class = None
    http_method_names = ("get", "patch", "post", "head", "options")

    def get_queryset(self):
        qs = super().get_queryset()
        if source_id := self.request.query_params.get("source"):
            qs = qs.filter(source_id=source_id)
        if candidate_status := self.request.query_params.get("status"):
            qs = qs.filter(status=candidate_status)
        else:
            qs = qs.filter(status__in=(
                EventImportCandidate.Status.PENDING,
                EventImportCandidate.Status.INVALID,
            ))
        return qs

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        candidate = self.get_object()
        if candidate.status == EventImportCandidate.Status.EXPIRED:
            return Response(
                {"detail": "Un événement expiré ne peut pas être publié."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = self.get_serializer(
            candidate, data=request.data or {}, partial=True,
        )
        serializer.is_valid(raise_exception=True)
        candidate = serializer.save()
        missing = []
        if candidate.category_id is None:
            missing.append("catégorie")
        if candidate.commune_id is None:
            missing.append("commune")
        if candidate.starts_at is None or candidate.ends_at is None:
            missing.append("dates")
        if missing:
            return Response(
                {"detail": "Champs requis : " + ", ".join(missing)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            event = import_candidate(candidate, publish=True)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            EventDetailSerializer(event, context={"request": request}).data,
        )

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        candidate = self.get_object()
        candidate.status = EventImportCandidate.Status.REJECTED
        candidate.save(update_fields=["status", "last_seen_at"])
        return Response(self.get_serializer(candidate).data)

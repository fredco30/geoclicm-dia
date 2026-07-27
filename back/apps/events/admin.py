from django.contrib import admin

from .models import (
    Event,
    EventCategory,
    EventImportCandidate,
    EventImportRun,
    EventOccurrence,
    EventSource,
)


class EventOccurrenceInline(admin.TabularInline):
    model = EventOccurrence
    extra = 1


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "kind", "category", "commune", "source", "status", "is_featured")
    list_filter = ("kind", "status", "category", "commune", "source", "is_featured")
    search_fields = ("title", "short_description", "venue_name", "address")
    prepopulated_fields = {"slug": ("title",)}
    inlines = (EventOccurrenceInline,)


@admin.register(EventCategory)
class EventCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "sort_order", "is_active")
    list_editable = ("sort_order", "is_active")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(EventSource)
class EventSourceAdmin(admin.ModelAdmin):
    list_display = ("label", "connector", "commune", "is_active", "last_status", "last_synced_at")
    list_filter = ("connector", "is_active", "last_status", "commune")
    search_fields = ("label", "source_url", "website_url")


@admin.register(EventImportRun)
class EventImportRunAdmin(admin.ModelAdmin):
    list_display = ("source", "status", "started_at", "finished_at", "discovered_count", "created_count", "updated_count", "imported_count", "ai_extraction_count", "error_count")
    list_filter = ("status", "source")
    readonly_fields = ("source", "status", "started_at", "finished_at", "discovered_count", "created_count", "updated_count", "imported_count", "ai_extraction_count", "duplicate_count", "error_count", "error_details")


@admin.register(EventImportCandidate)
class EventImportCandidateAdmin(admin.ModelAdmin):
    list_display = ("title", "source", "extraction_method", "status", "starts_at", "commune", "matched_event", "last_seen_at")
    list_filter = ("status", "extraction_method", "source", "commune", "kind")
    search_fields = ("title", "venue_name", "address", "source_url")

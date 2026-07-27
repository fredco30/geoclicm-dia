from django.contrib import admin

from .models import Event, EventCategory, EventOccurrence


class EventOccurrenceInline(admin.TabularInline):
    model = EventOccurrence
    extra = 1


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ("title", "kind", "category", "commune", "status", "is_featured")
    list_filter = ("kind", "status", "category", "commune", "is_featured")
    search_fields = ("title", "short_description", "venue_name", "address")
    prepopulated_fields = {"slug": ("title",)}
    inlines = (EventOccurrenceInline,)


@admin.register(EventCategory)
class EventCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "sort_order", "is_active")
    list_editable = ("sort_order", "is_active")
    prepopulated_fields = {"slug": ("name",)}

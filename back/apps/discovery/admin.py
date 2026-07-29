from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin

from .models import Place, PlaceCategory, PlaceImportCandidate


@admin.register(PlaceCategory)
class PlaceCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "sort_order", "is_active")
    list_editable = ("sort_order", "is_active")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Place)
class PlaceAdmin(GISModelAdmin):
    list_display = ("title", "category", "commune", "status", "is_featured", "sort_order")
    list_filter = ("status", "category", "commune", "is_featured")
    search_fields = ("title", "short_description", "description", "address")
    prepopulated_fields = {"slug": ("title",)}
    filter_horizontal = ("gallery", "related_articles", "related_businesses", "related_events")


@admin.register(PlaceImportCandidate)
class PlaceImportCandidateAdmin(admin.ModelAdmin):
    list_display = ("title", "crawl_source", "category", "commune", "status", "extraction_method")
    list_filter = ("status", "extraction_method", "category", "commune")
    search_fields = ("title", "short_description", "description", "address")
    readonly_fields = ("source_uid", "fingerprint", "raw_payload", "first_seen_at", "last_seen_at")

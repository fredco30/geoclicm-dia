from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin

from .models import Place, PlaceCategory


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

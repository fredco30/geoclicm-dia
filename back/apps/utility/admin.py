"""Django Admin pour UsefulContact (debug/seed seul — l'UI principale est
côté Next.js sur /admin/utility)."""
from django.contrib import admin

from .models import UsefulContact


@admin.register(UsefulContact)
class UsefulContactAdmin(admin.ModelAdmin):
    list_display = (
        "label", "kind", "contact_type", "category_label",
        "commune", "sort_order", "is_active",
    )
    list_filter = ("kind", "contact_type", "is_active", "commune")
    search_fields = ("label", "value", "category_label", "description")
    list_editable = ("sort_order", "is_active")
    autocomplete_fields = ("commune",)
    fieldsets = (
        (None, {
            "fields": ("kind", "label", "category_label", "is_active"),
        }),
        ("Contact", {
            "fields": ("contact_type", "value", "description"),
        }),
        ("Localisation & ordre", {
            "fields": ("commune", "sort_order"),
        }),
    )

"""Admin Django minimal pour ads — debug/seed only."""
from django.contrib import admin

from .models import AdCampaign


@admin.register(AdCampaign)
class AdCampaignAdmin(admin.ModelAdmin):
    list_display = (
        "name", "business", "placement", "starts_at", "ends_at",
        "is_active", "is_paid", "impression_count", "click_count",
    )
    list_filter = ("placement", "is_active", "is_paid")
    search_fields = ("name", "headline", "business__name")
    raw_id_fields = ("business",)
    filter_horizontal = ("target_communes", "target_categories")
    readonly_fields = ("impression_count", "click_count", "created_at", "updated_at")
    date_hierarchy = "starts_at"

    fieldsets = (
        ("Identité", {
            "fields": ("business", "name", "placement"),
        }),
        ("Créa", {
            "fields": ("image", "headline", "cta_text", "target_url"),
        }),
        ("Ciblage", {
            "fields": ("target_communes", "target_categories"),
            "description": "Vide = toutes communes / toutes catégories.",
        }),
        ("Période", {
            "fields": ("starts_at", "ends_at"),
        }),
        ("Budget", {
            "fields": ("price_paid", "is_paid"),
        }),
        ("Workflow", {
            "fields": ("is_active",),
        }),
        ("Stats", {
            "classes": ("collapse",),
            "fields": ("impression_count", "click_count", "created_at", "updated_at"),
        }),
    )

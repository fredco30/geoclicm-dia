"""Admin Django minimal pour directory — debug/seed only.

Le back-office utilisateur passe par l'app front Next.js (zone /admin/).
"""
from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from django.contrib.gis.forms import OSMWidget

from .models import Business, BusinessCategory, BusinessImportCandidate


CAMARGUE_OSM = OSMWidget(
    attrs={"default_lat": 43.55, "default_lon": 4.15, "default_zoom": 11}
)


@admin.register(BusinessCategory)
class BusinessCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "parent", "schema_type", "icon", "sort_order", "is_active")
    list_filter = ("is_active", "parent", "schema_type")
    search_fields = ("name", "description")
    prepopulated_fields = {"slug": ("name",)}
    raw_id_fields = ("parent",)
    ordering = ("sort_order", "name")


@admin.register(Business)
class BusinessAdmin(GISModelAdmin):
    gis_widget = OSMWidget
    gis_widget_kwargs = {
        "attrs": {"default_lat": 43.55, "default_lon": 4.15, "default_zoom": 11}
    }
    list_display = (
        "name", "category", "commune", "plan",
        "is_published", "is_local_producer", "is_claimed", "owner",
    )
    list_filter = ("plan", "is_published", "is_local_producer", "is_claimed", "is_featured", "commune", "category")
    search_fields = ("name", "legal_name", "siret", "short_description", "description")
    prepopulated_fields = {"slug": ("name",)}
    raw_id_fields = ("commune", "owner", "category")
    filter_horizontal = ("secondary_categories", "photos", "service_areas")
    readonly_fields = ("view_count", "created_at", "updated_at")

    fieldsets = (
        ("Identité", {
            "fields": ("name", "slug", "legal_name", "siret"),
        }),
        ("Classification", {
            "fields": ("category", "secondary_categories"),
        }),
        ("Descriptions", {
            "fields": ("short_description", "description", "specialties"),
        }),
        ("Médias", {
            "fields": ("logo", "cover_image", "photos"),
        }),
        ("Localisation", {
            "fields": ("address", "address_complement", "postal_code", "city",
                       "commune", "service_areas", "location"),
        }),
        ("Contact", {
            "fields": ("phone", "mobile", "email", "website"),
        }),
        ("Réseaux sociaux", {
            "classes": ("collapse",),
            "fields": ("facebook_url", "instagram_url", "tiktok_url"),
        }),
        ("Horaires", {
            "classes": ("collapse",),
            "fields": ("opening_hours", "seasonal_closures"),
        }),
        ("Plan commercial (Lot E — Stripe)", {
            "classes": ("collapse",),
            "fields": ("plan", "plan_starts_at", "plan_ends_at",
                       "stripe_customer_id", "stripe_subscription_id"),
        }),
        ("Annonceur (Lot D — self-service)", {
            "classes": ("collapse",),
            "fields": ("owner", "is_claimed"),
        }),
        ("Workflow", {
            "fields": ("is_published", "is_featured", "is_local_producer"),
        }),
        ("SEO", {
            "classes": ("collapse",),
            "fields": ("meta_description",),
        }),
        ("Stats", {
            "classes": ("collapse",),
            "fields": ("view_count", "created_at", "updated_at"),
        }),
    )


@admin.register(BusinessImportCandidate)
class BusinessImportCandidateAdmin(admin.ModelAdmin):
    list_display = ("name", "crawl_source", "category", "commune", "status", "extraction_method")
    list_filter = ("status", "extraction_method", "category", "commune")
    search_fields = ("name", "short_description", "description", "address")
    readonly_fields = ("source_uid", "fingerprint", "raw_payload", "first_seen_at", "last_seen_at")

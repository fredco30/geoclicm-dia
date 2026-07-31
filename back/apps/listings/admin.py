from django.contrib import admin

from .models import Listing, ListingCategory, ListingImportCandidate


@admin.register(ListingCategory)
class ListingCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "sort_order", "is_active")
    list_editable = ("sort_order", "is_active")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "commune", "status", "published_at", "expires_at")
    list_filter = ("status", "category", "commune")
    search_fields = ("title", "short_description", "description", "employer_or_agency")
    prepopulated_fields = {"slug": ("title",)}


@admin.register(ListingImportCandidate)
class ListingImportCandidateAdmin(admin.ModelAdmin):
    list_display = ("title", "crawl_source", "category", "commune", "status", "extraction_method")
    list_filter = ("status", "extraction_method", "category", "commune")
    search_fields = ("title", "short_description", "description", "employer_or_agency")
    readonly_fields = ("source_uid", "fingerprint", "raw_payload", "first_seen_at", "last_seen_at")

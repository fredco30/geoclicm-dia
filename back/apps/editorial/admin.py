"""Admin Django minimal pour editorial — debug/seed only."""
from django.contrib import admin
from django.contrib.gis.admin import GISModelAdmin
from django.contrib.gis.forms import OSMWidget

from .models import Article, Category, Tag


# Widget OSM centré sur la Camargue (entre Le Grau-du-Roi et Lunel)
CAMARGUE_OSM = OSMWidget(
    attrs={"default_lat": 43.55, "default_lon": 4.15, "default_zoom": 11}
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug", "color", "icon", "sort_order", "is_active")
    list_filter = ("is_active",)
    search_fields = ("name", "description")
    prepopulated_fields = {"slug": ("name",)}
    ordering = ("sort_order", "name")


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name",)
    prepopulated_fields = {"slug": ("name",)}


@admin.register(Article)
class ArticleAdmin(GISModelAdmin):
    gis_widget = OSMWidget
    gis_widget_kwargs = {
        "attrs": {"default_lat": 43.55, "default_lon": 4.15, "default_zoom": 11}
    }
    list_display = (
        "title", "category", "commune", "status", "is_featured",
        "author", "published_at",
    )
    list_filter = ("status", "is_featured", "category", "commune", "article_type")
    search_fields = ("title", "chapeau", "body")
    prepopulated_fields = {"slug": ("title",)}
    raw_id_fields = ("author", "commune")
    filter_horizontal = ("tags", "gallery")
    readonly_fields = ("view_count", "created_at", "updated_at",
                       "facebook_post_id", "facebook_published_at")
    date_hierarchy = "published_at"

    fieldsets = (
        ("Contenu", {
            "fields": ("title", "slug", "chapeau", "body", "cover_image", "gallery"),
        }),
        ("Catégorisation", {
            "fields": ("category", "tags", "article_type"),
        }),
        ("Géo", {
            "fields": ("commune", "location"),
        }),
        ("Workflow", {
            "fields": ("status", "is_featured", "author", "published_at"),
        }),
        ("Diffusion Facebook (sprint 2)", {
            "classes": ("collapse",),
            "fields": ("auto_publish_to_facebook", "facebook_post_id", "facebook_published_at"),
        }),
        ("Sponsoring (sprint 3-4)", {
            "classes": ("collapse",),
            "fields": ("sponsor_data", "sponsor_disclosure"),
        }),
        ("SEO", {
            "classes": ("collapse",),
            "fields": ("meta_title", "meta_description"),
        }),
        ("Stats", {
            "classes": ("collapse",),
            "fields": ("view_count", "created_at", "updated_at"),
        }),
    )

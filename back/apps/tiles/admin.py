from django.contrib import admin

from .models import Tile


@admin.register(Tile)
class TileAdmin(admin.ModelAdmin):
    list_display = (
        "label", "parent", "kind", "module_key",
        "sort_order", "show_on_home", "is_active",
    )
    list_filter = ("kind", "is_active", "show_on_home", "color")
    search_fields = ("label", "internal_path", "external_url")
    list_editable = ("sort_order", "is_active")
    autocomplete_fields = ("parent",)
    filter_horizontal = ("visible_on_communes",)
    fieldsets = (
        ("Identité", {
            "fields": ("parent", "label", "icon", "color", "cover_image"),
        }),
        ("Action au clic", {
            "fields": ("kind", "internal_path", "external_url", "module_key"),
            "description": (
                "Selon le type choisi, remplir UN des trois champs : "
                "chemin interne (ex: /agenda), URL externe, ou module."
            ),
        }),
        ("Affichage", {
            "fields": (
                "sort_order", "is_active", "show_on_home",
                "visible_on_communes", "span_2x",
            ),
        }),
        ("Métadonnées", {
            "fields": ("created_at", "updated_at"),
            "classes": ("collapse",),
        }),
    )
    readonly_fields = ("created_at", "updated_at")

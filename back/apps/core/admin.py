"""
Admin Django minimal — usage debug/seed uniquement.

Le back-office utilisateur final est dans le front Next.js (sprint 1 ÉTAPE 5b).
Pas besoin d'investir dans l'UX de cet admin.
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Commune, Media, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("username", "email", "role", "is_staff")
    list_filter = ("role", "is_staff", "is_superuser", "is_active")
    search_fields = ("username", "email", "first_name", "last_name", "phone")

    fieldsets = DjangoUserAdmin.fieldsets + (
        (
            "geoclicMédia",
            {"fields": ("role", "phone", "avatar", "is_email_verified")},
        ),
    )
    add_fieldsets = DjangoUserAdmin.add_fieldsets + (
        (
            "geoclicMédia",
            {"fields": ("role", "email")},
        ),
    )


@admin.register(Commune)
class CommuneAdmin(admin.ModelAdmin):
    list_display = ("name", "insee_code", "department", "is_active", "sort_order")
    list_filter = ("department", "is_active")
    search_fields = ("name", "insee_code")
    prepopulated_fields = {"slug": ("name",)}
    ordering = ("sort_order", "name")


@admin.register(Media)
class MediaAdmin(admin.ModelAdmin):
    list_display = ("title", "file", "credit", "uploaded_by", "created_at")
    search_fields = ("title", "alt_text", "credit")
    raw_id_fields = ("uploaded_by",)
    readonly_fields = ("created_at",)

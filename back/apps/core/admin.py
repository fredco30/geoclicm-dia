"""Admin Django pour les modèles core."""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("username", "email", "first_name", "last_name", "role", "is_staff")
    list_filter = ("role", "is_staff", "is_superuser", "is_active", "is_email_verified")
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

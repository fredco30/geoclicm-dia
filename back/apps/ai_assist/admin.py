"""Django Admin pour consultation des générations IA (debug + qualité)."""
from django.contrib import admin

from .models import AIGeneration


@admin.register(AIGeneration)
class AIGenerationAdmin(admin.ModelAdmin):
    list_display = (
        "created_at", "user", "endpoint", "model", "status",
        "tokens_in", "tokens_out", "cost_eur", "duration_ms", "is_flagged",
    )
    list_filter = ("status", "endpoint", "model", "is_flagged")
    search_fields = ("user__username", "user__email", "prompt", "response")
    readonly_fields = (
        "user", "endpoint", "model", "status",
        "prompt", "response", "error_message",
        "tokens_in", "tokens_out", "cost_eur",
        "duration_ms", "created_at",
    )
    list_editable = ("is_flagged",)
    list_per_page = 50

    def has_add_permission(self, request) -> bool:
        # Les générations sont créées par le service, jamais à la main
        return False

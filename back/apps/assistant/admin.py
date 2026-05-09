"""
Admin Django — vue de relecture des conversations pour quality control.

Permet à Fred / la rédactrice de relire les 50 dernières conversations
et de désactiver des chunks fautifs si l'IA hallucinait.
"""
from django.contrib import admin

from .models import (
    AssistantConversation,
    AssistantMessage,
    CrawlSource,
    KnowledgeChunk,
)


class AssistantMessageInline(admin.TabularInline):
    model = AssistantMessage
    extra = 0
    readonly_fields = (
        "role", "content", "citations",
        "cost_tokens_in", "cost_tokens_out", "created_at",
    )
    can_delete = False
    show_change_link = True

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(AssistantConversation)
class AssistantConversationAdmin(admin.ModelAdmin):
    list_display = (
        "id", "session_id_short", "language",
        "message_count", "started_at", "last_message_at",
    )
    list_filter = ("language",)
    search_fields = ("session_id",)
    readonly_fields = (
        "session_id", "language", "started_at",
        "last_message_at", "message_count",
    )
    inlines = (AssistantMessageInline,)

    @admin.display(description="Session")
    def session_id_short(self, obj):
        return obj.session_id[:12] + "…"


@admin.register(AssistantMessage)
class AssistantMessageAdmin(admin.ModelAdmin):
    list_display = ("id", "conversation", "role", "preview", "created_at")
    list_filter = ("role",)
    search_fields = ("content",)
    readonly_fields = (
        "conversation", "role", "content", "citations",
        "cost_tokens_in", "cost_tokens_out", "created_at",
    )

    @admin.display(description="Aperçu")
    def preview(self, obj):
        return (obj.content or "")[:80]


@admin.register(KnowledgeChunk)
class KnowledgeChunkAdmin(admin.ModelAdmin):
    list_display = (
        "title", "source_kind", "commune", "is_premium", "is_active", "indexed_at",
    )
    list_filter = ("source_kind", "is_premium", "is_active", "commune")
    list_editable = ("is_active",)
    search_fields = ("title", "content", "source_id", "source_url")
    readonly_fields = ("indexed_at",)
    fieldsets = (
        ("Source", {
            "fields": ("source_kind", "source_id", "source_url", "title"),
        }),
        ("Contenu indexé", {
            "fields": ("content", "embedding"),
        }),
        ("Classification", {
            "fields": ("commune", "is_premium", "is_active", "indexed_at"),
        }),
    )


@admin.register(CrawlSource)
class CrawlSourceAdmin(admin.ModelAdmin):
    list_display = (
        "label", "kind", "commune", "is_active",
        "last_crawled_at", "last_status",
    )
    list_filter = ("kind", "is_active", "last_status", "commune")
    list_editable = ("is_active",)
    search_fields = ("label", "seed_url")
    readonly_fields = ("last_crawled_at", "last_status", "last_error",
                       "created_at", "updated_at")

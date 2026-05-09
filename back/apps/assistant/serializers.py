"""
Sérialiseurs DRF pour l'API assistant.

- Endpoint public POST /assistant/ask/ : Ask + AskResponse.
- Endpoint admin CRUD /admin/crawl-sources/ : CrawlSourceAdminSerializer.
"""
from __future__ import annotations

from rest_framework import serializers

from .models import CrawlSource, KnowledgeChunk


SUPPORTED_LANGS = ["fr", "en", "de", "it", "es", "nl"]


class AskRequestSerializer(serializers.Serializer):
    question = serializers.CharField(min_length=2, max_length=500)
    session_id = serializers.CharField(min_length=8, max_length=64)
    language = serializers.ChoiceField(
        choices=SUPPORTED_LANGS,
        default="fr",
        help_text="Langue préférée. Mistral détecte aussi automatiquement.",
    )
    commune_slug = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=120,
        help_text="Si renseigné, biaise la recherche vers les chunks de cette commune.",
    )


class CitationSerializer(serializers.Serializer):
    chunk_id = serializers.IntegerField()
    title = serializers.CharField()
    source_url = serializers.URLField(allow_blank=True)
    source_kind = serializers.CharField()
    is_premium = serializers.BooleanField()


class AskResponseSerializer(serializers.Serializer):
    answer = serializers.CharField()
    citations = CitationSerializer(many=True)
    session_id = serializers.CharField()
    language = serializers.CharField()


# ============================================================================
# Admin — CrawlSource (UI back-office Next custom)
# ============================================================================


class CrawlSourceAdminSerializer(serializers.ModelSerializer):
    """Sérialiseur CRUD admin pour gérer les sites à crawler.

    Expose en plus : kind_label, commune_name, chunk_count (calculé à
    chaque retrieve). Tous les champs status sont read-only — modifiés
    uniquement par les tâches de crawl côté serveur.
    """

    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    commune_name = serializers.CharField(
        source="commune.name", read_only=True, default=None,
    )
    commune_slug = serializers.CharField(
        source="commune.slug", read_only=True, default=None,
    )
    chunk_count = serializers.SerializerMethodField()

    class Meta:
        model = CrawlSource
        fields = (
            "id", "label", "kind", "kind_label",
            "seed_url", "max_depth", "is_active",
            "commune", "commune_name", "commune_slug",
            "last_crawled_at", "last_status", "last_error",
            "chunk_count",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "kind_label", "commune_name", "commune_slug",
            "last_crawled_at", "last_status", "last_error",
            "chunk_count",
            "created_at", "updated_at",
        )

    def get_chunk_count(self, obj: CrawlSource) -> int:
        """Nb de KnowledgeChunk actifs produits par cette source."""
        return KnowledgeChunk.objects.filter(
            source_kind=obj.kind,
            source_id__startswith=f"src{obj.id}:",
            is_active=True,
        ).count()

    def validate_seed_url(self, value: str) -> str:
        if not value.startswith(("http://", "https://")):
            raise serializers.ValidationError(
                "L'URL doit commencer par http:// ou https://"
            )
        return value.rstrip("/")

    def validate_max_depth(self, value: int) -> int:
        if value < 0 or value > 4:
            raise serializers.ValidationError(
                "max_depth doit être entre 0 et 4 (4 = très long, déconseillé)."
            )
        return value

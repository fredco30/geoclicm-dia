"""
Sérialiseurs DRF pour l'API assistant.

Volontairement simples : un seul endpoint POST /assistant/ask/, body et
réponse plats. Pas de gestion des conversations en base depuis le client
— le session_id est généré côté front et envoyé à chaque requête.
"""
from __future__ import annotations

from rest_framework import serializers


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

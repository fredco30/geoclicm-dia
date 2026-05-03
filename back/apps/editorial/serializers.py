"""
Sérialiseurs DRF pour les modèles editorial.

Trois niveaux d'expo :
- *ListSerializer  : champs minimaux pour les listings (rapide, lite payload)
- *DetailSerializer : tous les champs publics
- *WriteSerializer  : pour POST/PATCH depuis le back-office (validations métier)
"""
from __future__ import annotations

from rest_framework import serializers

from apps.core.models import Commune, Media, User
from apps.core.services.images import get_resized_url

from .models import Article, Category, Tag


# ============================================================================
# Helpers
# ============================================================================

class ImageVariantsField(serializers.Field):
    """Renvoie un dict {thumbnail, medium, large, original} d'URLs absolues.

    Utilise request.build_absolute_uri pour préfixer le scheme + host (utile
    quand le front et le back sont sur des origins différents — dev local,
    cross-domain, etc.).
    """

    def to_representation(self, value):
        if not value or not value.name:
            return None
        request = self.context.get("request") if hasattr(self, "context") else None

        def absolutize(url: str | None) -> str | None:
            if not url:
                return None
            if request is not None:
                return request.build_absolute_uri(url)
            return url

        return {
            "thumbnail": absolutize(get_resized_url(value, "thumbnail")),
            "medium": absolutize(get_resized_url(value, "medium")),
            "large": absolutize(get_resized_url(value, "large")),
            "original": absolutize(value.url),
        }


# ============================================================================
# Core (lecture seule depuis API publique)
# ============================================================================

class CommuneSerializer(serializers.ModelSerializer):
    cover_image = ImageVariantsField(read_only=True)

    class Meta:
        model = Commune
        fields = (
            "id", "name", "slug", "insee_code", "postal_codes", "department",
            "intercommunalite", "short_description", "description",
            "cover_image", "is_active", "sort_order",
        )


class MediaSerializer(serializers.ModelSerializer):
    file = ImageVariantsField(read_only=True)

    class Meta:
        model = Media
        fields = (
            "id", "file", "title", "alt_text", "caption", "credit",
            "taken_at", "created_at",
        )


class AuthorSerializer(serializers.ModelSerializer):
    """Auteur d'article — minimal et public (pas d'email)."""

    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "full_name", "avatar")

    def get_full_name(self, obj: User) -> str:
        return obj.get_full_name() or obj.username


# ============================================================================
# Editorial — lecture
# ============================================================================

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "slug", "description", "color", "icon", "sort_order")


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tag
        fields = ("id", "name", "slug")


class ArticleListSerializer(serializers.ModelSerializer):
    """Listing — payload léger."""

    category = CategorySerializer(read_only=True)
    commune = serializers.StringRelatedField(read_only=True)
    cover_image = ImageVariantsField(read_only=True)
    author = AuthorSerializer(read_only=True)

    class Meta:
        model = Article
        fields = (
            "id", "title", "slug", "chapeau", "cover_image",
            "category", "commune", "article_type", "is_featured",
            "status", "author", "published_at", "updated_at",
        )


class ArticleDetailSerializer(serializers.ModelSerializer):
    """Détail public d'un article."""

    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    commune = CommuneSerializer(read_only=True)
    cover_image = ImageVariantsField(read_only=True)
    gallery = MediaSerializer(many=True, read_only=True)
    author = AuthorSerializer(read_only=True)

    class Meta:
        model = Article
        fields = (
            "id", "title", "slug", "chapeau", "body",
            "cover_image", "gallery",
            "category", "tags", "article_type",
            "commune", "location",
            "status", "is_featured", "author", "published_at",
            "sponsor_disclosure",
            "meta_title", "meta_description",
            "view_count",
            "created_at", "updated_at",
        )


# ============================================================================
# Editorial — écriture (back-office custom)
# ============================================================================

class ArticleWriteSerializer(serializers.ModelSerializer):
    """
    Sérialiseur d'écriture pour le back-office custom.

    L'auteur est forcé à l'utilisateur courant côté ViewSet (perform_create).
    Les champs facebook_* / view_count sont read-only (gérés en interne).
    """

    class Meta:
        model = Article
        fields = (
            "id", "title", "slug", "chapeau", "body",
            "cover_image", "gallery",
            "category", "tags", "article_type",
            "commune", "location",
            "status", "is_featured", "published_at",
            "auto_publish_to_facebook",
            "sponsor_data", "sponsor_disclosure",
            "meta_title", "meta_description",
        )
        read_only_fields = ("id",)

    def validate_chapeau(self, value: str) -> str:
        if value and len(value) > 300:
            raise serializers.ValidationError("Le chapeau ne peut pas dépasser 300 caractères.")
        return value

    def validate(self, data):
        # Si on tente de publier sans corps, on refuse
        if data.get("status") == Article.Status.PUBLISHED and not data.get("body", "").strip():
            raise serializers.ValidationError(
                {"body": "Un article publié doit avoir un corps non vide."}
            )
        return data

"""
Serializers Tile — séparation lecture publique / écriture admin.

- TilePublicSerializer : lecture, utilisée par l'API publique. Pas de
  champs internes, expose les sous-tuiles imbriquées.
- TileAdminSerializer  : CRUD complet pour le back-office admin.
"""
from __future__ import annotations

from rest_framework import serializers

from apps.core.models import Commune

from .models import Tile


class CommuneMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Commune
        fields = ("id", "name", "slug")


class TileChildPublicSerializer(serializers.ModelSerializer):
    """Sérialiseur sous-tuile public, sans recursion infinie."""

    target_url = serializers.CharField(read_only=True)

    class Meta:
        model = Tile
        fields = (
            "id", "label", "icon", "color", "cover_image",
            "kind", "internal_path", "external_url", "module_key",
            "sort_order", "is_active", "span_2x", "target_url",
        )


class TilePublicSerializer(serializers.ModelSerializer):
    """Sérialiseur public — utilisé par la home et la page commune."""

    children = TileChildPublicSerializer(many=True, read_only=True)
    target_url = serializers.CharField(read_only=True)
    has_children = serializers.BooleanField(read_only=True)
    visible_on_communes = CommuneMiniSerializer(many=True, read_only=True)

    class Meta:
        model = Tile
        fields = (
            "id", "label", "icon", "color", "cover_image",
            "kind", "internal_path", "external_url", "module_key",
            "sort_order", "is_active", "show_on_home", "span_2x",
            "visible_on_communes", "target_url", "has_children", "children",
        )


class TileAdminSerializer(serializers.ModelSerializer):
    """Sérialiseur admin — CRUD complet."""

    target_url = serializers.CharField(read_only=True)
    has_children = serializers.BooleanField(read_only=True)
    parent_label = serializers.CharField(
        source="parent.label", read_only=True, default=None,
    )
    visible_on_communes_detail = CommuneMiniSerializer(
        source="visible_on_communes", many=True, read_only=True,
    )

    class Meta:
        model = Tile
        fields = (
            "id", "parent", "parent_label",
            "label", "icon", "color", "cover_image",
            "kind", "internal_path", "external_url", "module_key",
            "sort_order", "is_active", "show_on_home",
            "visible_on_communes", "visible_on_communes_detail",
            "span_2x", "target_url", "has_children",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "parent_label", "visible_on_communes_detail",
            "target_url", "has_children", "created_at", "updated_at",
        )

    def validate(self, attrs):
        """Vérifie la cohérence kind / champs cibles."""
        kind = attrs.get("kind", getattr(self.instance, "kind", None))
        if kind == Tile.Kind.INTERNAL_ROUTE:
            internal = attrs.get(
                "internal_path",
                getattr(self.instance, "internal_path", ""),
            )
            if not internal:
                raise serializers.ValidationError({
                    "internal_path": "Chemin interne requis pour kind=internal_route.",
                })
        elif kind == Tile.Kind.EXTERNAL_URL:
            external = attrs.get(
                "external_url",
                getattr(self.instance, "external_url", ""),
            )
            if not external:
                raise serializers.ValidationError({
                    "external_url": "URL externe requise pour kind=external_url.",
                })
        elif kind == Tile.Kind.MODULE:
            mk = attrs.get(
                "module_key",
                getattr(self.instance, "module_key", ""),
            )
            if not mk:
                raise serializers.ValidationError({
                    "module_key": "Module requis pour kind=module.",
                })

        # Une sous-tuile ne peut pas avoir de sous-sous-tuiles
        # (max 1 niveau de profondeur).
        parent = attrs.get("parent", getattr(self.instance, "parent", None))
        if parent and parent.parent_id is not None:
            raise serializers.ValidationError({
                "parent": "Profondeur maximum atteinte (1 niveau de sous-tuile).",
            })

        return attrs

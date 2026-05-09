"""
Serializers pour la rubrique Pratique.

- UsefulContactPublicSerializer : lecture publique, sans champs internes.
- UsefulContactAdminSerializer : CRUD complet pour le back-office.
"""
from __future__ import annotations

from rest_framework import serializers

from .models import UsefulContact


class UsefulContactPublicSerializer(serializers.ModelSerializer):
    """Lecture publique pour /numeros-utiles et /demarches."""

    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    contact_type_label = serializers.CharField(
        source="get_contact_type_display", read_only=True,
    )
    commune_slug = serializers.CharField(
        source="commune.slug", read_only=True, default=None,
    )
    commune_name = serializers.CharField(
        source="commune.name", read_only=True, default=None,
    )

    class Meta:
        model = UsefulContact
        fields = (
            "id", "kind", "kind_label",
            "label", "contact_type", "contact_type_label", "value",
            "description", "category_label",
            "commune_slug", "commune_name",
            "sort_order",
        )


class UsefulContactAdminSerializer(serializers.ModelSerializer):
    """CRUD admin pour la page back-office /admin/utility."""

    kind_label = serializers.CharField(source="get_kind_display", read_only=True)
    contact_type_label = serializers.CharField(
        source="get_contact_type_display", read_only=True,
    )
    commune_name = serializers.CharField(
        source="commune.name", read_only=True, default=None,
    )

    class Meta:
        model = UsefulContact
        fields = (
            "id",
            "kind", "kind_label",
            "label", "contact_type", "contact_type_label", "value",
            "description", "category_label",
            "commune", "commune_name",
            "sort_order", "is_active",
            "created_at", "updated_at",
        )
        read_only_fields = (
            "id", "kind_label", "contact_type_label", "commune_name",
            "created_at", "updated_at",
        )

    def validate(self, attrs):
        """Validation de cohérence type / valeur."""
        contact_type = attrs.get(
            "contact_type",
            getattr(self.instance, "contact_type", None),
        )
        value = attrs.get("value", getattr(self.instance, "value", "")).strip()

        if not value:
            raise serializers.ValidationError({"value": "La valeur est requise."})

        if contact_type == UsefulContact.ContactType.URL:
            if not value.startswith(("http://", "https://")):
                raise serializers.ValidationError({
                    "value": "Une URL doit commencer par http:// ou https://",
                })
        elif contact_type == UsefulContact.ContactType.EMAIL:
            if "@" not in value:
                raise serializers.ValidationError({
                    "value": "Email invalide (manque @).",
                })

        return attrs

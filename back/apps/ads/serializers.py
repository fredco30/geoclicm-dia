"""
Sérialiseurs DRF pour ads.

Trois niveaux :
- AdCampaignList/Detail/Write : back-office (CRUD admin)
- AdServeSerializer : payload public minimal renvoyé par /api/ads/serve/
"""
from __future__ import annotations

from rest_framework import serializers

from apps.editorial.serializers import ImageVariantsField

from .models import AdCampaign


class AdCampaignListSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source="business.name", read_only=True)
    placement_label = serializers.CharField(
        source="get_placement_display", read_only=True
    )
    image = ImageVariantsField(read_only=True)
    click_through_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = AdCampaign
        fields = (
            "id", "name", "business", "business_name",
            "placement", "placement_label",
            "image", "starts_at", "ends_at",
            "is_active", "is_paid",
            "impression_count", "click_count", "click_through_rate",
            "created_at",
        )


class AdCampaignDetailSerializer(serializers.ModelSerializer):
    business_name = serializers.CharField(source="business.name", read_only=True)
    placement_label = serializers.CharField(
        source="get_placement_display", read_only=True
    )
    image = ImageVariantsField(read_only=True)
    click_through_rate = serializers.FloatField(read_only=True)

    class Meta:
        model = AdCampaign
        fields = (
            "id", "name", "business", "business_name",
            "placement", "placement_label",
            "image", "headline", "cta_text", "target_url",
            "target_communes", "target_categories",
            "starts_at", "ends_at",
            "price_paid",
            "impression_count", "click_count", "click_through_rate",
            "is_active", "is_paid",
            "created_at", "updated_at",
        )


class AdCampaignWriteSerializer(serializers.ModelSerializer):
    """Sérialiseur d'écriture admin — accepte multipart pour l'upload image."""

    class Meta:
        model = AdCampaign
        fields = (
            "id", "name", "business",
            "placement",
            "image", "headline", "cta_text", "target_url",
            "target_communes", "target_categories",
            "starts_at", "ends_at",
            "price_paid",
            "is_active", "is_paid",
        )
        read_only_fields = ("id",)

    def validate(self, data):
        starts = data.get("starts_at") or (
            self.instance.starts_at if self.instance else None
        )
        ends = data.get("ends_at") or (
            self.instance.ends_at if self.instance else None
        )
        if starts and ends and ends <= starts:
            raise serializers.ValidationError(
                {"ends_at": "La date de fin doit être postérieure au début."}
            )
        return data


class AdCampaignAdvertiserWriteSerializer(AdCampaignWriteSerializer):
    """
    Sérialiseur d'écriture pour l'espace annonceur self-service.

    Différences vs AdCampaignWriteSerializer (admin) :
    - Pas de is_paid (workflow paiement géré par admin / Stripe)
    - Pas de is_active (équipe geoclicMédia valide la campagne avant
      diffusion publique)
    - Pas de target_communes / target_categories (ciblage sensible —
      admin valide ; en v1 phase pilote tous les commerçants ciblent
      tout, raffinement plus tard)
    - Pas de price_paid (calculé selon plan + emplacement, pas saisi
      directement par l'annonceur)
    - business : forcé par la vue à un Business dont owner=user
    """

    class Meta(AdCampaignWriteSerializer.Meta):
        fields = (
            "id", "name", "business",
            "placement",
            "image", "headline", "cta_text", "target_url",
            "starts_at", "ends_at",
        )


class AdServeSerializer(serializers.ModelSerializer):
    """
    Payload public minimal pour rendu d'un encart publicitaire.

    Pas de stats internes, pas de Stripe, pas de prix. Juste ce qu'il faut
    pour afficher l'encart côté front + suivre le clic.
    """

    image = ImageVariantsField(read_only=True)
    business_slug = serializers.CharField(source="business.slug", read_only=True)
    business_name = serializers.CharField(source="business.name", read_only=True)
    # URL de redirection trackée (pas l'URL cible directe — passe par /r/<id>/
    # pour incrémenter click_count avant redirect)
    click_url = serializers.SerializerMethodField()

    class Meta:
        model = AdCampaign
        fields = (
            "id", "placement", "image",
            "headline", "cta_text",
            "click_url",
            "business_slug", "business_name",
        )

    def get_click_url(self, obj: AdCampaign) -> str:
        return f"/r/{obj.id}/"

"""Serializers DRF pour les endpoints ai_assist."""
from __future__ import annotations

from rest_framework import serializers

from apps.core.models import Commune
from apps.directory.models import Business, Category as BusinessCategory


# ============================================================================
# Business — génération de fiche assistée
# ============================================================================


class BusinessDescribeRequestSerializer(serializers.Serializer):
    """
    Input du POST /api/ai-assist/business/describe/.

    Deux modes d'utilisation :
    - **Pré-création** : l'annonceur n'a pas encore de fiche, il fournit
      `name`, `category_id`, `commune_id` et `keywords` pour décrire
      son commerce. L'IA génère un brouillon complet à appliquer.
    - **Complétion** : l'annonceur a déjà une fiche partiellement
      remplie, il fournit `business_id`. L'IA repart des données
      existantes et génère ce qui manque.
    """

    # Mode 1 : pré-création
    name = serializers.CharField(
        required=False, allow_blank=True, max_length=200,
        help_text="Nom du commerce. Requis en mode pré-création.",
    )
    category_id = serializers.IntegerField(
        required=False, allow_null=True,
        help_text="ID de la catégorie principale. Requis en mode pré-création.",
    )
    commune_id = serializers.IntegerField(
        required=False, allow_null=True,
        help_text="ID de la commune. Requis en mode pré-création.",
    )
    keywords = serializers.ListField(
        child=serializers.CharField(max_length=80),
        required=False,
        max_length=10,
        help_text="3 à 10 mots-clés que l'annonceur veut voir évoqués "
                  "dans la fiche.",
    )

    # Mode 2 : complétion d'une fiche existante
    business_id = serializers.IntegerField(
        required=False, allow_null=True,
        help_text="ID d'un Business existant. Si fourni, on ignore les "
                  "champs name/category/commune (on les lit depuis le "
                  "business).",
    )

    # Optionnel : ton souhaité (défaut : pro chaleureux)
    tone = serializers.ChoiceField(
        choices=["pro", "friendly", "concise"],
        default="pro",
        required=False,
        help_text="Tonalité de la rédaction. 'pro' par défaut (chaleureux "
                  "mais professionnel), 'friendly' (plus convivial), "
                  "'concise' (factuel court).",
    )

    def validate(self, attrs):
        """Vérifie qu'on a soit business_id soit (name + category)."""
        has_business = bool(attrs.get("business_id"))
        has_name = bool((attrs.get("name") or "").strip())
        has_category = bool(attrs.get("category_id"))

        if not has_business and not (has_name and has_category):
            raise serializers.ValidationError(
                "Fournir soit `business_id`, soit la combinaison "
                "`name` + `category_id` (et idéalement `commune_id`)."
            )

        # Si pré-création : valider que les FKs existent
        if not has_business:
            try:
                BusinessCategory.objects.get(pk=attrs["category_id"])
            except BusinessCategory.DoesNotExist:
                raise serializers.ValidationError({
                    "category_id": "Catégorie introuvable.",
                })
            commune_id = attrs.get("commune_id")
            if commune_id:
                try:
                    Commune.objects.get(pk=commune_id)
                except Commune.DoesNotExist:
                    raise serializers.ValidationError({
                        "commune_id": "Commune introuvable.",
                    })

        # Si complétion : valider l'existence + permission
        if has_business:
            try:
                business = Business.objects.get(pk=attrs["business_id"])
            except Business.DoesNotExist:
                raise serializers.ValidationError({
                    "business_id": "Fiche introuvable.",
                })
            request = self.context.get("request")
            if request and not _can_use_for_business(request.user, business):
                raise serializers.ValidationError({
                    "business_id": "Vous n'êtes pas propriétaire de cette fiche.",
                })

        return attrs


def _can_use_for_business(user, business) -> bool:
    """Vérifie qu'un user peut générer du contenu pour ce Business.

    Règle :
    - admin/editor/superuser : OK pour toutes les fiches.
    - autres rôles : OK uniquement si owner.
    """
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser or getattr(user, "role", None) in {"admin", "editor"}:
        return True
    return business.owner_id == user.id


class BusinessDescribeFaqItemSerializer(serializers.Serializer):
    q = serializers.CharField()
    a = serializers.CharField()


class BusinessDescribeResponseSerializer(serializers.Serializer):
    """
    Output : un brouillon que l'utilisateur peut appliquer en cliquant
    « Utiliser ce brouillon » côté front.
    """

    short_description = serializers.CharField()
    description = serializers.CharField()
    specialties = serializers.ListField(child=serializers.CharField())
    faq = serializers.ListField(child=BusinessDescribeFaqItemSerializer())
    # Méta-infos retournées pour transparence côté front
    model = serializers.CharField()
    cost_eur = serializers.DecimalField(max_digits=10, decimal_places=6)
    generation_id = serializers.IntegerField()

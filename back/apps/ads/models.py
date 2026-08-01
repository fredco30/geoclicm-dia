"""
Modèles ads : AdCampaign — encarts publicitaires régie commerçants.

Une campagne = un commerçant (Business) qui paie pour afficher un encart
visuel sur un emplacement défini, pendant une période donnée, avec
un ciblage géographique (communes) ou catégoriel optionnel.

Stats agrégées (impression_count, click_count) mises à jour en temps réel
par incrément atomique côté ViewSet (pas de table d'événements détaillés
pour rester simple en v1 — affinage analytics si besoin plus tard).
"""
from __future__ import annotations

from django.db import models

from apps.core.models import Commune
from apps.directory.models import Business, BusinessCategory


class AdCampaign(models.Model):
    class Placement(models.TextChoices):
        HOME_HERO = "home_hero", "Page d'accueil — Hero"
        HOME_SIDEBAR = "home_sidebar", "Page d'accueil — Sidebar"
        ARTICLE_INLINE = "article_inline", "Article — Inline"
        ARTICLE_SIDEBAR = "article_sidebar", "Article — Sidebar"
        DIRECTORY_TOP = "directory_top", "Annuaire — Top"
        DIRECTORY_INLINE = "directory_inline", "Annuaire — Inline"
        AGENDA_TOP = "agenda_top", "Agenda — Top"
        AGENDA_FEATURED = "agenda_featured", "Agenda — À la une"
        WEATHER_TOP = "weather_top", "Météo — Top"
        WEATHER_SIDEBAR = "weather_sidebar", "Météo — Sidebar"
        NEWSLETTER = "newsletter", "Newsletter"

    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="campaigns",
    )
    name = models.CharField(
        max_length=150,
        help_text="Nom interne pour identifier la campagne (ex: 'Hipolem été 2026 — sidebar accueil')",
    )

    placement = models.CharField(
        max_length=30,
        choices=Placement.choices,
        db_index=True,
    )

    # --- Créa ---
    image = models.ImageField(upload_to="ads/")
    headline = models.CharField(
        max_length=80,
        blank=True,
        help_text="Titre court affiché sur l'encart (max 80 car).",
    )
    cta_text = models.CharField(
        max_length=30,
        blank=True,
        help_text="Texte du bouton (ex: 'Découvrir', 'Réserver').",
    )
    target_url = models.URLField(
        help_text="URL de destination quand l'utilisateur clique sur l'encart.",
    )

    # --- Mise en avant éditoriale (placement "Agenda — À la une") ---
    featured_event = models.ForeignKey(
        "events.Event",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="featured_campaigns",
        help_text=(
            "Événement mis en avant dans le bandeau 'À la une'. "
            "Vide = créa classique (image + headline). Si renseigné, le "
            "bandeau affiche la fiche de l'événement et le clic renvoie vers "
            "sa page (target_url ignorée)."
        ),
    )

    # --- Ciblage ---
    target_communes = models.ManyToManyField(
        Commune,
        blank=True,
        related_name="targeted_campaigns",
        help_text="Communes ciblées (vide = toutes).",
    )
    target_categories = models.ManyToManyField(
        BusinessCategory,
        blank=True,
        related_name="targeted_campaigns",
        help_text="Catégories ciblées (vide = toutes).",
    )

    # --- Période ---
    starts_at = models.DateTimeField(db_index=True)
    ends_at = models.DateTimeField(db_index=True)

    # --- Budget / paiement ---
    price_paid = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=0,
        help_text="Prix payé pour cette campagne (HT, en EUR).",
    )

    # --- Stats agrégées (incrémentées atomiquement par le ViewSet) ---
    impression_count = models.PositiveIntegerField(default=0)
    click_count = models.PositiveIntegerField(default=0)

    # --- Workflow ---
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Active = peut être servie. Désactiver pour suspendre temporairement.",
    )
    is_paid = models.BooleanField(
        default=False,
        help_text="Paiement reçu (pour la phase pilote gratuite, laisser à False).",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Campagne publicitaire"
        verbose_name_plural = "Campagnes publicitaires"
        ordering = ["-starts_at"]
        indexes = [
            models.Index(fields=["placement", "is_active", "starts_at", "ends_at"],
                         name="ads_serve_lookup_idx"),
            models.Index(fields=["business", "-starts_at"],
                         name="ads_business_idx"),
        ]

    def __str__(self) -> str:
        return f"{self.name} — {self.get_placement_display()}"

    @property
    def click_through_rate(self) -> float:
        """CTR en % (clicks / impressions). 0 si pas d'impression."""
        if self.impression_count == 0:
            return 0.0
        return round(100 * self.click_count / self.impression_count, 2)

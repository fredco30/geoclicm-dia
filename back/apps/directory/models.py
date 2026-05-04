"""
Modèles directory : BusinessCategory (hiérarchique) + Business.

Tous les champs Stripe / abonnement sont créés dès maintenant (vides) pour
éviter une migration pénible à l'activation Stripe (Lot E). En phase pilote
été 2026 : `owner=null`, `plan=free`, fiches saisies par l'admin.
"""
from __future__ import annotations

from django.contrib.gis.db import models as gis_models
from django.db import models
from django.utils.text import slugify

from apps.core.models import Commune, Media, User


class BusinessCategory(models.Model):
    """Catégorie commerçant hiérarchique (Restauration > Restaurants, etc.)."""

    name = models.CharField(max_length=80)
    slug = models.SlugField(max_length=120, unique=True)
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="children",
    )
    icon = models.CharField(
        max_length=40,
        blank=True,
        help_text="Nom d'icône Lucide (ex: 'UtensilsCrossed', 'Hotel')",
    )
    description = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)

    schema_type = models.CharField(
        max_length=50,
        default="LocalBusiness",
        help_text="Type schema.org (LocalBusiness, Restaurant, Store, LodgingBusiness...)",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Catégorie commerçant"
        verbose_name_plural = "Catégories commerçants"
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        if self.parent_id:
            return f"{self.parent.name} > {self.name}"
        return self.name

    def save(self, *args, **kwargs) -> None:
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Business(models.Model):
    """Fiche commerçant — annuaire + base de la régie pub."""

    class Plan(models.TextChoices):
        FREE = "free", "Gratuit"
        BASIC = "basic", "Basic"
        PREMIUM = "premium", "Premium"

    # --- Identité ---
    name = models.CharField(max_length=150)
    slug = models.SlugField(max_length=180, unique=True)
    legal_name = models.CharField(max_length=200, blank=True)
    siret = models.CharField(max_length=14, blank=True)

    # --- Classification ---
    category = models.ForeignKey(
        BusinessCategory,
        on_delete=models.PROTECT,
        related_name="businesses",
    )
    secondary_categories = models.ManyToManyField(
        BusinessCategory,
        related_name="secondary_businesses",
        blank=True,
    )

    # --- Descriptions ---
    short_description = models.CharField(max_length=200)
    description = models.TextField()
    specialties = models.JSONField(default=list, blank=True)

    # --- Médias ---
    logo = models.ImageField(upload_to="businesses/logos/", blank=True, null=True)
    cover_image = models.ImageField(upload_to="businesses/covers/", blank=True, null=True)
    photos = models.ManyToManyField(Media, blank=True, related_name="businesses")

    # --- Localisation ---
    address = models.CharField(max_length=255)
    address_complement = models.CharField(max_length=255, blank=True)
    postal_code = models.CharField(max_length=10)
    city = models.CharField(max_length=100)
    location = gis_models.PointField(srid=4326, null=True, blank=True)
    commune = models.ForeignKey(
        Commune,
        on_delete=models.PROTECT,
        related_name="businesses",
        help_text="Commune où est physiquement implanté le commerce (géoloc).",
    )
    service_areas = models.ManyToManyField(
        Commune,
        related_name="serving_businesses",
        blank=True,
        help_text="Zones supplémentaires desservies (artisans multi-communes, services à domicile…).",
    )

    # --- Contact ---
    phone = models.CharField(max_length=20, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)

    # --- Réseaux sociaux ---
    facebook_url = models.URLField(blank=True)
    instagram_url = models.URLField(blank=True)
    tiktok_url = models.URLField(blank=True)

    # --- Horaires ---
    opening_hours = models.JSONField(default=dict, blank=True)
    seasonal_closures = models.JSONField(default=list, blank=True)

    # --- Modèle commercial ---
    plan = models.CharField(
        max_length=20,
        choices=Plan.choices,
        default=Plan.FREE,
        db_index=True,
    )
    plan_starts_at = models.DateTimeField(null=True, blank=True)
    plan_ends_at = models.DateTimeField(null=True, blank=True)
    stripe_customer_id = models.CharField(max_length=100, blank=True)
    stripe_subscription_id = models.CharField(max_length=100, blank=True)

    # --- Liaison utilisateur (rempli au Lot D quand le commerçant s'inscrit) ---
    owner = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="businesses",
    )
    is_claimed = models.BooleanField(default=False)

    # --- Workflow ---
    is_published = models.BooleanField(default=False, db_index=True)
    is_featured = models.BooleanField(default=False)

    # --- SEO ---
    meta_description = models.CharField(max_length=160, blank=True)

    # --- Stats ---
    view_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Commerçant"
        verbose_name_plural = "Commerçants"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["commune", "category"], name="biz_commune_cat_idx"),
            models.Index(fields=["is_published", "plan"], name="biz_pub_plan_idx"),
            models.Index(fields=["plan", "plan_ends_at"], name="biz_plan_end_idx"),
        ]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs) -> None:
        if not self.slug:
            self.slug = slugify(self.name)[:180]
        super().save(*args, **kwargs)

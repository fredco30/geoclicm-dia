"""Modèles listings : petites annonces datées (emploi, locations annuelles...).

Une annonce est un contenu éphémère (date d'expiration), distinct de
l'Agenda (événements), de Découvrir (lieux pérennes) et de l'annuaire
Commerçants (fiches établies). Deux modes d'alimentation :
- automatique via la passe IA multi-catégories (crawl), candidat à valider ;
- manuel via l'admin (ex : offres/demandes locatives annuelles).

Règle inchangée : validation humaine avant toute publication automatique.
"""
from __future__ import annotations

from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from apps.core.models import Commune, User


class ListingCategory(models.Model):
    """Catégorie d'annonce (Offres d'emploi, Locations annuelles...)."""

    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(
        max_length=50,
        blank=True,
        help_text="Nom d'icône Lucide (ex: 'Briefcase', 'House').",
    )
    sort_order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ("sort_order", "name")
        verbose_name = "Catégorie d'annonce"
        verbose_name_plural = "Catégories d'annonces"

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs) -> None:
        if not self.slug:
            self.slug = slugify(self.name)[:100]
        super().save(*args, **kwargs)


class Listing(models.Model):
    """Annonce publiée (emploi, location annuelle...), avec expiration."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Brouillon"
        PUBLISHED = "published", "Publiée"
        EXPIRED = "expired", "Expirée"
        ARCHIVED = "archived", "Archivée"

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    short_description = models.CharField(max_length=240)
    description = models.TextField()

    category = models.ForeignKey(
        ListingCategory,
        on_delete=models.PROTECT,
        related_name="listings",
    )
    commune = models.ForeignKey(
        Commune,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="listings",
        help_text="Commune concernée ; NULL = annonce intercommunale.",
    )
    locality = models.CharField(
        max_length=120,
        blank=True,
        help_text="Localité brute si la commune n'est pas résolue "
                  "(ex: « Terre de Camargue »).",
    )
    address = models.CharField(max_length=255, blank=True)

    # --- Détails d'annonce (champs libres, tout est optionnel) ---
    employer_or_agency = models.CharField(
        max_length=150,
        blank=True,
        help_text="Employeur, agence ou contact affiché.",
    )
    contract_type = models.CharField(
        max_length=80,
        blank=True,
        help_text="Type de contrat (CDI, CDD, saisonnier...) ou de bail.",
    )
    price = models.CharField(
        max_length=100,
        blank=True,
        help_text="Salaire, loyer ou prix affiché (texte libre).",
    )

    # --- Contact ---
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    application_url = models.URLField(
        max_length=1000,
        blank=True,
        help_text="Lien pour postuler ou voir l'annonce d'origine.",
    )
    source_url = models.URLField(max_length=1000, blank=True)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        db_index=True,
        help_text="Date de fin de validité ; l'annonce bascule en expirée.",
    )

    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_listings",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("-published_at", "title")
        indexes = [
            models.Index(fields=("status", "category"), name="listing_status_cat_idx"),
            models.Index(fields=("status", "expires_at"), name="listing_expiry_idx"),
        ]
        verbose_name = "Annonce"
        verbose_name_plural = "Annonces"

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs) -> None:
        if not self.slug:
            self.slug = slugify(self.title)[:220]
        if self.status == self.Status.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)


class ListingImportCandidate(models.Model):
    """Annonce structurée en attente de validation (miroir Découvrir/Commerçants).

    Produit par la passe IA multi-catégories sur le corpus crawlé. Aucune
    publication automatique : un humain valide chaque candidat.
    """

    class ExtractionMethod(models.TextChoices):
        AI = "ai", "Extraction IA à valider"
        JSON_LD = "json_ld", "JSON-LD officiel"

    class Status(models.TextChoices):
        PENDING = "pending", "À vérifier"
        IMPORTED = "imported", "Importée"
        REJECTED = "rejected", "Rejetée"
        DUPLICATE = "duplicate", "Doublon"
        INVALID = "invalid", "Incomplète"

    crawl_source = models.ForeignKey(
        "assistant.CrawlSource",
        on_delete=models.CASCADE,
        related_name="listing_import_candidates",
    )
    source_uid = models.CharField(max_length=240)
    extraction_method = models.CharField(
        max_length=20,
        choices=ExtractionMethod.choices,
        default=ExtractionMethod.AI,
        db_index=True,
    )
    source_url = models.URLField(max_length=1000)
    raw_payload = models.JSONField(default=dict, blank=True)
    fingerprint = models.CharField(max_length=64, db_index=True)

    title = models.CharField(max_length=200)
    short_description = models.CharField(max_length=240, blank=True)
    description = models.TextField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    locality = models.CharField(max_length=120, blank=True)
    employer_or_agency = models.CharField(max_length=150, blank=True)
    contract_type = models.CharField(max_length=80, blank=True)
    price = models.CharField(max_length=100, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    application_url = models.URLField(max_length=1000, blank=True)
    published_on_source_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    commune = models.ForeignKey(
        Commune,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="listing_import_candidates",
    )
    category = models.ForeignKey(
        ListingCategory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="import_candidates",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    validation_errors = models.JSONField(default=list, blank=True)
    matched_listing = models.ForeignKey(
        Listing,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="import_candidates",
    )
    first_seen_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)
    imported_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["status", "title"]
        constraints = [
            models.UniqueConstraint(
                fields=["crawl_source", "source_uid"],
                name="listing_candidate_unique_source_uid",
            ),
        ]
        indexes = [
            models.Index(
                fields=["crawl_source", "status"],
                name="listing_cand_src_status_idx",
            ),
        ]
        verbose_name = "Candidat annonce"
        verbose_name_plural = "Candidats annonces"

    def __str__(self) -> str:
        return f"{self.title} [{self.crawl_source.label}]"

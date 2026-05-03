"""
Modèles editorial : Category, Tag, Article.

Champs anticipés sprints 2-4 :
- facebook_*  → publication auto Facebook (sprint 2)
- sponsor / sponsor_disclosure → article sponsorisé (sprint 3-4)
- meta_title / meta_description → SEO custom (sprint 1, déjà utiles)
- view_count → stats simples
"""
from __future__ import annotations

from django.contrib.gis.db import models as gis_models
from django.db import models
from django.urls import reverse
from django.utils import timezone
from django.utils.text import slugify

from apps.core.models import Commune, Media, User


class Category(models.Model):
    """Catégorie éditoriale (Mémoire vivante, Patrimoine, etc.)."""

    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True)
    description = models.TextField(blank=True)
    color = models.CharField(
        max_length=7, default="#1a4d6e", help_text="Couleur d'accent au format #RRGGBB"
    )
    icon = models.CharField(
        max_length=40,
        blank=True,
        help_text="Nom d'icône Lucide (ex: 'Newspaper', 'Camera')",
    )
    sort_order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Catégorie"
        verbose_name_plural = "Catégories"
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs) -> None:
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Tag(models.Model):
    """Tag transversal (sel-de-camargue, gardian, taureau-camargue, etc.)."""

    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=100, unique=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Tag"
        verbose_name_plural = "Tags"
        ordering = ["name"]

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs) -> None:
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Article(models.Model):
    """Article éditorial — corps en markdown, statut workflow."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Brouillon"
        SCHEDULED = "scheduled", "Programmé"
        PUBLISHED = "published", "Publié"
        ARCHIVED = "archived", "Archivé"

    class ArticleType(models.TextChoices):
        REPORTAGE = "reportage", "Reportage"
        PORTRAIT = "portrait", "Portrait"
        BREVE = "breve", "Brève"
        TRIBUNE = "tribune", "Tribune libre"
        DOSSIER = "dossier", "Dossier"

    # --- Contenu ---
    title = models.CharField(max_length=250)
    slug = models.SlugField(max_length=280, unique=True)
    chapeau = models.CharField(
        max_length=300, blank=True, help_text="Accroche (max 300 car.)"
    )
    body = models.TextField(help_text="Corps de l'article en markdown")

    cover_image = models.ImageField(upload_to="articles/%Y/%m/", blank=True, null=True)
    gallery = models.ManyToManyField(Media, blank=True, related_name="articles")

    # --- Catégorisation ---
    category = models.ForeignKey(
        Category, on_delete=models.PROTECT, related_name="articles"
    )
    tags = models.ManyToManyField(Tag, blank=True, related_name="articles")
    article_type = models.CharField(
        max_length=20,
        choices=ArticleType.choices,
        default=ArticleType.REPORTAGE,
        db_index=True,
    )

    # --- Géo ---
    location = gis_models.PointField(srid=4326, null=True, blank=True)
    commune = models.ForeignKey(
        Commune,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="articles",
    )

    # --- Workflow ---
    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    is_featured = models.BooleanField(
        default=False, help_text="À la une de la page d'accueil"
    )
    author = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="articles"
    )
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)

    # --- Anticipation Sprint 2 (Facebook) ---
    auto_publish_to_facebook = models.BooleanField(default=True)
    facebook_post_id = models.CharField(max_length=100, blank=True)
    facebook_published_at = models.DateTimeField(null=True, blank=True)

    # --- Anticipation Sprint 3-4 (sponsoring) ---
    # FK Business pas encore défini en sprint 1, on garde un slot via JSON
    sponsor_data = models.JSONField(
        default=dict, blank=True, help_text="Champ sponsor anticipé sprint 3-4 (FK Business à créer)"
    )
    sponsor_disclosure = models.CharField(
        max_length=200,
        blank=True,
        help_text="Mention obligatoire si sponsorisé (ex: 'En partenariat avec X')",
    )

    # --- SEO ---
    meta_title = models.CharField(max_length=70, blank=True)
    meta_description = models.CharField(max_length=160, blank=True)

    # --- Stats ---
    view_count = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Article"
        verbose_name_plural = "Articles"
        ordering = ["-published_at", "-created_at"]
        indexes = [
            models.Index(fields=["status", "-published_at"], name="article_status_pub_idx"),
            models.Index(fields=["category", "-published_at"], name="article_cat_pub_idx"),
            models.Index(fields=["commune", "-published_at"], name="article_commune_pub_idx"),
        ]

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs) -> None:
        if not self.slug:
            self.slug = slugify(self.title)[:280]
        # Auto-set published_at à la première publication
        if self.status == self.Status.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    def get_absolute_url(self) -> str:
        return reverse("articles:detail", kwargs={"slug": self.slug})

    @property
    def is_published(self) -> bool:
        return (
            self.status == self.Status.PUBLISHED
            and self.published_at is not None
            and self.published_at <= timezone.now()
        )

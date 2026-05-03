"""
Modèles core : User custom, Commune (territoire), Media (bibliothèque mutualisée).

Anticipations sprints 2-4 : champs facebook_*, sponsor, owner, plan, stripe_*
quand applicable, pour éviter migrations pénibles plus tard.
"""
from __future__ import annotations

from django.contrib.auth.models import AbstractUser
from django.contrib.gis.db import models as gis_models
from django.db import models
from django.utils.text import slugify


class User(AbstractUser):
    """Utilisateur de la plateforme avec rôles métier."""

    class Role(models.TextChoices):
        READER = "reader", "Lecteur"
        ADVERTISER = "advertiser", "Annonceur"
        EDITOR = "editor", "Rédacteur"
        ADMIN = "admin", "Administrateur"

    role = models.CharField(
        max_length=16, choices=Role.choices, default=Role.READER, db_index=True
    )
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    is_email_verified = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.get_full_name() or self.username

    @property
    def can_publish(self) -> bool:
        """Peut publier des articles (editor ou admin)."""
        return self.role in {self.Role.EDITOR, self.Role.ADMIN} or self.is_superuser


class Commune(models.Model):
    """Commune du territoire couvert."""

    name = models.CharField(max_length=120, db_index=True)
    slug = models.SlugField(max_length=140, unique=True)
    insee_code = models.CharField(max_length=5, unique=True)
    postal_codes = models.JSONField(default=list, help_text="Liste des codes postaux (JSON array)")
    department = models.CharField(
        max_length=3, db_index=True, help_text='Code département : "30" ou "34"'
    )

    location = gis_models.PointField(srid=4326, null=True, blank=True)
    bbox = gis_models.PolygonField(srid=4326, null=True, blank=True)

    description = models.TextField(blank=True)
    short_description = models.CharField(max_length=300, blank=True)
    cover_image = models.ImageField(upload_to="communes/", blank=True, null=True)

    intercommunalite = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True, db_index=True)
    sort_order = models.PositiveIntegerField(default=0, db_index=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Commune"
        verbose_name_plural = "Communes"
        ordering = ["sort_order", "name"]

    def __str__(self) -> str:
        return f"{self.name} ({self.insee_code})"

    def save(self, *args, **kwargs) -> None:
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Media(models.Model):
    """
    Bibliothèque d'images mutualisée.

    Sert pour les photos d'articles, les galleries, les couvertures de communes,
    avec métadonnées (auteur, lieu, date de prise de vue).
    """

    file = models.ImageField(upload_to="media/%Y/%m/")
    title = models.CharField(max_length=200, blank=True)
    alt_text = models.CharField(
        max_length=300, blank=True, help_text="Texte alternatif accessibilité (obligatoire pour SEO)"
    )
    caption = models.CharField(max_length=500, blank=True)
    credit = models.CharField(max_length=200, blank=True, help_text="Crédit photo (auteur, source)")

    location = gis_models.PointField(srid=4326, null=True, blank=True)
    taken_at = models.DateField(null=True, blank=True)

    uploaded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="media_uploads"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Média"
        verbose_name_plural = "Médias"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title or self.file.name

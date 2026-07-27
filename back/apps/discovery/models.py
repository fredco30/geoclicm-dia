from __future__ import annotations

from django.contrib.gis.db import models as gis_models
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from apps.core.models import Commune, Media, User


class PlaceCategory(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=7, default="#1a4d6e")
    sort_order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ("sort_order", "name")
        verbose_name = "Catégorie Découvrir"

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs) -> None:
        if not self.slug:
            self.slug = slugify(self.name)[:100]
        super().save(*args, **kwargs)


class Place(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Brouillon"
        PUBLISHED = "published", "Publié"
        ARCHIVED = "archived", "Archivé"

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    short_description = models.CharField(max_length=240)
    description = models.TextField()
    cover_image = models.ImageField(upload_to="places/%Y/%m/", blank=True, null=True)
    gallery = models.ManyToManyField(Media, blank=True, related_name="places")

    category = models.ForeignKey(PlaceCategory, on_delete=models.PROTECT, related_name="places")
    commune = models.ForeignKey(Commune, on_delete=models.PROTECT, related_name="places")
    address = models.CharField(max_length=255, blank=True)
    location = gis_models.PointField(srid=4326, null=True, blank=True)

    duration = models.CharField(max_length=80, blank=True)
    difficulty = models.CharField(max_length=80, blank=True)
    accessibility = models.TextField(blank=True)
    best_season = models.CharField(max_length=120, blank=True)
    practical_info = models.TextField(blank=True)
    official_url = models.URLField(blank=True)

    related_articles = models.ManyToManyField("editorial.Article", blank=True, related_name="related_places")
    related_businesses = models.ManyToManyField("directory.Business", blank=True, related_name="related_places")
    related_events = models.ManyToManyField("events.Event", blank=True, related_name="related_places")

    status = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT, db_index=True)
    is_featured = models.BooleanField(default=False, db_index=True)
    sort_order = models.PositiveIntegerField(default=0, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)
    meta_title = models.CharField(max_length=70, blank=True)
    meta_description = models.CharField(max_length=160, blank=True)
    created_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="created_places")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ("sort_order", "-is_featured", "title")
        indexes = [
            models.Index(fields=("status", "category"), name="place_status_cat_idx"),
            models.Index(fields=("status", "commune"), name="place_status_commune_idx"),
        ]

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs) -> None:
        if not self.slug:
            self.slug = slugify(self.title)[:220]
        if self.status == self.Status.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

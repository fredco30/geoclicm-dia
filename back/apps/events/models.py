"""Modèles Agenda : contenu Event et dates explicites EventOccurrence."""
from __future__ import annotations

from django.contrib.gis.db import models as gis_models
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from apps.core.models import Commune, User


class EventCategory(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=100, unique=True)
    icon = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=7, default="#1a4d6e")
    sort_order = models.PositiveIntegerField(default=0, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name = "Catégorie d'événement"
        verbose_name_plural = "Catégories d'événements"

    def __str__(self) -> str:
        return self.name

    def save(self, *args, **kwargs) -> None:
        if not self.slug:
            self.slug = slugify(self.name)[:100]
        super().save(*args, **kwargs)


class Event(models.Model):
    class Kind(models.TextChoices):
        EVENT = "event", "Événement"
        MARKET = "market", "Marché"

    class Status(models.TextChoices):
        DRAFT = "draft", "Brouillon"
        PUBLISHED = "published", "Publié"
        CANCELLED = "cancelled", "Annulé"
        ARCHIVED = "archived", "Archivé"

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220, unique=True)
    short_description = models.CharField(max_length=240)
    description = models.TextField()
    cover_image = models.ImageField(
        upload_to="events/%Y/%m/",
        blank=True,
        null=True,
    )

    kind = models.CharField(
        max_length=20,
        choices=Kind.choices,
        default=Kind.EVENT,
        db_index=True,
    )
    category = models.ForeignKey(
        EventCategory,
        on_delete=models.PROTECT,
        related_name="events",
    )

    commune = models.ForeignKey(
        Commune,
        on_delete=models.PROTECT,
        related_name="events",
    )
    venue_name = models.CharField(max_length=150)
    address = models.CharField(max_length=255, blank=True)
    location = gis_models.PointField(srid=4326, null=True, blank=True)

    price = models.CharField(max_length=100, blank=True)
    booking_url = models.URLField(blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    contact_email = models.EmailField(blank=True)
    organizer = models.CharField(max_length=150, blank=True)
    official_url = models.URLField(blank=True)

    business = models.ForeignKey(
        "directory.Business",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="events",
    )
    related_articles = models.ManyToManyField(
        "editorial.Article",
        blank=True,
        related_name="related_events",
    )

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True,
    )
    is_featured = models.BooleanField(default=False, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)
    meta_title = models.CharField(max_length=70, blank=True)
    meta_description = models.CharField(max_length=160, blank=True)

    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="created_events",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-is_featured", "title"]
        indexes = [
            models.Index(fields=["status", "kind"], name="event_status_kind_idx"),
            models.Index(fields=["commune", "status"], name="event_commune_status_idx"),
            models.Index(fields=["category", "status"], name="event_cat_status_idx"),
        ]

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs) -> None:
        if not self.slug:
            self.slug = slugify(self.title)[:220]
        if self.status == self.Status.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)


class EventOccurrence(models.Model):
    class Status(models.TextChoices):
        SCHEDULED = "scheduled", "Prévue"
        CANCELLED = "cancelled", "Annulée"
        POSTPONED = "postponed", "Reportée"

    event = models.ForeignKey(
        Event,
        on_delete=models.CASCADE,
        related_name="occurrences",
    )
    starts_at = models.DateTimeField(db_index=True)
    ends_at = models.DateTimeField(db_index=True)
    is_all_day = models.BooleanField(default=False)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SCHEDULED,
        db_index=True,
    )
    note = models.CharField(
        max_length=240,
        blank=True,
        help_text="Information propre à cette date : déplacement, annulation…",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["starts_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["event", "starts_at"],
                name="event_occurrence_unique_start",
            ),
            models.CheckConstraint(
                condition=models.Q(ends_at__gt=models.F("starts_at")),
                name="event_occurrence_end_after_start",
            ),
        ]
        indexes = [
            models.Index(
                fields=["status", "starts_at", "ends_at"],
                name="event_occ_status_dates_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.event.title} — {self.starts_at:%d/%m/%Y %H:%M}"

    def clean(self) -> None:
        if self.ends_at and self.starts_at and self.ends_at <= self.starts_at:
            raise ValidationError({"ends_at": "La fin doit être après le début."})

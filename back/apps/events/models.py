"""Modèles Agenda : contenu Event et dates explicites EventOccurrence."""

from __future__ import annotations

from django.contrib.gis.db import models as gis_models
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from django.utils.text import slugify

from apps.core.models import Commune, User


class EventSource(models.Model):
    """Source officielle synchronisée vers la boîte d'import Agenda."""

    class Connector(models.TextChoices):
        JSON_LD = "json_ld", "Pages web avec JSON-LD Event"
        CRAWL4AI = "crawl4ai", "Pages JavaScript via Crawl4AI"
        ICS = "ics", "Flux calendrier ICS"

    class SyncStatus(models.TextChoices):
        NEVER = "never", "Jamais synchronisée"
        RUNNING = "running", "Synchronisation en cours"
        OK = "ok", "Synchronisée"
        PARTIAL = "partial", "Partielle"
        ERROR = "error", "Erreur"

    label = models.CharField(max_length=150)
    connector = models.CharField(
        max_length=20,
        choices=Connector.choices,
        default=Connector.JSON_LD,
        db_index=True,
    )
    crawl_source = models.ForeignKey(
        "assistant.CrawlSource",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="event_sources",
        help_text="Corpus partage a reutiliser pour les connecteurs web.",
    )
    url_patterns = models.TextField(
        default="/agenda/\n/evenement/",
        blank=True,
        help_text="Une sous-chaine d URL d evenement par ligne.",
    )
    source_url = models.URLField(
        help_text="Page agenda, flux ICS ou endpoint officiel à interroger.",
    )
    website_url = models.URLField(
        blank=True,
        help_text="Site public de l'organisme, utilisé pour la provenance.",
    )
    commune = models.ForeignKey(
        Commune,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="event_sources",
    )
    default_category = models.ForeignKey(
        "EventCategory",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="event_sources",
    )
    default_kind = models.CharField(
        max_length=20,
        choices=(("event", "Événement"), ("market", "Marché")),
        default="event",
    )
    max_pages = models.PositiveIntegerField(
        default=0,
        help_text="Limite Agenda autonome. 0 = utiliser toute la source partagee.",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    sync_images = models.BooleanField(
        default=True,
        help_text="Télécharger et actualiser automatiquement l'image officielle.",
    )
    rights_note = models.CharField(
        max_length=300,
        blank=True,
        help_text="Accord, licence ou justification autorisant la réutilisation.",
    )
    last_synced_at = models.DateTimeField(null=True, blank=True)
    last_status = models.CharField(
        max_length=20,
        choices=SyncStatus.choices,
        default=SyncStatus.NEVER,
        db_index=True,
    )
    last_error = models.TextField(blank=True)
    ai_content_hash = models.CharField(max_length=64, blank=True, editable=False)
    ai_cached_events = models.JSONField(default=list, blank=True, editable=False)
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="created_event_sources",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["label"]
        verbose_name = "Source Agenda"
        verbose_name_plural = "Sources Agenda"

    def __str__(self) -> str:
        return self.label


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
        help_text="Remplacement manuel prioritaire sur l'image officielle.",
    )
    source_cover_image = models.ImageField(
        upload_to="events/source/%Y/%m/",
        blank=True,
        null=True,
        editable=False,
    )
    source_image_url = models.URLField(blank=True, editable=False)
    source_image_hash = models.CharField(max_length=64, blank=True, editable=False)
    image_credit = models.CharField(max_length=200, blank=True)

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
    source = models.ForeignKey(
        EventSource,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="events",
    )
    source_uid = models.CharField(max_length=240, blank=True)
    source_updated_at = models.DateTimeField(null=True, blank=True)
    source_sync_enabled = models.BooleanField(default=True)

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
            models.Index(fields=["source", "source_uid"], name="event_source_uid_idx"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["source", "source_uid"],
                condition=models.Q(source__isnull=False) & ~models.Q(source_uid=""),
                name="event_unique_source_uid",
            ),
        ]

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs) -> None:
        if not self.slug:
            self.slug = slugify(self.title)[:220]
        if self.status == self.Status.PUBLISHED and self.published_at is None:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    @property
    def resolved_cover_image(self):
        """L'override manuel gagne, sinon l'image officielle synchronisée."""
        return self.cover_image or self.source_cover_image


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


class EventImportRun(models.Model):
    """Journal auditable d'une synchronisation de source."""

    class Status(models.TextChoices):
        RUNNING = "running", "En cours"
        SUCCESS = "success", "Réussie"
        PARTIAL = "partial", "Partielle"
        ERROR = "error", "Erreur"

    source = models.ForeignKey(
        EventSource,
        on_delete=models.CASCADE,
        related_name="runs",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.RUNNING,
        db_index=True,
    )
    started_at = models.DateTimeField(auto_now_add=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    discovered_count = models.PositiveIntegerField(default=0)
    created_count = models.PositiveIntegerField(default=0)
    updated_count = models.PositiveIntegerField(default=0)
    imported_count = models.PositiveIntegerField(default=0)
    ai_extraction_count = models.PositiveIntegerField(default=0)
    duplicate_count = models.PositiveIntegerField(default=0)
    error_count = models.PositiveIntegerField(default=0)
    error_details = models.JSONField(default=list, blank=True)

    class Meta:
        ordering = ["-started_at"]
        verbose_name = "Exécution d'import Agenda"
        verbose_name_plural = "Exécutions d'import Agenda"

    def __str__(self) -> str:
        return f"{self.source.label} — {self.started_at:%d/%m/%Y %H:%M}"


class EventImportCandidate(models.Model):
    """Événement structuré en attente de validation ou de synchronisation."""

    class ExtractionMethod(models.TextChoices):
        JSON_LD = "json_ld", "JSON-LD officiel"
        MISTRAL = "mistral", "Extraction Mistral à valider"
        ICS = "ics", "Flux ICS officiel"

    class Status(models.TextChoices):
        PENDING = "pending", "À vérifier"
        IMPORTED = "imported", "Importé"
        REJECTED = "rejected", "Rejeté"
        DUPLICATE = "duplicate", "Doublon"
        INVALID = "invalid", "Incomplet"

    source = models.ForeignKey(
        EventSource,
        on_delete=models.CASCADE,
        related_name="candidates",
    )
    source_uid = models.CharField(max_length=240)
    extraction_method = models.CharField(
        max_length=20,
        choices=ExtractionMethod.choices,
        default=ExtractionMethod.JSON_LD,
        db_index=True,
    )
    source_url = models.URLField()
    raw_payload = models.JSONField(default=dict, blank=True)
    fingerprint = models.CharField(max_length=64, db_index=True)
    title = models.CharField(max_length=200)
    short_description = models.CharField(max_length=240, blank=True)
    description = models.TextField(blank=True)
    image_url = models.URLField(blank=True)
    image_credit = models.CharField(max_length=200, blank=True)
    starts_at = models.DateTimeField(null=True, blank=True, db_index=True)
    ends_at = models.DateTimeField(null=True, blank=True)
    occurrences = models.JSONField(default=list, blank=True)
    is_all_day = models.BooleanField(default=False)
    venue_name = models.CharField(max_length=150, blank=True)
    address = models.CharField(max_length=255, blank=True)
    latitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
    )
    longitude = models.DecimalField(
        max_digits=10,
        decimal_places=7,
        null=True,
        blank=True,
    )
    price = models.CharField(max_length=100, blank=True)
    booking_url = models.URLField(blank=True)
    organizer = models.CharField(max_length=150, blank=True)
    commune = models.ForeignKey(
        Commune,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="event_import_candidates",
    )
    category = models.ForeignKey(
        EventCategory,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="import_candidates",
    )
    kind = models.CharField(
        max_length=20,
        choices=Event.Kind.choices,
        default=Event.Kind.EVENT,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
    )
    validation_errors = models.JSONField(default=list, blank=True)
    matched_event = models.ForeignKey(
        Event,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="import_candidates",
    )
    first_seen_at = models.DateTimeField(auto_now_add=True)
    last_seen_at = models.DateTimeField(auto_now=True)
    imported_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["status", "starts_at", "title"]
        constraints = [
            models.UniqueConstraint(
                fields=["source", "source_uid"],
                name="event_candidate_unique_source_uid",
            ),
        ]
        indexes = [
            models.Index(
                fields=["source", "status", "starts_at"],
                name="event_cand_src_status_idx",
            ),
        ]
        verbose_name = "Candidat Agenda"
        verbose_name_plural = "Candidats Agenda"

    def __str__(self) -> str:
        return f"{self.title} [{self.source.label}]"

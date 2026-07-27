# Migration explicite : l’environnement Windows local ne charge pas GDAL/PostGIS.
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("events", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]
    operations = [
        migrations.CreateModel(
            name="EventSource",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("label", models.CharField(max_length=150)),
                (
                    "connector",
                    models.CharField(
                        choices=[
                            ("json_ld", "Pages web avec JSON-LD Event"),
                            ("crawl4ai", "Pages JavaScript via Crawl4AI"),
                            ("ics", "Flux calendrier ICS"),
                        ],
                        db_index=True,
                        default="json_ld",
                        max_length=20,
                    ),
                ),
                (
                    "source_url",
                    models.URLField(
                        help_text="Page agenda, flux ICS ou endpoint officiel à interroger."
                    ),
                ),
                (
                    "website_url",
                    models.URLField(
                        blank=True,
                        help_text="Site public de l’organisme, utilisé pour la provenance.",
                    ),
                ),
                (
                    "default_kind",
                    models.CharField(
                        choices=[("event", "Événement"), ("market", "Marché")],
                        default="event",
                        max_length=20,
                    ),
                ),
                (
                    "max_pages",
                    models.PositiveSmallIntegerField(
                        default=30, help_text="Limite de pages inspectées pour un connecteur web."
                    ),
                ),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                (
                    "sync_images",
                    models.BooleanField(
                        default=True,
                        help_text="Télécharger et actualiser automatiquement l’image officielle.",
                    ),
                ),
                (
                    "rights_note",
                    models.CharField(
                        blank=True,
                        help_text="Accord, licence ou justification autorisant la réutilisation.",
                        max_length=300,
                    ),
                ),
                ("last_synced_at", models.DateTimeField(blank=True, null=True)),
                (
                    "last_status",
                    models.CharField(
                        choices=[
                            ("never", "Jamais synchronisée"),
                            ("running", "Synchronisation en cours"),
                            ("ok", "Synchronisée"),
                            ("partial", "Partielle"),
                            ("error", "Erreur"),
                        ],
                        db_index=True,
                        default="never",
                        max_length=20,
                    ),
                ),
                ("last_error", models.TextField(blank=True)),
                ("ai_content_hash", models.CharField(blank=True, editable=False, max_length=64)),
                ("ai_cached_events", models.JSONField(blank=True, default=list, editable=False)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "commune",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="event_sources",
                        to="core.commune",
                    ),
                ),
                (
                    "created_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="created_event_sources",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
                (
                    "default_category",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="event_sources",
                        to="events.eventcategory",
                    ),
                ),
            ],
            options={
                "verbose_name": "Source Agenda",
                "verbose_name_plural": "Sources Agenda",
                "ordering": ["label"],
            },
        ),
        migrations.AddField(
            model_name="event",
            name="source_cover_image",
            field=models.ImageField(
                blank=True, editable=False, null=True, upload_to="events/source/%Y/%m/"
            ),
        ),
        migrations.AddField(
            model_name="event",
            name="source_image_url",
            field=models.URLField(blank=True, editable=False),
        ),
        migrations.AddField(
            model_name="event",
            name="source_image_hash",
            field=models.CharField(blank=True, editable=False, max_length=64),
        ),
        migrations.AddField(
            model_name="event",
            name="image_credit",
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name="event",
            name="source_uid",
            field=models.CharField(blank=True, max_length=240),
        ),
        migrations.AddField(
            model_name="event",
            name="source_updated_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name="event", name="source_sync_enabled", field=models.BooleanField(default=True)
        ),
        migrations.AddField(
            model_name="event",
            name="source",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="events",
                to="events.eventsource",
            ),
        ),
        migrations.AlterField(
            model_name="event",
            name="cover_image",
            field=models.ImageField(
                blank=True,
                help_text="Remplacement manuel prioritaire sur l’image officielle.",
                null=True,
                upload_to="events/%Y/%m/",
            ),
        ),
        migrations.AddIndex(
            model_name="event",
            index=models.Index(fields=["source", "source_uid"], name="event_source_uid_idx"),
        ),
        migrations.AddConstraint(
            model_name="event",
            constraint=models.UniqueConstraint(
                condition=models.Q(
                    ("source__isnull", False), models.Q(("source_uid", ""), _negated=True)
                ),
                fields=("source", "source_uid"),
                name="event_unique_source_uid",
            ),
        ),
        migrations.CreateModel(
            name="EventImportRun",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("running", "En cours"),
                            ("success", "Réussie"),
                            ("partial", "Partielle"),
                            ("error", "Erreur"),
                        ],
                        db_index=True,
                        default="running",
                        max_length=20,
                    ),
                ),
                ("started_at", models.DateTimeField(auto_now_add=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("discovered_count", models.PositiveIntegerField(default=0)),
                ("created_count", models.PositiveIntegerField(default=0)),
                ("updated_count", models.PositiveIntegerField(default=0)),
                ("imported_count", models.PositiveIntegerField(default=0)),
                ("ai_extraction_count", models.PositiveIntegerField(default=0)),
                ("duplicate_count", models.PositiveIntegerField(default=0)),
                ("error_count", models.PositiveIntegerField(default=0)),
                ("error_details", models.JSONField(blank=True, default=list)),
                (
                    "source",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="runs",
                        to="events.eventsource",
                    ),
                ),
            ],
            options={
                "verbose_name": "Exécution d’import Agenda",
                "verbose_name_plural": "Exécutions d’import Agenda",
                "ordering": ["-started_at"],
            },
        ),
        migrations.CreateModel(
            name="EventImportCandidate",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("source_uid", models.CharField(max_length=240)),
                (
                    "extraction_method",
                    models.CharField(
                        choices=[
                            ("json_ld", "JSON-LD officiel"),
                            ("mistral", "Extraction Mistral à valider"),
                            ("ics", "Flux ICS officiel"),
                        ],
                        db_index=True,
                        default="json_ld",
                        max_length=20,
                    ),
                ),
                ("source_url", models.URLField()),
                ("raw_payload", models.JSONField(blank=True, default=dict)),
                ("fingerprint", models.CharField(db_index=True, max_length=64)),
                ("title", models.CharField(max_length=200)),
                ("short_description", models.CharField(blank=True, max_length=240)),
                ("description", models.TextField(blank=True)),
                ("image_url", models.URLField(blank=True)),
                ("image_credit", models.CharField(blank=True, max_length=200)),
                ("starts_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("ends_at", models.DateTimeField(blank=True, null=True)),
                ("occurrences", models.JSONField(blank=True, default=list)),
                ("is_all_day", models.BooleanField(default=False)),
                ("venue_name", models.CharField(blank=True, max_length=150)),
                ("address", models.CharField(blank=True, max_length=255)),
                (
                    "latitude",
                    models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True),
                ),
                (
                    "longitude",
                    models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True),
                ),
                ("price", models.CharField(blank=True, max_length=100)),
                ("booking_url", models.URLField(blank=True)),
                ("organizer", models.CharField(blank=True, max_length=150)),
                (
                    "kind",
                    models.CharField(
                        choices=[("event", "Événement"), ("market", "Marché")],
                        default="event",
                        max_length=20,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "À vérifier"),
                            ("imported", "Importé"),
                            ("rejected", "Rejeté"),
                            ("duplicate", "Doublon"),
                            ("invalid", "Incomplet"),
                        ],
                        db_index=True,
                        default="pending",
                        max_length=20,
                    ),
                ),
                ("validation_errors", models.JSONField(blank=True, default=list)),
                ("first_seen_at", models.DateTimeField(auto_now_add=True)),
                ("last_seen_at", models.DateTimeField(auto_now=True)),
                ("imported_at", models.DateTimeField(blank=True, null=True)),
                (
                    "category",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="import_candidates",
                        to="events.eventcategory",
                    ),
                ),
                (
                    "commune",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="event_import_candidates",
                        to="core.commune",
                    ),
                ),
                (
                    "matched_event",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="import_candidates",
                        to="events.event",
                    ),
                ),
                (
                    "source",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="candidates",
                        to="events.eventsource",
                    ),
                ),
            ],
            options={
                "verbose_name": "Candidat Agenda",
                "verbose_name_plural": "Candidats Agenda",
                "ordering": ["status", "starts_at", "title"],
            },
        ),
        migrations.AddConstraint(
            model_name="eventimportcandidate",
            constraint=models.UniqueConstraint(
                fields=("source", "source_uid"), name="event_candidate_unique_source_uid"
            ),
        ),
        migrations.AddIndex(
            model_name="eventimportcandidate",
            index=models.Index(
                fields=["source", "status", "starts_at"], name="event_cand_src_status_idx"
            ),
        ),
    ]

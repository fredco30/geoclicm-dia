# Generated for the business import pipeline (docs/26)

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("assistant", "0006_crawlsource_multi_extraction_cache"),
        ("core", "0002_commune_media"),
        ("directory", "0003_business_is_local_producer"),
    ]

    operations = [
        migrations.CreateModel(
            name="BusinessImportCandidate",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("source_uid", models.CharField(max_length=240)),
                (
                    "extraction_method",
                    models.CharField(
                        choices=[("ai", "Extraction IA Ã  valider"), ("json_ld", "JSON-LD officiel")],
                        db_index=True,
                        default="ai",
                        max_length=20,
                    ),
                ),
                ("source_url", models.URLField()),
                ("raw_payload", models.JSONField(blank=True, default=dict)),
                ("fingerprint", models.CharField(db_index=True, max_length=64)),
                ("name", models.CharField(max_length=150)),
                ("short_description", models.CharField(blank=True, max_length=200)),
                ("description", models.TextField(blank=True)),
                ("image_url", models.URLField(blank=True)),
                ("address", models.CharField(blank=True, max_length=255)),
                ("postal_code", models.CharField(blank=True, max_length=10)),
                ("city", models.CharField(blank=True, max_length=100)),
                ("latitude", models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True)),
                ("longitude", models.DecimalField(blank=True, decimal_places=7, max_digits=10, null=True)),
                ("phone", models.CharField(blank=True, max_length=20)),
                ("email", models.EmailField(blank=True, max_length=254)),
                ("website", models.URLField(blank=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Ã€ vÃ©rifier"),
                            ("imported", "ImportÃ©"),
                            ("rejected", "RejetÃ©"),
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
                        to="directory.businesscategory",
                    ),
                ),
                (
                    "commune",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="business_import_candidates",
                        to="core.commune",
                    ),
                ),
                (
                    "crawl_source",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="business_import_candidates",
                        to="assistant.crawlsource",
                    ),
                ),
                (
                    "matched_business",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="import_candidates",
                        to="directory.business",
                    ),
                ),
            ],
            options={
                "verbose_name": "Candidat CommerÃ§ant",
                "verbose_name_plural": "Candidats CommerÃ§ants",
                "ordering": ["status", "name"],
            },
        ),
        migrations.AddConstraint(
            model_name="businessimportcandidate",
            constraint=models.UniqueConstraint(
                fields=("crawl_source", "source_uid"),
                name="business_candidate_unique_source_uid",
            ),
        ),
        migrations.AddIndex(
            model_name="businessimportcandidate",
            index=models.Index(
                fields=["crawl_source", "status"], name="biz_cand_src_status_idx"
            ),
        ),
    ]

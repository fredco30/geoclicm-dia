"""Migration initiale advertisers — Subscription + Invoice.

Migration manquante détectée en prod le 2026-05-05 : l'app advertisers était
listée dans INSTALLED_APPS depuis le Sprint 3 Lot E mais aucune migration
n'avait été générée/commitée. Conséquence : les tables advertisers_subscription
et advertisers_invoice n'existaient pas en DB.
"""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("directory", "0002_business_service_areas_alter_business_commune"),
    ]

    operations = [
        migrations.CreateModel(
            name="Subscription",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                (
                    "plan",
                    models.CharField(
                        help_text="Plan métier : free / basic / premium", max_length=20
                    ),
                ),
                (
                    "stripe_subscription_id",
                    models.CharField(max_length=100, unique=True),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("trialing", "Période d'essai"),
                            ("active", "Active"),
                            ("past_due", "Impayé"),
                            ("cancelled", "Annulée"),
                            ("unpaid", "Non payée"),
                            ("incomplete", "Incomplète (paiement échoué)"),
                        ],
                        db_index=True,
                        max_length=20,
                    ),
                ),
                ("started_at", models.DateTimeField()),
                ("current_period_start", models.DateTimeField()),
                ("current_period_end", models.DateTimeField(db_index=True)),
                ("cancelled_at", models.DateTimeField(blank=True, null=True)),
                (
                    "amount",
                    models.DecimalField(
                        decimal_places=2,
                        help_text="Montant HT facturé à chaque cycle (en EUR).",
                        max_digits=8,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "business",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="subscriptions",
                        to="directory.business",
                    ),
                ),
            ],
            options={
                "verbose_name": "Abonnement",
                "verbose_name_plural": "Abonnements",
                "ordering": ["-started_at"],
                "indexes": [
                    models.Index(
                        fields=["business", "-started_at"], name="advs_sub_business_idx"
                    ),
                    models.Index(
                        fields=["status", "current_period_end"],
                        name="advs_sub_status_end_idx",
                    ),
                ],
            },
        ),
        migrations.CreateModel(
            name="Invoice",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                (
                    "invoice_number",
                    models.CharField(db_index=True, max_length=20, unique=True),
                ),
                (
                    "stripe_invoice_id",
                    models.CharField(blank=True, db_index=True, max_length=100),
                ),
                ("amount_ht", models.DecimalField(decimal_places=2, max_digits=8)),
                (
                    "tva_rate",
                    models.DecimalField(
                        decimal_places=2,
                        default=20,
                        help_text="Taux de TVA en % (20 par défaut, 0 si auto-entrepreneur non assujetti).",
                        max_digits=5,
                    ),
                ),
                ("tva_amount", models.DecimalField(decimal_places=2, max_digits=8)),
                ("amount_ttc", models.DecimalField(decimal_places=2, max_digits=8)),
                ("issued_at", models.DateField(db_index=True)),
                ("due_at", models.DateField()),
                ("paid_at", models.DateField(blank=True, null=True)),
                (
                    "pdf_file",
                    models.FileField(
                        blank=True,
                        help_text="PDF généré asynchrone par Celery (Lot F).",
                        upload_to="invoices/%Y/%m/",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "business",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="invoices",
                        to="directory.business",
                    ),
                ),
            ],
            options={
                "verbose_name": "Facture",
                "verbose_name_plural": "Factures",
                "ordering": ["-issued_at"],
                "indexes": [
                    models.Index(
                        fields=["business", "-issued_at"], name="advs_inv_business_idx"
                    ),
                ],
            },
        ),
    ]

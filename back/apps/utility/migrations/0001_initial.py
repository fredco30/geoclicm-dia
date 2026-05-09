"""Migration initiale : modèle UsefulContact (numéros utiles + démarches)."""
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("core", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="UsefulContact",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "kind",
                    models.CharField(
                        choices=[
                            ("useful_number", "Numéro utile"),
                            ("procedure", "Démarche"),
                        ],
                        db_index=True,
                        help_text=(
                            "Détermine dans quelle page publique l'entrée "
                            "apparaît."
                        ),
                        max_length=20,
                    ),
                ),
                (
                    "label",
                    models.CharField(
                        help_text=(
                            "Libellé court affiché en titre. Ex: « Pompiers »,"
                            " « Refaire sa carte d'identité »."
                        ),
                        max_length=200,
                    ),
                ),
                (
                    "contact_type",
                    models.CharField(
                        choices=[
                            ("phone", "Téléphone"),
                            ("url", "Lien externe"),
                            ("email", "Email"),
                            ("address", "Adresse"),
                            ("info", "Info simple"),
                        ],
                        default="phone",
                        help_text=(
                            "Détermine le rendu : tel: cliquable, lien "
                            "externe, etc."
                        ),
                        max_length=20,
                    ),
                ),
                (
                    "value",
                    models.CharField(
                        help_text=(
                            "Valeur brute. Ex: « 18 », « https://"
                            "service-public.fr/... »."
                        ),
                        max_length=500,
                    ),
                ),
                (
                    "description",
                    models.TextField(
                        blank=True,
                        help_text=(
                            "Précisions optionnelles (horaires, conditions, "
                            "etc.)."
                        ),
                    ),
                ),
                (
                    "category_label",
                    models.CharField(
                        blank=True,
                        db_index=True,
                        help_text=(
                            "Section pour grouper l'affichage. Ex: « Urgences "
                            "», « Santé », « État civil ». Texte libre, pas "
                            "de FK."
                        ),
                        max_length=100,
                    ),
                ),
                (
                    "sort_order",
                    models.PositiveIntegerField(
                        default=100,
                        help_text=(
                            "Ordre d'affichage croissant au sein d'une "
                            "category_label."
                        ),
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(
                        db_index=True,
                        default=True,
                        help_text="Décoche pour masquer sans supprimer.",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "commune",
                    models.ForeignKey(
                        blank=True,
                        help_text=(
                            "Commune si l'entrée est locale (ex: mairie "
                            "spécifique). NULL = entrée valable pour tout le "
                            "territoire."
                        ),
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="useful_contacts",
                        to="core.commune",
                    ),
                ),
            ],
            options={
                "verbose_name": "Entrée pratique",
                "verbose_name_plural": "Entrées pratique",
                "ordering": ["kind", "category_label", "sort_order", "label"],
                "indexes": [
                    models.Index(
                        fields=["kind", "is_active", "sort_order"],
                        name="uc_kind_active_sort_idx",
                    ),
                ],
            },
        ),
    ]

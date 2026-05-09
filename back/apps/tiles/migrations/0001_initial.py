"""Migration initiale Tile."""
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("core", "0003_commune_is_coastal_and_seed"),
    ]

    operations = [
        migrations.CreateModel(
            name="Tile",
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
                    "label",
                    models.CharField(
                        help_text="Texte affiché sur la tuile (FR uniquement en V1).",
                        max_length=120,
                    ),
                ),
                (
                    "icon",
                    models.CharField(
                        blank=True,
                        help_text="Nom d'icône Lucide (ex: 'Newspaper', 'Calendar', 'Store').",
                        max_length=60,
                    ),
                ),
                (
                    "color",
                    models.CharField(
                        choices=[
                            ("camargue", "Bleu camargue"),
                            ("sel", "Sel (sable clair)"),
                            ("terre", "Terre cuite"),
                            ("mer", "Mer (cyan)"),
                            ("agrume", "Agrume (orange)"),
                            ("olive", "Olive (vert)"),
                            ("neutre", "Neutre (gris)"),
                        ],
                        default="camargue",
                        help_text="Couleur de fond de la tuile (preset).",
                        max_length=20,
                    ),
                ),
                (
                    "cover_image",
                    models.ImageField(
                        blank=True,
                        help_text=(
                            "Image de fond de la tuile (optionnelle). Si renseignée, "
                            "remplace la couleur preset."
                        ),
                        null=True,
                        upload_to="tiles/",
                    ),
                ),
                (
                    "kind",
                    models.CharField(
                        choices=[
                            ("internal_route", "Lien interne"),
                            ("external_url", "Lien externe"),
                            ("module", "Module spécial"),
                        ],
                        default="internal_route",
                        help_text="Type d'action au clic.",
                        max_length=20,
                    ),
                ),
                (
                    "internal_path",
                    models.CharField(
                        blank=True,
                        help_text="Chemin interne, ex: '/agenda' (utilisé si kind=internal_route).",
                        max_length=200,
                    ),
                ),
                (
                    "external_url",
                    models.URLField(
                        blank=True,
                        help_text="URL externe (utilisé si kind=external_url).",
                    ),
                ),
                (
                    "module_key",
                    models.CharField(
                        blank=True,
                        choices=[
                            ("news", "Actualités (articles)"),
                            ("weather", "Météo & mer"),
                            ("businesses", "Commerçants"),
                        ],
                        help_text="Module câblé (utilisé si kind=module).",
                        max_length=20,
                    ),
                ),
                (
                    "sort_order",
                    models.PositiveIntegerField(
                        db_index=True,
                        default=0,
                        help_text="Ordre d'affichage croissant (0 = premier).",
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(
                        db_index=True,
                        default=True,
                        help_text="Si décoché, la tuile est masquée du site.",
                    ),
                ),
                (
                    "show_on_home",
                    models.BooleanField(
                        default=True,
                        help_text=(
                            "Si coché, la tuile apparaît sur la home globale "
                            "(sinon uniquement sur les pages commune si renseignées)."
                        ),
                    ),
                ),
                (
                    "span_2x",
                    models.BooleanField(
                        default=False,
                        help_text="Tuile large (occupe 2 colonnes dans la grille).",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "parent",
                    models.ForeignKey(
                        blank=True,
                        help_text="Tuile parente (null = tuile racine sur la home).",
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="children",
                        to="tiles.tile",
                    ),
                ),
                (
                    "visible_on_communes",
                    models.ManyToManyField(
                        blank=True,
                        help_text=(
                            "Communes où la tuile est visible. Vide = toutes (page home + "
                            "toutes les pages commune)."
                        ),
                        related_name="tiles",
                        to="core.commune",
                    ),
                ),
            ],
            options={
                "verbose_name": "Tuile",
                "verbose_name_plural": "Tuiles",
                "ordering": ["sort_order", "label"],
            },
        ),
        migrations.AddIndex(
            model_name="tile",
            index=models.Index(
                fields=["parent", "sort_order"],
                name="tiles_parent_sort_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="tile",
            index=models.Index(
                fields=["is_active", "show_on_home"],
                name="tiles_active_home_idx",
            ),
        ),
    ]

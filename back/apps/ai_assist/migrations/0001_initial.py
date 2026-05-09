"""Migration initiale : modèle AIGeneration (audit log des générations)."""
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="AIGeneration",
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
                    "endpoint",
                    models.CharField(
                        db_index=True,
                        help_text=(
                            "Identifiant logique de la feature qui a "
                            "déclenché la génération (ex: 'business.describe',"
                            " 'article.draft', 'ad.headline'). Permet de "
                            "mesurer l'adoption par feature."
                        ),
                        max_length=80,
                    ),
                ),
                (
                    "model",
                    models.CharField(
                        help_text=(
                            "Nom du modèle Mistral utilisé (ex: "
                            "'mistral-small-latest', 'mistral-large-latest')."
                        ),
                        max_length=80,
                    ),
                ),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("success", "Succès"),
                            ("error", "Erreur"),
                            ("budget_exceeded", "Budget dépassé"),
                        ],
                        db_index=True,
                        default="success",
                        max_length=20,
                    ),
                ),
                (
                    "prompt",
                    models.TextField(
                        blank=True,
                        help_text=(
                            "Prompt complet envoyé à Mistral (system + user)."
                            " Utile pour debugger une mauvaise génération."
                        ),
                    ),
                ),
                (
                    "response",
                    models.TextField(
                        blank=True,
                        help_text="Réponse brute de Mistral (texte).",
                    ),
                ),
                (
                    "error_message",
                    models.TextField(
                        blank=True,
                        help_text=(
                            "Stack/erreur si status=error ou budget_exceeded."
                        ),
                    ),
                ),
                ("tokens_in", models.PositiveIntegerField(default=0)),
                ("tokens_out", models.PositiveIntegerField(default=0)),
                (
                    "cost_eur",
                    models.DecimalField(
                        decimal_places=6,
                        default=0,
                        help_text=(
                            "Coût estimé en euros, calculé depuis les tarifs"
                            " Mistral courants au moment de la génération. "
                            "Stocké pour pouvoir agréger par jour/utilisateur"
                            " sans recalculer."
                        ),
                        max_digits=10,
                    ),
                ),
                (
                    "duration_ms",
                    models.PositiveIntegerField(
                        default=0,
                        help_text=(
                            "Temps total de l'appel Mistral en millisecondes."
                        ),
                    ),
                ),
                (
                    "is_flagged",
                    models.BooleanField(
                        db_index=True,
                        default=False,
                        help_text=(
                            "Décoche par un admin/rédacteur si la génération"
                            " a été jugée mauvaise. Sert à mesurer la "
                            "qualité côté admin."
                        ),
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, db_index=True),
                ),
                (
                    "user",
                    models.ForeignKey(
                        help_text=(
                            "Utilisateur initiateur. CASCADE car "
                            "l'historique IA n'a pas de sens sans son "
                            "créateur."
                        ),
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="ai_generations",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "verbose_name": "Génération IA",
                "verbose_name_plural": "Générations IA",
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["user", "-created_at"],
                        name="aig_user_created_idx",
                    ),
                    models.Index(
                        fields=["endpoint", "-created_at"],
                        name="aig_endpoint_created_idx",
                    ),
                ],
            },
        ),
    ]

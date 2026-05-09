"""
Modèles de l'app `ai_assist`.

Une seule entité : `AIGeneration`, qui trace toutes les générations
réalisées via Mistral pour le compte d'un utilisateur authentifié
(rédactrice, annonceur, admin). Sert à :

- Suivre les coûts par utilisateur et globalement (cap journalier).
- Auditer la qualité des générations a posteriori (la rédactrice peut
  signaler une mauvaise génération via `is_flagged`).
- Mesurer l'adoption par feature (`endpoint`).

Les `prompt` et `response` sont stockés en clair pour permettre le debug
et l'analyse de qualité — ce sont des contenus produits par l'admin/
annonceur, pas des données personnelles de visiteurs publics.
"""
from __future__ import annotations

from django.conf import settings
from django.db import models


class AIGeneration(models.Model):
    """
    Une génération IA effectuée pour un utilisateur authentifié.

    Crée systématiquement une ligne, succès comme erreur, pour pouvoir
    comptabiliser les tentatives et les rate-limiter si besoin.
    """

    class Status(models.TextChoices):
        SUCCESS = "success", "Succès"
        ERROR = "error", "Erreur"
        BUDGET_EXCEEDED = "budget_exceeded", "Budget dépassé"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_generations",
        help_text="Utilisateur initiateur. CASCADE car l'historique IA "
                  "n'a pas de sens sans son créateur.",
    )
    endpoint = models.CharField(
        max_length=80,
        db_index=True,
        help_text="Identifiant logique de la feature qui a déclenché la "
                  "génération (ex: 'business.describe', 'article.draft', "
                  "'ad.headline'). Permet de mesurer l'adoption par feature.",
    )
    model = models.CharField(
        max_length=80,
        help_text="Nom du modèle Mistral utilisé "
                  "(ex: 'mistral-small-latest', 'mistral-large-latest').",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.SUCCESS,
        db_index=True,
    )
    prompt = models.TextField(
        blank=True,
        help_text="Prompt complet envoyé à Mistral (system + user). "
                  "Utile pour debugger une mauvaise génération.",
    )
    response = models.TextField(
        blank=True,
        help_text="Réponse brute de Mistral (texte).",
    )
    error_message = models.TextField(
        blank=True,
        help_text="Stack/erreur si status=error ou budget_exceeded.",
    )

    tokens_in = models.PositiveIntegerField(default=0)
    tokens_out = models.PositiveIntegerField(default=0)
    cost_eur = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        default=0,
        help_text="Coût estimé en euros, calculé depuis les tarifs Mistral "
                  "courants au moment de la génération. Stocké pour pouvoir "
                  "agréger par jour/utilisateur sans recalculer.",
    )

    duration_ms = models.PositiveIntegerField(
        default=0,
        help_text="Temps total de l'appel Mistral en millisecondes.",
    )

    is_flagged = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Décoche par un admin/rédacteur si la génération a été "
                  "jugée mauvaise. Sert à mesurer la qualité côté admin.",
    )

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Génération IA"
        verbose_name_plural = "Générations IA"
        ordering = ["-created_at"]
        indexes = [
            # Pour calculer rapidement les coûts d'un user sur la journée
            models.Index(
                fields=["user", "-created_at"],
                name="aig_user_created_idx",
            ),
            # Pour mesurer l'adoption d'une feature
            models.Index(
                fields=["endpoint", "-created_at"],
                name="aig_endpoint_created_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"[{self.endpoint}] {self.user_id} {self.status} ({self.cost_eur}€)"

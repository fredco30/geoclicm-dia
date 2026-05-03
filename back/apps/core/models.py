"""
Modèles core.

Sprint 1 — minimum vital : User custom avec rôles.
Les modèles Commune, Media seront ajoutés à l'ÉTAPE 2 du sprint 1.
"""
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Utilisateur de la plateforme.

    Rôles anticipés sprints suivants :
      - reader     : lecteur public (par défaut, créé via signup futur)
      - advertiser : annonceur (sprint 4 — espace self-service)
      - editor     : rédacteur (admin Django, peut publier)
      - admin      : super-admin (gestion complète)
    """

    class Role(models.TextChoices):
        READER = "reader", "Lecteur"
        ADVERTISER = "advertiser", "Annonceur"
        EDITOR = "editor", "Rédacteur"
        ADMIN = "admin", "Administrateur"

    role = models.CharField(
        max_length=16,
        choices=Role.choices,
        default=Role.READER,
        db_index=True,
    )
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to="avatars/", blank=True, null=True)
    is_email_verified = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.get_full_name() or self.username

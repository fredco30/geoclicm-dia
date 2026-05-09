"""
Modèles « Pratique » : numéros utiles + démarches administratives.

Une seule table `UsefulContact` couvre les deux usages — la distinction
est portée par le champ `kind` :
- KIND_USEFUL_NUMBER : numéro utile (urgences, mairie, OT, médecins…)
- KIND_PROCEDURE     : démarche administrative (carte d'identité, état
  civil, urbanisme…)

Chaque entrée a un `contact_type` qui détermine comment la valeur est
rendue côté front (tel: clickable, lien externe, mailto, adresse
texte, info brute). On groupe les entrées par `category_label`
(« Urgences », « Santé », « Mairies », « État civil »…) — texte libre,
pas de modèle de catégorie pour rester simple en V1. Si ça grandit
on extraira un modèle dédié.
"""
from __future__ import annotations

from django.db import models

from apps.core.models import Commune


class UsefulContact(models.Model):
    """Une entrée de la rubrique Pratique (numéro utile ou démarche)."""

    class Kind(models.TextChoices):
        USEFUL_NUMBER = "useful_number", "Numéro utile"
        PROCEDURE = "procedure", "Démarche"

    class ContactType(models.TextChoices):
        PHONE = "phone", "Téléphone"
        URL = "url", "Lien externe"
        EMAIL = "email", "Email"
        ADDRESS = "address", "Adresse"
        INFO = "info", "Info simple"

    kind = models.CharField(
        max_length=20,
        choices=Kind.choices,
        db_index=True,
        help_text="Détermine dans quelle page publique l'entrée apparaît.",
    )
    label = models.CharField(
        max_length=200,
        help_text="Libellé court affiché en titre. Ex: « Pompiers », "
                  "« Refaire sa carte d'identité ».",
    )
    contact_type = models.CharField(
        max_length=20,
        choices=ContactType.choices,
        default=ContactType.PHONE,
        help_text="Détermine le rendu : tel: cliquable, lien externe, etc.",
    )
    value = models.CharField(
        max_length=500,
        help_text="Valeur brute. Ex: « 18 », « https://service-public.fr/... ».",
    )
    description = models.TextField(
        blank=True,
        help_text="Précisions optionnelles (horaires, conditions, etc.).",
    )
    category_label = models.CharField(
        max_length=100,
        blank=True,
        db_index=True,
        help_text="Section pour grouper l'affichage. Ex: « Urgences », "
                  "« Santé », « État civil ». Texte libre, pas de FK.",
    )
    commune = models.ForeignKey(
        Commune,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="useful_contacts",
        help_text="Commune si l'entrée est locale (ex: mairie spécifique). "
                  "NULL = entrée valable pour tout le territoire.",
    )
    sort_order = models.PositiveIntegerField(
        default=100,
        help_text="Ordre d'affichage croissant au sein d'une category_label.",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Décoche pour masquer sans supprimer.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Entrée pratique"
        verbose_name_plural = "Entrées pratique"
        ordering = ["kind", "category_label", "sort_order", "label"]
        indexes = [
            models.Index(
                fields=["kind", "is_active", "sort_order"],
                name="uc_kind_active_sort_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"[{self.get_kind_display()}] {self.label}"

"""
Modèles advertisers : Subscription métier + Invoice métier.

Ces modèles complètent ceux de dj-stripe (djstripe.Subscription,
djstripe.Invoice) avec une couche métier propre à geoclicMédia :
- Liaison Subscription ↔ Business (FK forte)
- Numérotation continue Invoice (exigence fiscale française)

Le sync depuis Stripe se fait via les webhooks djstripe + signal handlers
custom dans signals.py (mis en place au Lot E.2).
"""
from __future__ import annotations

from django.db import models

from apps.directory.models import Business


class Subscription(models.Model):
    """Abonnement business — wrapper métier autour de djstripe.Subscription."""

    class Status(models.TextChoices):
        TRIALING = "trialing", "Période d'essai"
        ACTIVE = "active", "Active"
        PAST_DUE = "past_due", "Impayé"
        CANCELLED = "cancelled", "Annulée"
        UNPAID = "unpaid", "Non payée"
        INCOMPLETE = "incomplete", "Incomplète (paiement échoué)"

    business = models.ForeignKey(
        Business,
        on_delete=models.CASCADE,
        related_name="subscriptions",
    )
    plan = models.CharField(
        max_length=20,
        help_text="Plan métier : free / basic / premium",
    )

    # Sync Stripe — référence vers le Subscription côté Stripe
    stripe_subscription_id = models.CharField(max_length=100, unique=True)

    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        db_index=True,
    )

    started_at = models.DateTimeField()
    current_period_start = models.DateTimeField()
    current_period_end = models.DateTimeField(db_index=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)

    amount = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        help_text="Montant HT facturé à chaque cycle (en EUR).",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Abonnement"
        verbose_name_plural = "Abonnements"
        ordering = ["-started_at"]
        indexes = [
            models.Index(
                fields=["business", "-started_at"],
                name="advs_sub_business_idx",
            ),
            models.Index(
                fields=["status", "current_period_end"],
                name="advs_sub_status_end_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.business.name} — {self.plan} ({self.status})"


class Invoice(models.Model):
    """
    Facture métier avec numérotation continue (exigence fiscale française).

    Le PDF est généré au Lot F (ReportLab). Le pdf_file est rempli après
    génération asynchrone (Celery task).
    """

    business = models.ForeignKey(
        Business,
        on_delete=models.PROTECT,
        related_name="invoices",
    )

    # Numérotation continue annuelle : ex. 2026-0001, 2026-0002, ...
    invoice_number = models.CharField(max_length=20, unique=True, db_index=True)
    stripe_invoice_id = models.CharField(max_length=100, blank=True, db_index=True)

    amount_ht = models.DecimalField(max_digits=8, decimal_places=2)
    tva_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=20,
        help_text="Taux de TVA en % (20 par défaut, 0 si auto-entrepreneur non assujetti).",
    )
    tva_amount = models.DecimalField(max_digits=8, decimal_places=2)
    amount_ttc = models.DecimalField(max_digits=8, decimal_places=2)

    issued_at = models.DateField(db_index=True)
    due_at = models.DateField()
    paid_at = models.DateField(null=True, blank=True)

    pdf_file = models.FileField(
        upload_to="invoices/%Y/%m/",
        blank=True,
        help_text="PDF généré asynchrone par Celery (Lot F).",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Facture"
        verbose_name_plural = "Factures"
        ordering = ["-issued_at"]
        indexes = [
            models.Index(fields=["business", "-issued_at"], name="advs_inv_business_idx"),
        ]

    def __str__(self) -> str:
        return f"Facture {self.invoice_number} — {self.business.name}"

    @property
    def is_paid(self) -> bool:
        return self.paid_at is not None

"""
Signal handlers Stripe — sync Business.plan + Subscription/Invoice métier.

Pattern : on s'abonne aux webhooks djstripe via @webhooks.handler. djstripe
synchronise déjà le payload Stripe en DB locale (djstripe.models.*). Nous,
on ajoute la couche métier :
- Mise à jour de Business.plan / plan_starts_at / plan_ends_at / stripe_*
- Création de Subscription métier (notre wrapper)
- Création d'Invoice métier avec numérotation continue (exigence FR)
- Gestion des cas d'échec (past_due, cancelled)

Stratégie de liaison Business ↔ Stripe Customer : on stocke business_id
dans Customer.metadata au moment du checkout (Lot E.3). Tous les handlers
remontent au Business via cette metadata.
"""
from __future__ import annotations

from decimal import Decimal
from typing import TYPE_CHECKING

from django.conf import settings
from django.dispatch import receiver
from django.utils import timezone
from djstripe.signals import WEBHOOK_SIGNALS

from apps.directory.models import Business

from .models import Invoice, Subscription

if TYPE_CHECKING:
    from djstripe.models import Customer, Event


# ============================================================================
# Helpers
# ============================================================================

def _plan_from_price_id(price_id: str) -> str | None:
    """Map Stripe Price ID → plan métier (basic / premium)."""
    if price_id == settings.STRIPE_PRICE_BASIC:
        return "basic"
    if price_id == settings.STRIPE_PRICE_PREMIUM:
        return "premium"
    return None


def _get_business_from_customer(customer: Customer | None) -> Business | None:
    """
    Récupère le Business depuis customer.metadata['business_id'].
    Set au moment du Checkout / création Customer (Lot E.3).
    """
    if not customer or not customer.metadata:
        return None
    business_id = customer.metadata.get("business_id")
    if not business_id:
        return None
    try:
        return Business.objects.get(pk=int(business_id))
    except (Business.DoesNotExist, ValueError, TypeError):
        return None


def _next_invoice_number() -> str:
    """
    Numérotation continue annuelle : 2026-0001, 2026-0002, ...
    Exigence fiscale française : pas de trou, ordre chronologique.

    Race condition : utilise SELECT FOR UPDATE en transaction si traffic
    élevé. Pour la phase pilote (~100 fact./an), un simple max+1 suffit.
    """
    year = timezone.now().year
    last = (
        Invoice.objects.filter(invoice_number__startswith=f"{year}-")
        .order_by("-invoice_number")
        .first()
    )
    if not last:
        return f"{year}-0001"
    try:
        seq = int(last.invoice_number.split("-")[1])
    except (IndexError, ValueError):
        seq = 0
    return f"{year}-{seq + 1:04d}"


def _decimal_from_cents(cents: int | None) -> Decimal:
    return Decimal(cents or 0) / 100


# ============================================================================
# Webhook handlers
# ============================================================================

@receiver(WEBHOOK_SIGNALS["customer.subscription.created"])
@receiver(WEBHOOK_SIGNALS["customer.subscription.updated"])
def handle_subscription_upsert(sender, event: Event, **kwargs) -> None:
    """
    Stripe → notre Subscription métier + Business.plan.

    Triggers : nouvelle souscription, changement de plan (upgrade/downgrade),
    renouvellement automatique annuel, retour de past_due → active après
    paiement réussi.
    """
    from djstripe.models import Subscription as DjStripeSubscription

    stripe_sub_id = event.data.get("object", {}).get("id")
    if not stripe_sub_id:
        return

    djs_sub = DjStripeSubscription.objects.filter(id=stripe_sub_id).first()
    if not djs_sub:
        return

    business = _get_business_from_customer(djs_sub.customer)
    if not business:
        return

    # Premier SubscriptionItem (en v1, 1 plan = 1 item)
    item = djs_sub.items.select_related("price").first()
    if not item or not item.price:
        return

    plan = _plan_from_price_id(item.price.id)
    if not plan:
        # Plan inconnu (peut arriver si on ajoute un Price sans MAJ settings)
        return

    # Upsert Subscription métier
    Subscription.objects.update_or_create(
        stripe_subscription_id=stripe_sub_id,
        defaults={
            "business": business,
            "plan": plan,
            "status": djs_sub.status,
            "started_at": djs_sub.start_date or timezone.now(),
            "current_period_start": djs_sub.current_period_start,
            "current_period_end": djs_sub.current_period_end,
            "cancelled_at": djs_sub.canceled_at,
            "amount": _decimal_from_cents(item.price.unit_amount),
        },
    )

    # Sync Business.plan uniquement si subscription active/trial
    if djs_sub.status in ("active", "trialing"):
        Business.objects.filter(pk=business.pk).update(
            plan=plan,
            plan_starts_at=djs_sub.current_period_start,
            plan_ends_at=djs_sub.current_period_end,
            stripe_customer_id=djs_sub.customer.id if djs_sub.customer else "",
            stripe_subscription_id=stripe_sub_id,
        )


@receiver(WEBHOOK_SIGNALS["customer.subscription.deleted"])
def handle_subscription_cancel(sender, event: Event, **kwargs) -> None:
    """
    Stripe Subscription supprimée → notre Subscription cancelled +
    retour Business.plan = free.
    """
    stripe_sub_id = event.data.get("object", {}).get("id")
    if not stripe_sub_id:
        return

    sub = Subscription.objects.filter(stripe_subscription_id=stripe_sub_id).first()
    if not sub:
        return

    now = timezone.now()
    Subscription.objects.filter(pk=sub.pk).update(
        status=Subscription.Status.CANCELLED,
        cancelled_at=now,
    )
    Business.objects.filter(pk=sub.business_id).update(
        plan="free",
        plan_ends_at=now,
    )


@receiver(WEBHOOK_SIGNALS["invoice.paid"])
def handle_invoice_paid(sender, event: Event, **kwargs) -> None:
    """
    Facture Stripe payée → création d'une Invoice métier avec numérotation
    continue annuelle. Idempotent (vérif via stripe_invoice_id).
    """
    from djstripe.models import Invoice as DjStripeInvoice

    stripe_inv_id = event.data.get("object", {}).get("id")
    if not stripe_inv_id:
        return

    djs_inv = DjStripeInvoice.objects.filter(id=stripe_inv_id).first()
    if not djs_inv:
        return

    business = _get_business_from_customer(djs_inv.customer)
    if not business:
        return

    # Idempotence : pas de doublon si webhook re-livré
    if Invoice.objects.filter(stripe_invoice_id=stripe_inv_id).exists():
        return

    amount_ttc = _decimal_from_cents(djs_inv.amount_paid or djs_inv.total)
    tva_rate = Decimal("20.00")
    amount_ht = (amount_ttc / (1 + tva_rate / 100)).quantize(Decimal("0.01"))
    tva_amount = amount_ttc - amount_ht

    today = timezone.now().date()
    Invoice.objects.create(
        business=business,
        invoice_number=_next_invoice_number(),
        stripe_invoice_id=stripe_inv_id,
        amount_ht=amount_ht,
        tva_rate=tva_rate,
        tva_amount=tva_amount,
        amount_ttc=amount_ttc,
        issued_at=today,
        due_at=today,
        paid_at=today,
    )

    # Note : génération PDF asynchrone via Celery viendra au Lot F


@receiver(WEBHOOK_SIGNALS["invoice.payment_failed"])
def handle_invoice_payment_failed(sender, event: Event, **kwargs) -> None:
    """
    Échec paiement → Subscription métier en past_due. Stripe retentera
    automatiquement (Smart Retries) avant de canceller la subscription.
    """
    obj = event.data.get("object", {})
    stripe_sub_id = obj.get("subscription")
    if not stripe_sub_id:
        return

    Subscription.objects.filter(stripe_subscription_id=stripe_sub_id).update(
        status=Subscription.Status.PAST_DUE,
    )

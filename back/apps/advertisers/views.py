"""
Vues API pour la zone annonceur — checkout Stripe + Customer Portal.

Workflow :
1. Annonceur clique « Choisir Basic » sur /tarifs ou /advertiser/abonnement
2. Front POST /api/advertiser/checkout/ {plan, business_id}
3. Backend crée/réutilise Stripe Customer (avec metadata business_id),
   crée une Checkout Session, retourne l'URL
4. Front redirige le navigateur vers Stripe Checkout
5. Stripe gère le paiement, redirige vers success_url
6. Webhook customer.subscription.created → sync Business.plan auto
   (cf. signals.py)
"""
from __future__ import annotations

import stripe
from django.conf import settings
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.directory.models import Business


PLAN_TO_PRICE_ID = {
    "basic": settings.STRIPE_PRICE_BASIC,
    "premium": settings.STRIPE_PRICE_PREMIUM,
}


def _get_stripe_secret_key() -> str:
    return (
        settings.STRIPE_LIVE_SECRET_KEY
        if settings.STRIPE_LIVE_MODE
        else settings.STRIPE_TEST_SECRET_KEY
    )


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def checkout_create(request):
    """
    POST /api/advertiser/checkout/ {plan, business_id}

    Crée (ou réutilise) un Stripe Customer pour ce business, puis crée une
    Checkout Session subscription et retourne l'URL hostée par Stripe.

    Auth requise. Le business doit appartenir à request.user (ou le user
    doit être editor/admin).
    """
    plan = request.data.get("plan")
    business_id = request.data.get("business_id")

    if plan not in PLAN_TO_PRICE_ID:
        return Response(
            {"detail": "Plan invalide. Plans acceptés : basic, premium."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    price_id = PLAN_TO_PRICE_ID[plan]
    if not price_id:
        return Response(
            {
                "detail": "Plan non configuré côté Stripe (Price ID manquant).",
            },
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    secret_key = _get_stripe_secret_key()
    if not secret_key:
        return Response(
            {"detail": "Stripe non configuré côté serveur."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # Vérification ownership du business
    qs = Business.objects.filter(pk=business_id)
    user = request.user
    if not (user.is_superuser or user.role in ("editor", "admin")):
        qs = qs.filter(owner=user)
    business = qs.first()
    if not business:
        return Response(
            {"detail": "Fiche introuvable ou non autorisée."},
            status=status.HTTP_404_NOT_FOUND,
        )

    stripe.api_key = secret_key

    # Réutilise le Customer existant si déjà créé pour ce business
    customer_id = business.stripe_customer_id or None
    if not customer_id:
        customer = stripe.Customer.create(
            email=user.email or business.email or "",
            name=business.legal_name or business.name,
            metadata={
                "business_id": str(business.pk),
                "business_slug": business.slug,
            },
        )
        customer_id = customer.id
        Business.objects.filter(pk=business.pk).update(stripe_customer_id=customer_id)

    site_url = settings.SITE_URL.rstrip("/")
    session = stripe.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{site_url}/advertiser/abonnement?checkout=success",
        cancel_url=f"{site_url}/tarifs?checkout=cancel",
        metadata={
            "business_id": str(business.pk),
            "plan": plan,
        },
        # Active la collecte de l'adresse de facturation (utile pour l'invoice)
        billing_address_collection="required",
        # Locale FR
        locale="fr",
    )

    return Response({"checkout_url": session.url})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def portal_create(request):
    """
    POST /api/advertiser/portal/ {business_id}

    Crée une Stripe Customer Portal Session et retourne l'URL.
    Le Customer Portal permet à l'annonceur de :
    - Mettre à jour ses moyens de paiement
    - Voir l'historique des factures
    - Annuler son abonnement
    - Changer de plan (si Stripe Portal configuré pour permettre)
    """
    business_id = request.data.get("business_id")

    secret_key = _get_stripe_secret_key()
    if not secret_key:
        return Response(
            {"detail": "Stripe non configuré côté serveur."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    qs = Business.objects.filter(pk=business_id)
    user = request.user
    if not (user.is_superuser or user.role in ("editor", "admin")):
        qs = qs.filter(owner=user)
    business = qs.first()
    if not business:
        return Response(
            {"detail": "Fiche introuvable ou non autorisée."},
            status=status.HTTP_404_NOT_FOUND,
        )

    if not business.stripe_customer_id:
        return Response(
            {
                "detail": "Aucun abonnement actif. Choisis d'abord un plan via /tarifs.",
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    stripe.api_key = secret_key
    site_url = settings.SITE_URL.rstrip("/")
    session = stripe.billing_portal.Session.create(
        customer=business.stripe_customer_id,
        return_url=f"{site_url}/advertiser/abonnement",
    )

    return Response({"portal_url": session.url})

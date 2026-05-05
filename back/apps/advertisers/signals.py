"""
Signal handlers Stripe — sync Business.plan automatique au Lot E.2.

Pour l'instant (E.1), placeholder : on écoute les webhooks djstripe mais
on ne fait rien. La logique métier (Business.plan = basic/premium quand
subscription active, retour à free quand cancelled) viendra au Lot E.2.
"""
from __future__ import annotations

# Pas de signal handler en E.1 — wiring placeholder.
# Au Lot E.2, ajouter :
#
# from djstripe import webhooks
#
# @webhooks.handler("customer.subscription.created", "customer.subscription.updated")
# def handle_subscription_change(event, **kwargs):
#     ...
#
# @webhooks.handler("customer.subscription.deleted")
# def handle_subscription_cancel(event, **kwargs):
#     ...

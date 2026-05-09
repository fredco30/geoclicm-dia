"""Permissions DRF pour les endpoints ai_assist."""
from __future__ import annotations

from rest_framework import permissions


class IsAIAssistAllowed(permissions.BasePermission):
    """
    Permet l'accès aux features IA aux utilisateurs authentifiés.

    Tous les rôles peuvent générer (advertiser, editor, admin) — le
    contrôle d'accès aux ressources spécifiques (ex: cette fiche
    business est-elle bien la mienne ?) est délégué aux endpoints qui
    feront un check supplémentaire `obj.owner == request.user`.

    Les utilisateurs `reader` ne devraient pas avoir accès en pratique
    — ils n'ont pas de back-office, donc pas de UI qui appelle ces
    endpoints. On laisse quand même la porte ouverte pour ne pas
    bloquer un cas d'usage futur.
    """

    message = (
        "Connectez-vous à votre espace pour utiliser l'assistance IA."
    )

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated)

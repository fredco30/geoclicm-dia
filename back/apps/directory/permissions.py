"""
Permissions DRF custom pour les modèles directory.

Pattern : un Business appartient à son `owner` (User). L'annonceur peut
gérer SA fiche, l'équipe geoclicMédia (editor/admin) peut gérer toutes
les fiches. Le public peut lire les fiches publiées uniquement.
"""
from rest_framework import permissions

from apps.core.models import User


class IsAdvertiserOrTeam(permissions.BasePermission):
    """Auth requise + rôle advertiser/editor/admin (pas reader)."""

    message = "Cette zone est réservée aux annonceurs et à l'équipe éditoriale."

    def has_permission(self, request, view) -> bool:
        if not request.user.is_authenticated:
            return False
        if request.user.is_superuser:
            return True
        return request.user.role in {
            User.Role.ADVERTISER,
            User.Role.EDITOR,
            User.Role.ADMIN,
        }


class IsBusinessOwnerOrTeam(permissions.BasePermission):
    """
    Permissions object-level pour Business :
    - Editor/admin/superuser : tout passe
    - Advertiser : OK uniquement si owner == request.user
    - Autres : refus
    """

    def has_object_permission(self, request, view, obj) -> bool:
        user = request.user
        if not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        if user.role in {User.Role.EDITOR, User.Role.ADMIN}:
            return True
        if user.role == User.Role.ADVERTISER:
            return obj.owner_id == user.id
        return False

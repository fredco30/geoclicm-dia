"""Permissions custom pour ads."""
from rest_framework import permissions

from apps.core.models import User


class IsAdvertiserOrTeam(permissions.BasePermission):
    """Auth + rôle advertiser/editor/admin requis."""

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


class IsCampaignOwnerOrTeam(permissions.BasePermission):
    """
    Object-level : un advertiser ne peut éditer que les campagnes dont
    il est propriétaire (via business.owner == request.user).
    Editor / admin / superuser : tout passe.
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
            return obj.business.owner_id == user.id
        return False

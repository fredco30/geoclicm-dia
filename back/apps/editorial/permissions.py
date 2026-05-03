"""Permissions DRF custom pour l'API editorial."""
from rest_framework import permissions

from apps.core.models import User


class IsEditorOrAdmin(permissions.BasePermission):
    """
    Lecture libre, écriture réservée aux editor/admin/superuser.

    Combine `IsAuthenticatedOrReadOnly` avec un check de rôle métier.
    """

    message = "Seuls les rédacteurs et administrateurs peuvent publier."

    def has_permission(self, request, view) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True
        if not request.user.is_authenticated:
            return False
        return getattr(request.user, "can_publish", False)


class IsAuthorOrReadOnly(permissions.BasePermission):
    """
    L'auteur peut éditer son propre article. Admin peut tout éditer.

    À combiner avec IsEditorOrAdmin via DEFAULT_PERMISSION_CLASSES.
    """

    def has_object_permission(self, request, view, obj) -> bool:
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        if not user.is_authenticated:
            return False
        if user.is_superuser or getattr(user, "role", None) == User.Role.ADMIN:
            return True
        return obj.author_id == user.id

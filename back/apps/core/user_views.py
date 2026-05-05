"""
ViewSet pour gérer les utilisateurs depuis le back-office custom (Sprint 2 anticipé).

Restreint aux superusers ou rôle admin (pas de promotion auto-permise).
"""
from __future__ import annotations

from django.db.models import Count
from rest_framework import permissions, serializers, viewsets

from .models import User


class IsSuperuserOrAdmin(permissions.BasePermission):
    """Seul un superuser ou un user avec role=admin peut gérer les comptes."""

    def has_permission(self, request, view) -> bool:
        if not request.user.is_authenticated:
            return False
        return request.user.is_superuser or request.user.role == User.Role.ADMIN


class UserAdminSerializer(serializers.ModelSerializer):
    """Serializer pour le back-office gestion comptes."""

    password = serializers.CharField(
        write_only=True, required=False, style={"input_type": "password"}
    )
    full_name = serializers.SerializerMethodField()
    # Nombre de fiches Business dont ce user est owner. Permet à l'admin de
    # voir d'un coup d'œil dans la liste les comptes annonceurs sans fiche
    # rattachée vs ceux qui gèrent une ou plusieurs fiches. Annoté via
    # Count("businesses") dans UserAdminViewSet.get_queryset.
    business_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = User
        fields = (
            "id", "username", "email", "first_name", "last_name", "full_name",
            "role", "phone",
            "is_active", "is_staff", "is_superuser",
            "is_email_verified",
            "password",
            "business_count",
            "date_joined", "last_login",
        )
        read_only_fields = (
            "id", "full_name", "business_count", "date_joined", "last_login",
        )

    def get_full_name(self, obj: User) -> str:
        return obj.get_full_name() or obj.username

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        if not password:
            raise serializers.ValidationError(
                {"password": "Mot de passe requis à la création."}
            )
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for k, v in validated_data.items():
            setattr(instance, k, v)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class UserAdminViewSet(viewsets.ModelViewSet):
    """
    /api/users/        — list/create
    /api/users/<id>/   — retrieve/update/delete
    """

    queryset = (
        User.objects.all()
        .annotate(business_count=Count("businesses"))
        .order_by("-date_joined")
    )
    serializer_class = UserAdminSerializer
    permission_classes = (IsSuperuserOrAdmin,)
    pagination_class = None  # liste courte typiquement (< 100 users sprint 1)

    def perform_destroy(self, instance):
        # Sécurité : impossible de se supprimer soi-même
        if instance.pk == self.request.user.pk:
            raise serializers.ValidationError(
                "Tu ne peux pas supprimer ton propre compte."
            )
        instance.delete()

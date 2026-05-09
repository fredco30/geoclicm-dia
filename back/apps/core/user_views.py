"""
ViewSet pour gérer les utilisateurs depuis le back-office custom.

Restreint aux superusers ou rôle admin (pas de promotion auto-permise).
Filtres URL :
  - ?role=team|advertiser|reader|inactive
  - ?search=<email|nom|username>
  - ?ordering=-last_login,-date_joined,email,...
  - ?page=N&page_size=50

Endpoint custom :
  - GET /api/users/counts/  →  {"all": X, "team": X, "advertiser": X,
                                "reader": X, "inactive": X}
"""
from __future__ import annotations

from django.db.models import Count, Q
from rest_framework import permissions, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

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


class UserAdminPagination(PageNumberPagination):
    """Pagination dédiée au back-office comptes — 50/page par défaut.

    page_size_query_param permet à un admin curieux de demander 200/page
    via ?page_size=200. Plafond à 200 pour ne pas dégrader les perfs si
    on grossit beaucoup en base.
    """

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


# Filtres role → conditions Q. Centralisé pour éviter duplication entre
# get_queryset et l'endpoint /counts/.
def _role_filter_q(role: str) -> Q | None:
    """Renvoie la clause Q correspondant à un filtre `?role=...`.

    Renvoie None si aucun filtre (= tous actifs).
    """
    if role == "team":
        return Q(is_active=True) & (
            Q(role__in=[User.Role.EDITOR, User.Role.ADMIN]) | Q(is_superuser=True)
        )
    if role == "advertiser":
        return Q(is_active=True, role=User.Role.ADVERTISER)
    if role == "reader":
        return Q(is_active=True, role=User.Role.READER)
    if role == "inactive":
        return Q(is_active=False)
    # Default : tous les comptes actifs
    return Q(is_active=True)


class UserAdminViewSet(viewsets.ModelViewSet):
    """
    /api/users/                 — list / create (paginé 50/page)
    /api/users/<id>/            — retrieve / update / delete
    /api/users/counts/          — compteurs pour les tabs UI
    """

    serializer_class = UserAdminSerializer
    permission_classes = (IsSuperuserOrAdmin,)
    pagination_class = UserAdminPagination

    # Champs autorisés au tri ?ordering=...
    _ALLOWED_ORDERING = {
        "email", "-email",
        "date_joined", "-date_joined",
        "last_login", "-last_login",
        "username", "-username",
    }

    def get_queryset(self):
        qs = (
            User.objects.all()
            .annotate(business_count=Count("businesses"))
        )

        # Filtre par rôle / statut
        role = (self.request.query_params.get("role") or "").strip()
        q = _role_filter_q(role)
        if q is not None:
            qs = qs.filter(q)

        # Recherche full-text simple sur email + nom + username
        search = (self.request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(
                Q(email__icontains=search)
                | Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(username__icontains=search)
            )

        # Tri
        ordering = (self.request.query_params.get("ordering") or "").strip()
        if ordering and ordering in self._ALLOWED_ORDERING:
            qs = qs.order_by(ordering, "-date_joined")
        else:
            qs = qs.order_by("-date_joined")

        return qs

    def perform_destroy(self, instance):
        # Sécurité : impossible de se supprimer soi-même
        if instance.pk == self.request.user.pk:
            raise serializers.ValidationError(
                "Tu ne peux pas supprimer ton propre compte."
            )
        instance.delete()

    @action(detail=False, methods=["get"], url_path="counts")
    def counts(self, request):
        """Compteurs pour alimenter les tabs UI sans charger la page entière.

        Retourne le nombre de comptes pour chaque catégorie de tab. Les
        comptes inactifs sont volontairement exclus de "all" pour que
        "all + inactive = total" et que l'admin distingue clairement les
        deux populations.
        """
        base = User.objects.filter(is_active=True)
        return Response({
            "all": base.count(),
            "team": base.filter(
                Q(role__in=[User.Role.EDITOR, User.Role.ADMIN]) | Q(is_superuser=True)
            ).count(),
            "advertiser": base.filter(role=User.Role.ADVERTISER).count(),
            "reader": base.filter(role=User.Role.READER).count(),
            "inactive": User.objects.filter(is_active=False).count(),
        })

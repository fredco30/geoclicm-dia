"""Réglages du site : identité visuelle (logo, nom, couleurs)."""
from __future__ import annotations

from django.conf import settings
from rest_framework import permissions, serializers
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import SiteSettings
from .user_views import IsSuperuserOrAdmin


class SiteSettingsSerializer(serializers.ModelSerializer):
    logo_url = serializers.SerializerMethodField()
    billing_enabled = serializers.SerializerMethodField()

    class Meta:
        model = SiteSettings
        fields = (
            "site_name", "tagline", "logo", "logo_url",
            "primary_color", "accent_color", "billing_enabled", "updated_at",
        )
        read_only_fields = ("updated_at",)
        extra_kwargs = {"logo": {"write_only": True, "required": False, "allow_null": True}}

    def get_logo_url(self, obj: SiteSettings) -> str | None:
        if not obj.logo:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.logo.url) if request else obj.logo.url

    def get_billing_enabled(self, obj: SiteSettings) -> bool:
        # Réglage serveur (.env BILLING_ENABLED), non modifiable ici :
        # l'ouverture du paiement suppose des clés Stripe LIVE configurées.
        return settings.BILLING_ENABLED


class SiteSettingsView(APIView):
    """GET public, PATCH réservé aux administrateurs : /api/site-settings/."""

    parser_classes = (JSONParser, MultiPartParser, FormParser)

    def get_permissions(self):
        if self.request.method in permissions.SAFE_METHODS:
            return [permissions.AllowAny()]
        return [IsSuperuserOrAdmin()]

    def get(self, request):
        return Response(SiteSettingsSerializer(SiteSettings.load(), context={"request": request}).data)

    def patch(self, request):
        obj = SiteSettings.load()
        serializer = SiteSettingsSerializer(
            obj, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        if "logo" in serializer.validated_data and not serializer.validated_data["logo"]:
            if obj.logo:
                obj.logo.delete(save=False)
        serializer.save()
        return Response(serializer.data)

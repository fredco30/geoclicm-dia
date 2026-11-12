"""Mot de passe oublié (back-office et espace annonceur).

- POST /api/auth/password-reset/          {email}
- POST /api/auth/password-reset/confirm/  {uid, token, password}

Le lien envoyé par email repose sur le jeton signé de Django : usage unique
(il change dès que le mot de passe change) et durée limitée
(PASSWORD_RESET_TIMEOUT). La première route répond toujours la même chose,
que le compte existe ou non, pour ne pas révéler les adresses inscrites.

Sans serveur d'envoi configuré (EMAIL_HOST dans le .env), la fonction est
désactivée : les pages invitent à contacter l'équipe.
"""
from __future__ import annotations

import hashlib
import logging

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.assistant.rate_limit import get_client_ip

from .models import SiteSettings, User

logger = logging.getLogger(__name__)

MAX_REQUESTS_PER_HOUR = 5
GENERIC_ANSWER = (
    "Si un compte existe avec cette adresse, un email contenant un lien de "
    "réinitialisation vient d'être envoyé."
)
DISABLED_ANSWER = (
    "La réinitialisation par email n'est pas disponible pour le moment. "
    "Contactez l'équipe pour obtenir un nouveau mot de passe."
)
INVALID_LINK = "Ce lien n'est plus valide. Refaites une demande de réinitialisation."


def _too_many_requests(request) -> bool:
    digest = hashlib.sha256(f"geoclicmedia-reset:{get_client_ip(request)}".encode())
    key = "auth:password-reset:" + digest.hexdigest()[:32]
    cache.add(key, 0, 3600)
    try:
        return cache.incr(key) > MAX_REQUESTS_PER_HOUR
    except ValueError:  # clé expirée entre add et incr
        cache.set(key, 1, 3600)
        return False


def reset_link(user: User) -> str:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    return f"{settings.SITE_URL}/advertiser/nouveau-mot-de-passe?uid={uid}&token={token}"


def _send_reset_email(user: User) -> None:
    site_name = SiteSettings.load().site_name
    hours = settings.PASSWORD_RESET_TIMEOUT // 3600
    send_mail(
        subject=f"{site_name} — réinitialisation de votre mot de passe",
        message=(
            f"Bonjour {user.first_name or ''}".rstrip() + ",\n\n"
            f"Vous avez demandé à réinitialiser le mot de passe de votre compte {site_name}.\n"
            "Cliquez sur ce lien pour en choisir un nouveau :\n\n"
            f"{reset_link(user)}\n\n"
            f"Ce lien est valable {hours} heures et ne fonctionne qu'une fois.\n"
            "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : "
            "votre mot de passe actuel reste inchangé.\n\n"
            f"L'équipe {site_name}"
        ),
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
    )


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetRequestView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        if not settings.PASSWORD_RESET_ENABLED:
            return Response(
                {"detail": DISABLED_ANSWER}, status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        if _too_many_requests(request):
            return Response(
                {"detail": "Trop de demandes. Réessayez dans une heure."},
                status=status.HTTP_429_TOO_MANY_REQUESTS,
            )
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = (
            User.objects.filter(email__iexact=serializer.validated_data["email"], is_active=True)
            .order_by("pk")
            .first()
        )
        if user is not None and user.has_usable_password():
            try:
                _send_reset_email(user)
            except Exception:  # noqa: BLE001 — même réponse, l'échec part dans les logs
                logger.exception("Email de réinitialisation non envoyé (utilisateur %s)", user.pk)
        return Response({"detail": GENERIC_ANSWER})


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})


class PasswordResetConfirmView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            user = User.objects.filter(
                pk=force_str(urlsafe_base64_decode(data["uid"])), is_active=True
            ).first()
        except (TypeError, ValueError, OverflowError, UnicodeDecodeError):
            user = None
        if user is None or not default_token_generator.check_token(user, data["token"]):
            return Response({"detail": INVALID_LINK}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(data["password"], user=user)
        except ValidationError as error:
            return Response({"password": list(error.messages)}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(data["password"])
        user.save(update_fields=["password"])
        return Response({"detail": "Votre mot de passe a été modifié. Vous pouvez vous connecter."})

"""
Auth API pour le back-office front Next.js.

Stratégie : Session Django classique (cookie HttpOnly, CSRF protégé).
Compatible SSR Next.js (cookie envoyé automatiquement avec credentials: 'include').

Endpoints :
- POST /api/auth/login/    {username, password}        → session + user
- POST /api/auth/logout/                                → clear session
- GET  /api/auth/me/                                    → user courant
- GET  /api/auth/csrf/                                  → set CSRF cookie
"""
from __future__ import annotations

from django.contrib.auth import authenticate, login, logout
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from django.utils.decorators import method_decorator
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import User


class UserMeSerializer(serializers.ModelSerializer):
    """Profil de l'utilisateur courant."""

    full_name = serializers.SerializerMethodField()
    can_publish = serializers.BooleanField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id", "username", "email", "first_name", "last_name", "full_name",
            "role", "phone", "avatar", "is_email_verified",
            "can_publish", "is_superuser", "is_staff",
        )

    def get_full_name(self, obj: User) -> str:
        return obj.get_full_name() or obj.username


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CSRFView(APIView):
    """GET /api/auth/csrf/ — pose le cookie csrftoken (à appeler avant POST /login/)."""

    permission_classes = (AllowAny,)

    def get(self, request):
        return Response({"csrftoken": get_token(request)})


class LoginView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = authenticate(
            request,
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
        )
        if user is None:
            return Response(
                {"detail": "Identifiants invalides."},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        if not user.is_active:
            return Response(
                {"detail": "Compte désactivé."},
                status=status.HTTP_403_FORBIDDEN,
            )

        login(request, user)
        return Response(UserMeSerializer(user).data)


class LogoutView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        logout(request)
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        return Response(UserMeSerializer(request.user).data)

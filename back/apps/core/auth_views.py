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
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
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


class AdvertiserRegisterSerializer(serializers.Serializer):
    """Inscription self-service annonceur — email comme identifiant."""

    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True, style={"input_type": "password"}, min_length=8
    )
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "Un compte existe déjà avec cet email."
            )
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError(
                "Cet identifiant est déjà pris."
            )
        return value.lower()

    def validate_password(self, value: str) -> str:
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e.messages))
        return value


class AdvertiserRegisterView(APIView):
    """
    POST /api/auth/register-advertiser/

    Inscription self-service pour un commerçant. Crée un User avec
    username=email, role='advertiser', et connecte automatiquement.

    Pour la phase pilote : pas de validation email obligatoire (Fred
    et la partenaire vérifient manuellement). À durcir au lancement
    commercial Pâques 2027 si besoin (envoi mail Brevo + token).
    """

    permission_classes = (AllowAny,)

    def post(self, request):
        serializer = AdvertiserRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = User.objects.create_user(
            username=data["email"],
            email=data["email"],
            password=data["password"],
            first_name=data["first_name"],
            last_name=data["last_name"],
            role=User.Role.ADVERTISER,
        )
        if data.get("phone"):
            user.phone = data["phone"]
            user.save(update_fields=["phone"])

        # Login auto pour passer directement au wizard
        login(request, user)
        return Response(
            UserMeSerializer(user).data, status=status.HTTP_201_CREATED
        )

"""Retired JSON endpoints: use the CSRF-protected HTML recovery workflow."""
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView


class PasswordResetRequestView(APIView):
    permission_classes = (AllowAny,)

    def post(self, request):
        return Response(
            {"detail": "Utilisez le formulaire de récupération.",
             "recovery_url": "/api/auth/recovery/"}, status=410,
        )


class PasswordResetConfirmView(PasswordResetRequestView):
    pass

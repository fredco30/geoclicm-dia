"""Public recovery forms. No account lookup in the HTTP request path."""

import ipaddress
import logging

from django import forms
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.views import (
    INTERNAL_RESET_SESSION_TOKEN,
    PasswordResetConfirmView,
)
from django.core.cache import cache
from django.db import transaction
from django.http import HttpResponseRedirect
from django.urls import reverse_lazy
from django.utils.crypto import salted_hmac
from django.utils.decorators import method_decorator
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect
from django.views.decorators.debug import sensitive_post_parameters
from django.views.generic import FormView, TemplateView

logger = logging.getLogger(__name__)
PUBLIC_ORIGIN = "https://media.geoclic.fr"
UNAVAILABLE = "Le service de récupération est temporairement indisponible. Réessayez plus tard."


def email_ready():
    """Require explicit activation and real SMTP configuration (also in workers)."""
    return bool(
        settings.ACCOUNT_RECOVERY_ENABLED
        and settings.EMAIL_BACKEND == "django.core.mail.backends.smtp.EmailBackend"
        and settings.EMAIL_HOST
        and settings.EMAIL_HOST_USER
        and settings.EMAIL_HOST_PASSWORD
        and settings.DEFAULT_FROM_EMAIL
        and (settings.EMAIL_USE_TLS != settings.EMAIL_USE_SSL)
    )


def allowed(scope, identity, limit, seconds=3600):
    # Redis add/incr are atomic across gunicorn processes.
    digest = salted_hmac("account-recovery", identity).hexdigest()
    key = f"account-recovery:{scope}:{digest}"
    if cache.add(key, 1, timeout=seconds):
        return True
    try:
        return cache.incr(key) <= limit
    except ValueError:  # Expired between add and incr: retry the atomic insertion.
        return cache.add(key, 1, timeout=seconds)


def client_ip(request):
    """Only loopback nginx may supply X-Real-IP; it overwrites that header."""
    peer = request.META.get("REMOTE_ADDR", "")
    try:
        if ipaddress.ip_address(peer).is_loopback:
            return str(ipaddress.ip_address(request.META.get("HTTP_X_REAL_IP", peer)))
        return str(ipaddress.ip_address(peer))
    except ValueError:
        return peer


def eligible(user):
    return user.is_active and user.has_usable_password()


class RecoveryForm(forms.Form):
    email = forms.EmailField(label="Adresse e-mail du compte", max_length=254)


@method_decorator(never_cache, name="dispatch")
@method_decorator(csrf_protect, name="dispatch")
class RecoveryView(FormView):
    template_name = "recovery/request.html"
    form_class = RecoveryForm
    success_url = reverse_lazy("recovery-sent")
    http_method_names = ["get", "post", "head", "options"]

    def post(self, request, *args, **kwargs):
        try:
            permitted = allowed("request-ip", client_ip(request), 10)
        except Exception:
            logger.error("Account recovery cache unavailable")
            permitted = None
        if permitted is None or not email_ready():
            return self.render_to_response(
                {"form": self.get_form(), "service_error": UNAVAILABLE}, status=503
            )
        if not permitted:
            return self.render_to_response(
                {
                    "form": self.get_form(),
                    "service_error": "Trop de demandes. Réessayez dans une heure.",
                },
                status=429,
            )
        return super().post(request, *args, **kwargs)

    def form_valid(self, form):
        from .tasks import send_account_recovery

        email = form.cleaned_data["email"].strip().lower()
        try:
            if allowed("request-email", email, 3):
                # Queue every syntactically valid email, including unknown addresses.
                send_account_recovery.apply_async(args=[email], retry=False)
        except Exception:
            logger.error("Account recovery queue unavailable")
            return self.render_to_response({"form": form, "service_error": UNAVAILABLE}, status=503)
        return HttpResponseRedirect(self.get_success_url())


@method_decorator(never_cache, name="dispatch")
class RecoverySentView(TemplateView):
    template_name = "recovery/sent.html"


@method_decorator(never_cache, name="dispatch")
@method_decorator(sensitive_post_parameters(), name="dispatch")
@method_decorator(csrf_protect, name="dispatch")
class RecoveryConfirmView(PasswordResetConfirmView):
    template_name = "recovery/confirm.html"
    success_url = reverse_lazy("recovery-complete")
    http_method_names = ["get", "post", "head", "options"]

    def dispatch(self, request, *args, **kwargs):
        try:
            permitted = allowed("confirm-ip", client_ip(request), 60)
        except Exception:
            logger.error("Account recovery cache unavailable")
            return self.render_to_response({"service_error": UNAVAILABLE}, status=503)
        if not permitted:
            return self.render_to_response(
                {"service_error": "Trop de tentatives. Réessayez dans une heure."}, status=429
            )
        return super().dispatch(request, *args, **kwargs)

    def get_user(self, uidb64):
        user = super().get_user(uidb64)
        return user if user is not None and eligible(user) else None

    def form_valid(self, form):
        # Serialize concurrent submissions and recheck after locking, not just on GET.
        with transaction.atomic():
            user = get_user_model().objects.select_for_update().filter(pk=self.user.pk).first()
            token = self.request.session.get(INTERNAL_RESET_SESSION_TOKEN)
            if (
                user is None
                or not eligible(user)
                or not self.token_generator.check_token(user, token)
            ):
                self.validlink = False
                return self.render_to_response(self.get_context_data(), status=400)
            form.user = user
            return super().form_valid(form)


@method_decorator(never_cache, name="dispatch")
class RecoveryCompleteView(TemplateView):
    template_name = "recovery/complete.html"

"""Account recovery mail is off the request path to avoid timing enumeration."""

import logging

from celery import shared_task
from django.conf import settings
from django.contrib.auth.forms import PasswordResetForm
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .recovery import PUBLIC_ORIGIN, email_ready

logger = logging.getLogger(__name__)


@shared_task(ignore_result=True)
def send_account_recovery(email):
    if not email_ready():
        logger.error("Account recovery email configuration unavailable")
        return
    # Django excludes inactive users and unusable passwords and compares emails safely.
    for user in PasswordResetForm().get_users(email):
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        url = PUBLIC_ORIGIN + reverse("recovery-confirm", args=[uid, token])
        body = (
            f"Bonjour,\n\nVotre identifiant geoclicMédia est : {user.get_username()}\n\n"
            f"Pour choisir un nouveau mot de passe :\n{url}\n\n"
            "Ce lien expire dans une heure et ne peut être utilisé qu'une fois.\n"
            "Si vous n'avez pas demandé cette récupération, ignorez ce message.\n"
            "Votre mot de passe reste inchangé tant que vous ne validez pas le formulaire.\n"
        )
        try:
            send_mail(
                "Récupération de votre accès geoclicMédia",
                body,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=False,
            )
        except Exception:
            # Avoid logging recipient, username, token, password or SMTP credentials.
            logger.error("Account recovery email delivery failed")

"""Mot de passe oublié : tests sans base (le modèle User est doublé)."""
import re
from types import SimpleNamespace
from unittest.mock import patch

from django.core import mail
from django.core.cache import cache
from django.test import SimpleTestCase, override_settings
from rest_framework.test import APIRequestFactory

from apps.core import password_reset_views as views
from apps.core.models import User

LOCMEM = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
STRONG_PASSWORD = "Camargue-Salins-2026!"


def make_user() -> User:
    user = User(pk=7, username="ana@example.org", email="ana@example.org", first_name="Ana")
    user.set_password("Ancien-Mot-De-Passe-1")
    return user


def manager_returning(user):
    queryset = SimpleNamespace(first=lambda: user)
    queryset.order_by = lambda *args: queryset
    return SimpleNamespace(filter=lambda **kwargs: queryset)


@override_settings(
    CACHES=LOCMEM,
    PASSWORD_RESET_ENABLED=True,
    SITE_URL="https://media.example",
    DEFAULT_FROM_EMAIL="Média <contact@example.org>",
)
class PasswordResetTests(SimpleTestCase):
    def setUp(self):
        cache.clear()
        self.factory = APIRequestFactory()
        patcher = patch.object(
            views.SiteSettings, "load", return_value=SimpleNamespace(site_name="Mon Média")
        )
        patcher.start()
        self.addCleanup(patcher.stop)

    def _request(self, user, email="ana@example.org"):
        request = self.factory.post("/api/auth/password-reset/", {"email": email}, format="json")
        with patch.object(views.User, "objects", manager_returning(user)):
            return views.PasswordResetRequestView.as_view()(request)

    def _confirm(self, user, **payload):
        request = self.factory.post("/api/auth/password-reset/confirm/", payload, format="json")
        with patch.object(views.User, "objects", manager_returning(user)):
            return views.PasswordResetConfirmView.as_view()(request)

    def _link_parts(self):
        match = re.search(r"uid=([^&\s]+)&token=(\S+)", mail.outbox[0].body)
        return match.group(1), match.group(2)

    def test_known_email_receives_a_working_link(self):
        user = make_user()
        response = self._request(user)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["ana@example.org"])
        self.assertIn("https://media.example/advertiser/nouveau-mot-de-passe?uid=", mail.outbox[0].body)

        uid, token = self._link_parts()
        with patch.object(User, "save") as save:
            confirm = self._confirm(user, uid=uid, token=token, password=STRONG_PASSWORD)
        self.assertEqual(confirm.status_code, 200)
        save.assert_called_once()
        self.assertTrue(user.check_password(STRONG_PASSWORD))
        # Le mot de passe a changé : le même lien ne fonctionne plus.
        again = self._confirm(user, uid=uid, token=token, password="Autre-Mot-De-Passe-2")
        self.assertEqual(again.status_code, 400)

    def test_unknown_email_gets_the_same_answer_and_no_email(self):
        known = self._request(make_user())
        unknown = self._request(None, email="inconnu@example.org")
        self.assertEqual(unknown.status_code, 200)
        self.assertEqual(unknown.data, known.data)
        self.assertEqual(len(mail.outbox), 1)

    def test_email_failure_does_not_leak(self):
        with patch.object(views, "send_mail", side_effect=OSError("smtp down")):
            response = self._request(make_user())
        self.assertEqual(response.status_code, 200)

    @override_settings(PASSWORD_RESET_ENABLED=False)
    def test_disabled_without_mail_server(self):
        response = self._request(make_user())
        self.assertEqual(response.status_code, 503)
        self.assertEqual(len(mail.outbox), 0)

    def test_requests_are_rate_limited(self):
        for _ in range(views.MAX_REQUESTS_PER_HOUR):
            self.assertEqual(self._request(None).status_code, 200)
        self.assertEqual(self._request(None).status_code, 429)

    def test_invalid_token_or_uid_rejected(self):
        user = make_user()
        self._request(user)
        uid, _token = self._link_parts()
        self.assertEqual(
            self._confirm(user, uid=uid, token="faux-jeton", password=STRONG_PASSWORD).status_code,
            400,
        )
        self.assertEqual(
            self._confirm(None, uid="%%%", token="x", password=STRONG_PASSWORD).status_code, 400
        )
        self.assertTrue(user.check_password("Ancien-Mot-De-Passe-1"))

    def test_weak_password_rejected_with_reason(self):
        user = make_user()
        self._request(user)
        uid, token = self._link_parts()
        with patch.object(User, "save") as save:
            response = self._confirm(user, uid=uid, token=token, password="123")
        self.assertEqual(response.status_code, 400)
        self.assertIn("password", response.data)
        save.assert_not_called()

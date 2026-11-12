"""Legacy JSON endpoints cannot bypass the canonical recovery workflow."""
from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.test import APIRequestFactory

from apps.core.password_reset_views import PasswordResetConfirmView, PasswordResetRequestView


class LegacyPasswordResetTests(SimpleTestCase):
    def test_legacy_endpoints_return_recovery_url_without_sending_or_changing_password(self):
        for view in [PasswordResetRequestView, PasswordResetConfirmView]:
            request = APIRequestFactory().post("/", {"email": "unknown@example.test"})
            with patch("django.core.mail.send_mail") as mail:
                response = view.as_view()(request)
            self.assertEqual(response.status_code, 410)
            self.assertEqual(response.data["recovery_url"], "/api/auth/recovery/")
            mail.assert_not_called()

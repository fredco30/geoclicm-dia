"""Run with config.settings.recovery_test; real Django auth, forms and tokens."""

from datetime import datetime, timedelta
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.test import Client, RequestFactory, TestCase, override_settings
from django.urls import reverse
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .recovery import allowed, client_ip
from .tasks import send_account_recovery


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.smtp.EmailBackend",
    EMAIL_HOST="smtp.example.test", EMAIL_HOST_USER="test-user",
    EMAIL_HOST_PASSWORD="local-placeholder", DEFAULT_FROM_EMAIL="media@example.test",
    EMAIL_USE_TLS=True, EMAIL_USE_SSL=False, ACCOUNT_RECOVERY_ENABLED=True,
    PASSWORD_RESET_TIMEOUT=3600,
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
)
class RecoveryTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = get_user_model().objects.create_user(
            username="test-admin", email="admin@example.test", password="Old!7-secret-test"
        )
        self.user.is_staff = True
        self.user.save()
        self.request_url = reverse("recovery-request")

    def reset_url(self, user=None, token=None):
        user = user or self.user
        return reverse(
            "recovery-confirm",
            args=[
                urlsafe_base64_encode(force_bytes(user.pk)),
                token or default_token_generator.make_token(user),
            ],
        )

    def confirm(self, client=None, url=None, password="New!8-secret-different"):
        client = client or self.client
        page = client.get(url or self.reset_url())
        return client.post(page.url, {"new_password1": password, "new_password2": password})

    @patch("apps.core.tasks.send_account_recovery.apply_async")
    def test_known_unknown_inactive_and_unusable_requests_identical(self, queue):
        disabled = get_user_model().objects.create_user(
            "disabled", "disabled@example.test", "old-password", is_active=False
        )
        unusable = get_user_model().objects.create_user("external", "external@example.test")
        for email in [self.user.email, "unknown@example.test", disabled.email, unusable.email]:
            response = self.client.post(self.request_url, {"email": email})
            self.assertRedirects(response, reverse("recovery-sent"))
        self.assertEqual(queue.call_count, 4)
        self.assertNotContains(self.client.get(reverse("recovery-sent")), self.user.username)

    @patch("apps.core.tasks.send_mail")
    def test_email_contains_username_and_fixed_trusted_origin(self, mail):
        send_account_recovery.run("ADMIN@example.test")
        body = mail.call_args.args[1]
        self.assertIn(self.user.username, body)
        self.assertIn("https://media.geoclic.fr/api/auth/reset/", body)
        self.assertNotIn("Old!7-secret-test", body)
        self.assertEqual(mail.call_args.args[3], [self.user.email])
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Old!7-secret-test"))

    @patch("apps.core.tasks.send_mail")
    def test_worker_skips_unknown_inactive_and_unusable(self, mail):
        send_account_recovery.run("missing@example.test")
        self.user.is_active = False
        self.user.save()
        send_account_recovery.run(self.user.email)
        self.user.is_active = True
        self.user.set_unusable_password()
        self.user.save()
        send_account_recovery.run(self.user.email)
        mail.assert_not_called()

    @override_settings(EMAIL_HOST="", EMAIL_HOST_USER="", EMAIL_HOST_PASSWORD="")
    @patch("apps.core.tasks.send_account_recovery.apply_async")
    def test_unconfigured_email_honest_generic_unavailable(self, queue):
        first = self.client.post(self.request_url, {"email": self.user.email})
        second = self.client.post(self.request_url, {"email": "unknown@example.test"})
        self.assertEqual(first.status_code, 503)
        self.assertEqual(second.status_code, 503)
        self.assertContains(first, "temporairement indisponible", status_code=503)
        queue.assert_not_called()

    @override_settings(ACCOUNT_RECOVERY_ENABLED=False)
    def test_feature_disabled(self):
        self.assertEqual(
            self.client.post(self.request_url, {"email": self.user.email}).status_code, 503
        )

    @patch("apps.core.tasks.send_account_recovery.apply_async", side_effect=OSError)
    def test_queue_failure_is_unavailable(self, queue):
        self.assertEqual(
            self.client.post(self.request_url, {"email": self.user.email}).status_code, 503
        )

    @patch("apps.core.recovery.cache.add", side_effect=OSError)
    def test_cache_failure_fails_closed(self, cache_add):
        self.assertEqual(
            self.client.post(self.request_url, {"email": self.user.email}).status_code, 503
        )
        self.assertEqual(self.client.get(self.reset_url()).status_code, 503)

    @patch("apps.core.tasks.send_account_recovery.apply_async")
    def test_per_email_limit_identical_success_without_extra_mail(self, queue):
        for index in range(4):
            response = self.client.post(
                self.request_url, {"email": "ADMIN@example.test"}, REMOTE_ADDR=f"192.0.2.{index}"
            )
            self.assertEqual(response.status_code, 302)
        self.assertEqual(queue.call_count, 3)

    @patch("apps.core.tasks.send_account_recovery.apply_async")
    def test_ip_limit_and_spoofed_forwarded_ip(self, queue):
        for index in range(10):
            self.client.post(self.request_url, {"email": f"unknown{index}@example.test"})
        response = self.client.post(
            self.request_url, {"email": self.user.email}, HTTP_X_FORWARDED_FOR="192.0.2.10"
        )
        self.assertEqual(response.status_code, 429)
        self.assertEqual(queue.call_count, 10)

    def test_get_never_changes_password_or_sends_email(self):
        original = self.user.password
        with patch("apps.core.tasks.send_account_recovery.apply_async") as queue:
            self.client.get(self.request_url)
            self.client.get(self.reset_url(), follow=True)
            queue.assert_not_called()
        self.user.refresh_from_db()
        self.assertEqual(self.user.password, original)

    def test_success_invalidates_token_and_old_authenticated_session(self):
        old_session = Client()
        old_session.force_login(self.user)
        url = self.reset_url()
        response = self.confirm(url=url)
        self.assertRedirects(response, reverse("recovery-complete"))
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("New!8-secret-different"))
        self.assertNotIn("_auth_user_id", self.client.session)
        self.assertNotContains(Client().get(url), "new_password1")
        from django.contrib.auth import get_user

        request = old_session.get(self.request_url).wsgi_request
        self.assertFalse(get_user(request).is_authenticated)

    def test_weak_password_rejected(self):
        response = self.confirm(password="123")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.context["form"].errors)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Old!7-secret-test"))

    def test_expired_token_and_malformed_uid_rejected(self):
        now = datetime(2026, 11, 12, 12)
        with patch.object(default_token_generator, "_now", return_value=now):
            url = self.reset_url()
        with patch.object(
            default_token_generator, "_now", return_value=now + timedelta(seconds=3601)
        ):
            self.assertNotContains(self.client.get(url), "new_password1")
        self.assertNotContains(
            self.client.get(reverse("recovery-confirm", args=["bad", "bad"])), "new_password1"
        )

    def test_disabled_user_cannot_use_existing_token(self):
        url = self.reset_url()
        self.user.is_active = False
        self.user.save()
        self.assertNotContains(self.client.get(url), "new_password1")

    def test_second_open_form_rejected_after_first_reset(self):
        second_client = Client()
        url = self.reset_url()
        second_form = second_client.get(url).url
        self.confirm(url=url)
        response = second_client.post(
            second_form,
            {"new_password1": "Other!9-new-secret", "new_password2": "Other!9-new-secret"},
        )
        self.assertNotContains(response, "new_password1")
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("New!8-secret-different"))

    def test_csrf_required_for_both_forms(self):
        client = Client(enforce_csrf_checks=True)
        self.assertEqual(client.post(self.request_url, {"email": self.user.email}).status_code, 403)
        page = client.get(self.reset_url())
        self.assertEqual(client.post(page.url, {"new_password1": "irrelevant"}).status_code, 403)

    def test_throttle_counter(self):
        self.assertTrue(allowed("test", "identity", 2))
        self.assertTrue(allowed("test", "identity", 2))
        self.assertFalse(allowed("test", "identity", 2))

    def test_confirm_limit(self):
        with patch("apps.core.recovery.allowed", return_value=False):
            self.assertEqual(self.client.get(self.reset_url()).status_code, 429)

    def test_proxy_ip_only_trusted_from_loopback(self):
        factory = RequestFactory()
        for peer in ["127.0.0.1", "::1"]:
            request = factory.get("/", REMOTE_ADDR=peer, HTTP_X_REAL_IP="192.0.2.20")
            self.assertEqual(client_ip(request), "192.0.2.20")
        request = factory.get("/", REMOTE_ADDR="192.0.2.1", HTTP_X_REAL_IP="192.0.2.20")
        self.assertEqual(client_ip(request), "192.0.2.1")
        request = factory.get("/", REMOTE_ADDR="127.0.0.1", HTTP_X_REAL_IP="invalid")
        self.assertEqual(client_ip(request), "127.0.0.1")

    @patch("apps.core.tasks.send_account_recovery.apply_async")
    def test_proxy_visitors_have_distinct_ip_limits(self, queue):
        for index in range(10):
            self.client.post(
                self.request_url, {"email": f"x{index}@example.test"}, HTTP_X_REAL_IP="192.0.2.1"
            )
        response = self.client.post(
            self.request_url, {"email": "other@example.test"}, HTTP_X_REAL_IP="192.0.2.2"
        )
        self.assertEqual(response.status_code, 302)

    def test_recheck_under_lock_rejects_token_changed_after_dispatch(self):
        page = self.client.get(self.reset_url())
        changed = get_user_model().objects.get(pk=self.user.pk)
        changed.set_password("A-different-concurrent-change!5")
        with patch.object(get_user_model().objects, "select_for_update") as locked:
            locked.return_value.filter.return_value.first.return_value = changed
            response = self.client.post(
                page.url,
                {
                    "new_password1": "New!8-secret-different",
                    "new_password2": "New!8-secret-different",
                },
            )
        self.assertEqual(response.status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Old!7-secret-test"))

    def test_csrf_protected_successful_round_trip(self):
        client = Client(enforce_csrf_checks=True)
        page = client.get(self.reset_url(), follow=True)
        response = client.post(
            page.request["PATH_INFO"],
            {
                "csrfmiddlewaretoken": client.cookies["csrftoken"].value,
                "new_password1": "New!8-secret-different",
                "new_password2": "New!8-secret-different",
            },
        )
        self.assertRedirects(response, reverse("recovery-complete"))

    @override_settings(EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend")
    @patch("apps.core.tasks.email_ready", return_value=True)
    def test_real_email_rendering_and_multiple_accounts(self, ready):
        from django.core import mail

        get_user_model().objects.create_user("second-admin", self.user.email, "old-secret")
        send_account_recovery.run(self.user.email)
        self.assertEqual(len(mail.outbox), 2)
        self.assertTrue(any("second-admin" in message.body for message in mail.outbox))
        for message in mail.outbox:
            self.assertIn("https://media.geoclic.fr/api/auth/reset/", message.body)

    @patch("apps.core.tasks.send_mail", side_effect=OSError("smtp failure"))
    def test_smtp_failure_does_not_change_password_or_log_credentials(self, mail):
        with self.assertLogs("apps.core.tasks", level="ERROR") as captured:
            send_account_recovery.run(self.user.email)
        self.assertNotIn(self.user.email, "".join(captured.output))
        self.assertNotIn("smtp failure", "".join(captured.output))
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password("Old!7-secret-test"))

    def test_symbol_and_minimum_length_required(self):
        for password in ['Abcdef12', 'Ab!12']:
            response = self.confirm(password=password)
            self.assertEqual(response.status_code, 200)
            self.user.refresh_from_db()
            self.assertTrue(self.user.check_password('Old!7-secret-test'))
        self.assertRedirects(self.confirm(password='Xq7!vK2r'), reverse('recovery-complete'))

    def test_recovery_referrer_policy_preserves_same_origin_forms(self):
        response = self.client.get(self.request_url)
        self.assertContains(response, '<meta name="referrer" content="same-origin">')
        self.assertNotContains(response, 'content="no-referrer"')

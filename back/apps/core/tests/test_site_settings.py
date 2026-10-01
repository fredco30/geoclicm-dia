from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from apps.core.models import SiteSettings, User


class SiteSettingsApiTests(TestCase):
    def test_public_read_with_defaults(self):
        data = APIClient().get("/api/site-settings/").json()
        self.assertEqual(data["site_name"], "geoclicMédia")
        self.assertEqual(data["primary_color"], SiteSettings.DEFAULT_PRIMARY)
        self.assertIsNone(data["logo_url"])
        self.assertFalse(data["billing_enabled"])

    def test_only_admins_can_update(self):
        client = APIClient()
        client.force_authenticate(User.objects.create_user("ed", password="x", role=User.Role.EDITOR))
        self.assertEqual(client.patch("/api/site-settings/", {"site_name": "X"}, format="json").status_code, 403)
        client.force_authenticate(User.objects.create_user("ad", password="x", role=User.Role.ADMIN))
        res = client.patch(
            "/api/site-settings/", {"site_name": "Camargue Média", "primary_color": "#225577"}, format="json"
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(SiteSettings.load().site_name, "Camargue Média")

    def test_invalid_color_rejected(self):
        client = APIClient()
        client.force_authenticate(User.objects.create_user("ad", password="x", role=User.Role.ADMIN))
        res = client.patch("/api/site-settings/", {"primary_color": "red;}body{x"}, format="json")
        self.assertEqual(res.status_code, 400)

    @override_settings(MEDIA_ROOT="/tmp/claude-0/test-media-site")
    def test_logo_upload_and_removal(self):
        client = APIClient()
        client.force_authenticate(User.objects.create_user("ad", password="x", role=User.Role.ADMIN))
        buffer = BytesIO()
        Image.new("RGB", (10, 10), "blue").save(buffer, "PNG")
        logo = SimpleUploadedFile("logo.png", buffer.getvalue(), content_type="image/png")
        res = client.patch("/api/site-settings/", {"logo": logo}, format="multipart")
        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.json()["logo_url"].endswith(".png"))
        res = client.patch("/api/site-settings/", {"logo": ""}, format="multipart")
        self.assertIsNone(res.json()["logo_url"])

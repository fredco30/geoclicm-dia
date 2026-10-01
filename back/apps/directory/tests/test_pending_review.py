"""Relecture des modifications d'une fiche publiée par son annonceur."""
import shutil
import tempfile
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient

from apps.core.models import Commune, User
from apps.directory.models import Business, BusinessCategory

MEDIA = tempfile.mkdtemp()


def png(name="logo.png"):
    buffer = BytesIO()
    Image.new("RGB", (20, 20), "red").save(buffer, "PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")


@override_settings(MEDIA_ROOT=MEDIA)
class PendingReviewTests(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        commune = Commune.objects.create(
            name="Le Grau-du-Roi", slug="le-grau-du-roi", insee_code="30133", department="30"
        )
        category = BusinessCategory.objects.create(name="Glacier", slug="glacier")
        self.owner = User.objects.create_user("glacier@example.org", password="x", role=User.Role.ADVERTISER)
        self.editor = User.objects.create_user("redac", password="x", role=User.Role.EDITOR)
        self.business = Business.objects.create(
            name="Glaces du Port", slug="glaces-du-port", category=category, commune=commune,
            short_description="Glaces artisanales", description="x", address="Quai",
            postal_code="30240", city="Le Grau-du-Roi", owner=self.owner, is_published=True,
        )
        self.owner_client = APIClient()
        self.owner_client.force_authenticate(self.owner)
        self.team_client = APIClient()
        self.team_client.force_authenticate(self.editor)
        self.url = "/api/advertiser/businesses/glaces-du-port/"

    def test_edit_of_published_fiche_waits_for_review(self):
        res = self.owner_client.patch(self.url, {"short_description": "Meilleures glaces !"}, format="json")
        self.assertEqual(res.status_code, 202)
        self.assertEqual(res.json()["pending_review"]["changes"]["short_description"], "Meilleures glaces !")
        self.business.refresh_from_db()
        self.assertEqual(self.business.short_description, "Glaces artisanales")
        public = APIClient().get("/api/businesses/glaces-du-port/").json()
        self.assertEqual(public["short_description"], "Glaces artisanales")
        self.assertNotIn("pending_review", public)

        # Une seconde modification se cumule à la première.
        self.owner_client.patch(self.url, {"phone": "0466000000"}, format="json")
        self.business.refresh_from_db()
        self.assertEqual(set(self.business.pending_changes), {"short_description", "phone"})
        counts = self.team_client.get("/api/admin/pending-counts/").json()
        self.assertEqual(counts["business_changes"], 1)

        res = self.team_client.post("/api/businesses/glaces-du-port/apply-pending/")
        self.assertEqual(res.status_code, 200)
        self.business.refresh_from_db()
        self.assertEqual(self.business.short_description, "Meilleures glaces !")
        self.assertEqual(self.business.phone, "0466000000")
        self.assertIsNone(self.business.pending_changes)

    def test_discard_keeps_published_version(self):
        self.owner_client.patch(self.url, {"name": "Autre nom"}, format="json")
        res = self.team_client.post("/api/businesses/glaces-du-port/discard-pending/")
        self.assertEqual(res.status_code, 200)
        self.business.refresh_from_db()
        self.assertEqual(self.business.name, "Glaces du Port")
        self.assertIsNone(self.business.pending_changes)

    def test_new_image_is_held_then_published(self):
        res = self.owner_client.patch(self.url, {"logo": png()}, format="multipart")
        self.assertEqual(res.status_code, 202)
        self.business.refresh_from_db()
        self.assertFalse(self.business.logo)
        self.assertTrue(self.business.pending_logo)
        self.team_client.post("/api/businesses/glaces-du-port/apply-pending/")
        self.business.refresh_from_db()
        self.assertTrue(self.business.logo.name.startswith("businesses/pending/"))
        self.assertFalse(self.business.pending_logo)

    def test_unpublished_fiche_is_edited_directly(self):
        Business.objects.filter(pk=self.business.pk).update(is_published=False)
        res = self.owner_client.patch(self.url, {"name": "Nouveau nom"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.business.refresh_from_db()
        self.assertEqual(self.business.name, "Nouveau nom")

    def test_team_edits_apply_directly(self):
        res = self.team_client.patch(self.url, {"name": "Corrigé"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.business.refresh_from_db()
        self.assertEqual(self.business.name, "Corrigé")

    def test_advertiser_cannot_apply_own_changes(self):
        self.owner_client.patch(self.url, {"name": "Autre"}, format="json")
        res = self.owner_client.post("/api/businesses/glaces-du-port/apply-pending/")
        self.assertEqual(res.status_code, 403)

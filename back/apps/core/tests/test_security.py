"""Tests de permissions et d'anti-abus (audit septembre 2026)."""
from datetime import timedelta

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import RequestFactory, TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.ads.models import AdCampaign
from apps.assistant.rate_limit import get_client_ip
from apps.core.models import Commune, User
from apps.directory.models import Business, BusinessCategory

LOCMEM = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
STRONG_PASSWORD = "Camargue-Salins-2026!"
GIF = (
    b"GIF89a\x01\x00\x01\x00\x80\x00\x00\x00\x00\x00\xff\xff\xff!\xf9\x04"
    b"\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;"
)


def make_user(username, **extra):
    return User.objects.create_user(username=username, password=STRONG_PASSWORD, **extra)


@override_settings(CACHES=LOCMEM)
class UserAdminPermissionTests(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = make_user("admin", role=User.Role.ADMIN)
        self.root = User.objects.create_superuser("root", "root@example.org", STRONG_PASSWORD)
        self.editor = make_user("editor", role=User.Role.EDITOR)
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_admin_cannot_grant_superuser(self):
        self.client.patch(f"/api/users/{self.editor.pk}/", {"is_superuser": True}, format="json")
        self.editor.refresh_from_db()
        self.assertFalse(self.editor.is_superuser)

    def test_admin_cannot_grant_staff(self):
        res = self.client.patch(f"/api/users/{self.editor.pk}/", {"is_staff": True}, format="json")
        self.assertEqual(res.status_code, 400)
        self.editor.refresh_from_db()
        self.assertFalse(self.editor.is_staff)

    def test_admin_can_resend_unchanged_staff_flag(self):
        res = self.client.patch(
            f"/api/users/{self.editor.pk}/",
            {"first_name": "Léa", "is_staff": False},
            format="json",
        )
        self.assertEqual(res.status_code, 200)

    def test_admin_cannot_edit_or_delete_superuser(self):
        res = self.client.patch(f"/api/users/{self.root.pk}/", {"first_name": "X"}, format="json")
        self.assertEqual(res.status_code, 403)
        res = self.client.delete(f"/api/users/{self.root.pk}/")
        self.assertEqual(res.status_code, 403)
        self.assertTrue(User.objects.filter(pk=self.root.pk).exists())

    def test_superuser_can_grant_staff(self):
        self.client.force_authenticate(self.root)
        res = self.client.patch(f"/api/users/{self.editor.pk}/", {"is_staff": True}, format="json")
        self.assertEqual(res.status_code, 200)

    def test_weak_password_rejected(self):
        res = self.client.post(
            "/api/users/",
            {"username": "weak", "email": "weak@example.org", "role": "editor", "password": "12345678"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("password", res.json())

    def test_inactive_user_detail_is_reachable(self):
        self.editor.is_active = False
        self.editor.save()
        res = self.client.get(f"/api/users/{self.editor.pk}/")
        self.assertEqual(res.status_code, 200)
        res = self.client.patch(f"/api/users/{self.editor.pk}/", {"is_active": True}, format="json")
        self.assertEqual(res.status_code, 200)
        self.editor.refresh_from_db()
        self.assertTrue(self.editor.is_active)
        # La liste par défaut reste limitée aux comptes actifs.
        self.editor.is_active = False
        self.editor.save()
        ids = [u["id"] for u in self.client.get("/api/users/").json()["results"]]
        self.assertNotIn(self.editor.pk, ids)


@override_settings(CACHES=LOCMEM)
class AdvertiserCampaignTests(TestCase):
    def setUp(self):
        cache.clear()
        commune = Commune.objects.create(
            name="Le Grau-du-Roi", slug="le-grau-du-roi", insee_code="30133", department="30"
        )
        category = BusinessCategory.objects.create(name="Restauration", slug="restauration")
        self.owner = make_user("owner", role=User.Role.ADVERTISER)
        self.rival = make_user("rival", role=User.Role.ADVERTISER)

        def business(name, owner):
            return Business.objects.create(
                name=name, slug=name.lower(), category=category, commune=commune,
                short_description="x", description="x", address="1 quai",
                postal_code="30240", city="Le Grau-du-Roi", owner=owner,
            )

        self.own_business = business("Mine", self.owner)
        self.rival_business = business("Rival", self.rival)
        now = timezone.now()
        self.campaign = AdCampaign.objects.create(
            business=self.own_business, name="Été", placement="home_sidebar",
            image=SimpleUploadedFile("a.gif", GIF, content_type="image/gif"),
            target_url="https://example.org", starts_at=now,
            ends_at=now + timedelta(days=30), is_active=True, is_paid=True,
        )
        self.client = APIClient()
        self.client.force_authenticate(self.owner)
        self.url = f"/api/advertiser/ad-campaigns/{self.campaign.pk}/"

    def test_cannot_move_campaign_to_rival_business(self):
        res = self.client.patch(self.url, {"business": self.rival_business.pk}, format="json")
        self.assertEqual(res.status_code, 403)
        self.campaign.refresh_from_db()
        self.assertEqual(self.campaign.business_id, self.own_business.pk)

    def test_edit_suspends_campaign_until_review(self):
        res = self.client.patch(self.url, {"target_url": "https://phishing.example"}, format="json")
        self.assertEqual(res.status_code, 200)
        self.campaign.refresh_from_db()
        self.assertFalse(self.campaign.is_active)
        self.assertTrue(self.campaign.is_paid)

    def test_rival_cannot_see_campaign(self):
        self.client.force_authenticate(self.rival)
        self.assertEqual(self.client.get(self.url).status_code, 404)


@override_settings(CACHES=LOCMEM, LOGIN_MAX_FAILURES=3)
class LoginThrottleTests(TestCase):
    def setUp(self):
        cache.clear()
        make_user("fred")
        self.client = APIClient()

    def login(self, password):
        return self.client.post(
            "/api/auth/login/", {"username": "fred", "password": password}, format="json"
        )

    def test_blocks_after_repeated_failures(self):
        for _ in range(3):
            self.assertEqual(self.login("wrong").status_code, 401)
        self.assertEqual(self.login(STRONG_PASSWORD).status_code, 429)

    def test_success_resets_counter(self):
        self.login("wrong")
        self.login("wrong")
        self.assertEqual(self.login(STRONG_PASSWORD).status_code, 200)
        self.client.logout()
        self.login("wrong")
        self.login("wrong")
        self.assertEqual(self.login(STRONG_PASSWORD).status_code, 200)


class ClientIpTests(TestCase):
    def test_spoofed_forwarded_for_is_ignored(self):
        request = RequestFactory().get(
            "/", HTTP_X_FORWARDED_FOR="1.2.3.4, 203.0.113.9", HTTP_X_REAL_IP="203.0.113.9"
        )
        self.assertEqual(get_client_ip(request), "203.0.113.9")

    def test_falls_back_to_last_forwarded_hop(self):
        request = RequestFactory().get("/", HTTP_X_FORWARDED_FOR="1.2.3.4, 203.0.113.9")
        self.assertEqual(get_client_ip(request), "203.0.113.9")


@override_settings(CACHES=LOCMEM)
class PendingCountsAndPaginationTests(TestCase):
    def test_pending_counts_requires_team(self):
        client = APIClient()
        self.assertIn(client.get("/api/admin/pending-counts/").status_code, (401, 403))
        client.force_authenticate(make_user("adv", role=User.Role.ADVERTISER))
        self.assertEqual(client.get("/api/admin/pending-counts/").status_code, 403)
        client.force_authenticate(make_user("ed", role=User.Role.EDITOR))
        res = client.get("/api/admin/pending-counts/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(set(res.json()), {"events", "places", "businesses", "listings"})

    def test_page_size_param_honoured_and_capped(self):
        commune = Commune.objects.create(
            name="Lunel", slug="lunel", insee_code="34145", department="34"
        )
        category = BusinessCategory.objects.create(name="Mode", slug="mode")
        for i in range(25):
            Business.objects.create(
                name=f"B{i}", slug=f"b{i}", category=category, commune=commune,
                short_description="x", description="x", address="x",
                postal_code="34400", city="Lunel", is_published=True,
            )
        client = APIClient()
        default = client.get("/api/businesses/").json()
        self.assertEqual(len(default["results"]), 20)
        big = client.get("/api/businesses/?page_size=500").json()
        self.assertEqual(len(big["results"]), 25)
        self.assertIsNone(big["next"])


class BusinessPrivacyTests(TestCase):
    def test_public_api_hides_owner_and_plan_dates(self):
        commune = Commune.objects.create(
            name="Lunel", slug="lunel", insee_code="34145", department="34"
        )
        category = BusinessCategory.objects.create(name="Mode", slug="mode")
        owner = make_user("commercant@example.org", role=User.Role.ADVERTISER)
        Business.objects.create(
            name="Boutique", slug="boutique", category=category, commune=commune,
            short_description="x", description="x", address="x", postal_code="34400",
            city="Lunel", owner=owner, is_published=True, plan="premium",
            plan_ends_at=timezone.now() + timedelta(days=30),
        )
        client = APIClient()
        listed = client.get("/api/businesses/").json()["results"][0]
        detail = client.get("/api/businesses/boutique/").json()
        for payload in (listed, detail):
            self.assertEqual(payload["plan"], "premium")
            for field in ("owner", "owner_username", "plan_ends_at"):
                self.assertNotIn(field, payload)
        client.force_authenticate(owner)
        self.assertIn("plan_ends_at", client.get("/api/businesses/boutique/").json())

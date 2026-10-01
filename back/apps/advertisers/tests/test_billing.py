from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.advertisers.models import Subscription
from apps.advertisers.tasks import expire_business_plans
from apps.core.models import Commune, User
from apps.directory.models import Business, BusinessCategory


def make_business(owner=None, **extra):
    commune, _ = Commune.objects.get_or_create(
        slug="vauvert", defaults={"name": "Vauvert", "insee_code": "30341", "department": "30"}
    )
    category, _ = BusinessCategory.objects.get_or_create(slug="mode", defaults={"name": "Mode"})
    n = Business.objects.count()
    return Business.objects.create(
        name=f"B{n}", slug=f"b{n}", category=category, commune=commune,
        short_description="x", description="x", address="x", postal_code="30600",
        city="Vauvert", owner=owner, **extra,
    )


class PlanExpiryTests(TestCase):
    def test_expired_plans_fall_back_to_free(self):
        now = timezone.now()
        expired = make_business(plan="premium", plan_ends_at=now - timedelta(days=10))
        grace = make_business(plan="basic", plan_ends_at=now - timedelta(days=1))
        no_end = make_business(plan="premium", plan_ends_at=None)
        self.assertEqual(expire_business_plans(), 1)
        for business, plan in ((expired, "free"), (grace, "basic"), (no_end, "premium")):
            business.refresh_from_db()
            self.assertEqual(business.plan, plan)


@override_settings(STRIPE_TEST_SECRET_KEY="sk_test_dummy", BILLING_ENABLED=True)
class CheckoutGuardTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user("adv", password="x", role=User.Role.ADVERTISER)
        self.business = make_business(owner=self.user)
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    @patch.dict("apps.advertisers.views.PLAN_TO_PRICE_ID", {"basic": "price_basic"})
    def test_second_checkout_refused_when_subscription_live(self):
        Subscription.objects.create(
            business=self.business, plan="basic", status=Subscription.Status.ACTIVE,
            stripe_subscription_id="sub_1", started_at=timezone.now(), amount=Decimal("79"),
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timedelta(days=365),
        )
        with patch("apps.advertisers.views.stripe.checkout.Session.create") as create:
            res = self.client.post(
                "/api/advertiser/checkout/",
                {"plan": "basic", "business_id": self.business.pk},
                format="json",
            )
        self.assertEqual(res.status_code, 409)
        create.assert_not_called()


class BillingDisabledTests(TestCase):
    def test_checkout_and_portal_refused_while_billing_closed(self):
        user = User.objects.create_user("adv2", password="x", role=User.Role.ADVERTISER)
        business = make_business(owner=user)
        client = APIClient()
        client.force_authenticate(user)
        with patch("apps.advertisers.views.stripe.checkout.Session.create") as create:
            res = client.post(
                "/api/advertiser/checkout/",
                {"plan": "basic", "business_id": business.pk},
                format="json",
            )
        self.assertEqual(res.status_code, 403)
        self.assertEqual(res.json()["code"], "billing_disabled")
        create.assert_not_called()
        res = client.post("/api/advertiser/portal/", {"business_id": business.pk}, format="json")
        self.assertEqual(res.status_code, 403)

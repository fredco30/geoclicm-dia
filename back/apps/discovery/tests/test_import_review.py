from concurrent.futures import ThreadPoolExecutor
from datetime import timedelta
from threading import Barrier

from django.db import connection, connections
from django.test import TestCase, TransactionTestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.assistant.models import CrawlSource
from apps.core.models import Commune, User
from apps.directory.models import Business, BusinessCategory, BusinessImportCandidate
from apps.discovery.models import Place, PlaceCategory, PlaceImportCandidate
from apps.discovery.multi_sync import (
    _upsert_place_candidate,
    import_business_candidate,
    import_listing_candidate,
    import_place_candidate,
)
from apps.discovery.review import review_all, review_candidate
from apps.events.imports import _upsert_candidate, import_candidate
from apps.events.models import EventCategory, EventImportCandidate, EventSource
from apps.listings.models import Listing, ListingCategory, ListingImportCandidate


class Fixtures:
    def setUp(self):
        self.user = User.objects.create_user(
            username="review-admin", role="admin", password="Testing!7"
        )
        self.commune = Commune.objects.create(
            name="Le Grau-du-Roi", slug="le-grau-du-roi", insee_code="30133", department="30"
        )
        self.source = CrawlSource.objects.create(
            label="OT", seed_url="https://ot.example", kind="website", commune=self.commune
        )
        self.category = PlaceCategory.objects.create(name="Gastronomie", slug="gastronomie")

    def place_data(self, uid="a", **overrides):
        return {
            "source_uid": uid,
            "source_url": f"https://ot.example/{uid}/beach-coffee-club",
            "fingerprint": "beach",
            "title": "Beach Coffee Club",
            "address": "Av. du Palais de la Mer",
            "commune": self.commune,
            "category": self.category,
            "description": "Un lieu",
            "short_description": "Un lieu",
            "validation_errors": [],
            "raw_payload": {
                "ai": {"title": "Beach Coffee Club"},
                "verified_evidence": ["Beach Coffee Club"],
            },
            **overrides,
        }

    def place(self, uid="a", **overrides):
        return PlaceImportCandidate.objects.create(
            crawl_source=self.source, **self.place_data(uid, **overrides)
        )

    def event_data(self, uid="a", **overrides):
        start = timezone.now() + timedelta(days=10)
        end = start + timedelta(hours=2)
        return {
            "source_uid": uid,
            "source_url": "https://ot.example/concert",
            "fingerprint": "concert",
            "title": "Concert",
            "starts_at": start,
            "ends_at": end,
            "commune": self.commune,
            "category": EventCategory.objects.get_or_create(name="Musique", slug="musique")[0],
            "raw_payload": {"verified_evidence": ["Concert"]},
            "validation_errors": [],
            **overrides,
        }

    def event_source(self):
        return EventSource.objects.create(
            label="Agenda", source_url="https://ot.example/agenda", created_by=self.user
        )

    def listing(self, evidence=(), **overrides):
        category = ListingCategory.objects.get_or_create(name="Emploi", slug="emploi")[0]
        return ListingImportCandidate.objects.create(
            crawl_source=self.source,
            source_uid="job",
            title="Recrutement",
            fingerprint="job",
            source_url="https://ot.example/emploi",
            category=category,
            raw_payload={"verified_evidence": list(evidence)},
            **overrides,
        )


class ImportReviewTests(Fixtures, TestCase):
    def test_business_duplicate_cannot_be_published_twice(self):
        category = BusinessCategory.objects.create(name="Services", slug="services")
        values = {
            "crawl_source": self.source,
            "name": "Atelier",
            "fingerprint": "atelier",
            "commune": self.commune,
            "category": category,
            "address": "1 rue du Port",
            "source_url": "https://ot.example/atelier",
        }
        first = BusinessImportCandidate.objects.create(source_uid="a", **values)
        second = BusinessImportCandidate.objects.create(source_uid="b", **values)
        import_business_candidate(first, user=self.user)
        with self.assertRaises(ValueError):
            import_business_candidate(second, user=self.user)
        self.assertEqual(Business.objects.count(), 1)

    def test_bulk_approval_returns_only_published_ids_and_keeps_failed_candidate(self):
        first, second = self.place(), self.place("b")
        api = APIClient()
        api.force_authenticate(self.user)
        response = api.post(
            "/api/admin/place-imports/bulk-approve/", {"ids": [first.pk, second.pk]}, format="json"
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["imported_ids"], [first.pk])
        self.assertEqual(len(response.data["errors"]), 1)
        self.assertEqual(Place.objects.count(), 1)
        self.assertTrue(PlaceImportCandidate.objects.filter(pk=second.pk).exists())

    def test_existing_beach_duplicates_have_one_stable_primary_and_keep_sources(self):
        first, second = self.place(), self.place(
            "b", address="Av. du Palais de la Mer 30240 Le Grau-du-Roi"
        )
        review_candidate(second)
        review_candidate(first)
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertEqual(first.status, "pending")
        self.assertEqual(second.status, "duplicate")
        self.assertEqual(second.raw_payload["review"]["canonical_candidate_id"], first.pk)
        self.assertEqual(PlaceImportCandidate.objects.count(), 2)
        self.assertNotEqual(first.source_url, second.source_url)

    def test_extraction_same_source_different_urls_and_incomplete_duplicates(self):
        first, _, _ = _upsert_place_candidate(
            self.source, self.place_data(validation_errors=["Catégorie manquante"])
        )
        second, _, _ = _upsert_place_candidate(
            self.source, self.place_data("b", validation_errors=["Catégorie manquante"])
        )
        self.assertEqual(first.status, "invalid")
        self.assertEqual(second.status, "duplicate")

    def test_same_brand_different_street_numbers_are_not_merged(self):
        self.place(address="1 rue du Port")
        other, _, _ = _upsert_place_candidate(
            self.source, self.place_data("b", address="2 rue du Port")
        )
        self.assertEqual(other.status, "pending")

    def test_approval_and_retry_cannot_create_a_second_place(self):
        first, second = self.place(), self.place("b")
        record = import_place_candidate(first, user=self.user)
        with self.assertRaisesRegex(ValueError, "Même contenu"):
            import_place_candidate(second, user=self.user)
        again = import_place_candidate(first, user=self.user)
        self.assertEqual(again.pk, record.pk)
        self.assertEqual(Place.objects.count(), 1)

    def test_existing_manually_created_place_is_not_republished(self):
        Place.objects.create(
            title="Beach Coffee Club",
            slug="manual",
            category=self.category,
            commune=self.commune,
            address="Av. du Palais de la Mer",
            created_by=self.user,
        )
        candidate = self.place()
        with self.assertRaisesRegex(ValueError, "existe déjà"):
            import_place_candidate(candidate, user=self.user)
        self.assertEqual(Place.objects.count(), 1)

    def test_same_source_events_dedup_but_different_occurrence_sets_remain_separate(self):
        source = self.event_source()
        data = self.event_data()
        first, _, _ = _upsert_candidate(source, data)
        second, _, _ = _upsert_candidate(source, {**data, "source_uid": "b"})
        self.assertEqual(second.status, "duplicate")
        third_data = {
            **data,
            "source_uid": "c",
            "occurrences": [
                {
                    "starts_at": data["starts_at"].isoformat(),
                    "ends_at": data["ends_at"].isoformat(),
                },
                {
                    "starts_at": (data["starts_at"] + timedelta(days=1)).isoformat(),
                    "ends_at": (data["ends_at"] + timedelta(days=1)).isoformat(),
                },
            ],
        }
        third, _, _ = _upsert_candidate(source, third_data)
        self.assertEqual(first.status, "pending")
        self.assertEqual(third.status, "pending")

    def test_event_becomes_expired_before_approval_even_if_still_pending(self):
        data = self.event_data(
            starts_at=timezone.now() - timedelta(days=2), ends_at=timezone.now() - timedelta(days=1)
        )
        candidate = EventImportCandidate.objects.create(source=self.event_source(), **data)
        with self.assertRaisesRegex(ValueError, "terminées"):
            import_candidate(candidate)

    def test_papy_mamy_is_reclassified_and_blocked_without_inventing_expiry(self):
        row = self.listing(["Durée du contrat : à compter du 2 septembre 2021 au 7 juillet 2022"])
        review_candidate(row)
        self.assertEqual(row.status, "expired")
        self.assertIsNone(row.expires_at)
        with self.assertRaisesRegex(ValueError, "terminée"):
            import_listing_candidate(row, user=self.user)
        self.assertEqual(Listing.objects.count(), 0)

    def test_unknown_job_needs_human_confirmation_and_no_automatic_publication(self):
        row = self.listing(["Un poste à pourvoir"])
        review_candidate(row)
        self.assertEqual(row.status, "needs_review")
        api = APIClient()
        api.force_authenticate(self.user)
        url = f"/api/admin/listing-imports/{row.pk}/confirm-validity/"
        self.assertEqual(api.post(url, {"confirmed": False}, format="json").status_code, 400)
        response = api.post(url, {"confirmed": True}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["status"], "pending")
        self.assertEqual(Listing.objects.count(), 0)
        row.refresh_from_db()
        self.assertEqual(
            row.raw_payload["review"]["validity_confirmation"]["user_id"], self.user.pk
        )
        import_listing_candidate(row, user=self.user)
        self.assertEqual(Listing.objects.count(), 1)

    def test_dry_run_does_not_write_and_apply_is_idempotent(self):
        first, second = self.place(), self.place("b")
        before = list(PlaceImportCandidate.objects.values())
        report = review_all()
        self.assertTrue(any(r["id"] == second.pk and r["after"] == "duplicate" for r in report))
        self.assertEqual(list(PlaceImportCandidate.objects.values()), before)
        review_all(apply=True)
        self.assertEqual(review_all(), [])
        first.refresh_from_db()
        second.refresh_from_db()
        self.assertEqual(first.status, "pending")
        self.assertEqual(second.status, "duplicate")

    def test_imported_and_rejected_decisions_are_never_reclassified(self):
        row = self.listing(["Candidature avant le 15 novembre 2022"], status="rejected")
        review_all(apply=True)
        row.refresh_from_db()
        self.assertEqual(row.status, "rejected")
        row.status = "imported"
        row.save(update_fields=["status"])
        review_all(apply=True)
        row.refresh_from_db()
        self.assertEqual(row.status, "imported")


class ConcurrentApprovalTests(Fixtures, TransactionTestCase):
    def test_same_candidate_approved_by_two_workers_creates_one_place(self):
        if connection.vendor != "postgresql":
            self.skipTest("PostgreSQL advisory transaction lock test")
        candidate = self.place()
        barrier = Barrier(2)

        def approve():
            try:
                row = PlaceImportCandidate.objects.get(pk=candidate.pk)
                user = User.objects.get(pk=self.user.pk)
                barrier.wait(timeout=10)
                return import_place_candidate(row, user=user).pk
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(lambda _: approve(), range(2)))
        self.assertEqual(results[0], results[1])
        self.assertEqual(Place.objects.count(), 1)

"""Dedup cross-source des candidats Agenda par fingerprint (titre+date+commune)."""
from __future__ import annotations

import hashlib

from django.test import TestCase
from django.utils import timezone

from apps.core.models import User
from apps.events.imports import _upsert_candidate
from apps.events.models import EventImportCandidate, EventSource


def _fingerprint(title: str, start, commune_id) -> str:
    from django.utils.text import slugify

    return hashlib.sha256(
        f"{slugify(title)}|{start.isoformat()}|{commune_id or ''}".encode()
    ).hexdigest()


class CrossSourceDedupTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="dedup", password="x")
        self.source_a = EventSource.objects.create(
            label="OT commune A", source_url="https://ota.test", created_by=self.user
        )
        self.source_b = EventSource.objects.create(
            label="Agregateur B", source_url="https://agreg.test", created_by=self.user
        )
        self.start = timezone.now() + timezone.timedelta(days=7)
        self.end = self.start + timezone.timedelta(hours=2)
        self.fingerprint = _fingerprint("Concert Jazz", self.start, None)

    def _data(self, source_uid: str, title: str = "Concert Jazz") -> dict:
        return {
            "source_uid": source_uid,
            "extraction_method": EventImportCandidate.ExtractionMethod.AI,
            "source_url": "https://ota.test/evenement/concert-jazz",
            "raw_payload": {"ai": {"title": title}},
            "fingerprint": self.fingerprint,
            "title": title,
            "short_description": "sd",
            "description": "d",
            "image_url": "",
            "image_credit": "",
            "starts_at": self.start,
            "ends_at": self.end,
            "occurrences": [],
            "is_all_day": False,
            "venue_name": "",
            "address": "",
            "latitude": None,
            "longitude": None,
            "price": "",
            "booking_url": "",
            "organizer": "",
            "commune": None,
            "category": None,
            "kind": "event",
            "validation_errors": [],
        }

    def test_second_pending_source_marked_duplicate(self):
        first, created, _ = _upsert_candidate(self.source_a, self._data("uid-a"))
        self.assertTrue(created)
        self.assertEqual(first.status, EventImportCandidate.Status.PENDING)

        second, created, _ = _upsert_candidate(self.source_b, self._data("uid-b"))
        self.assertTrue(created)
        self.assertEqual(second.status, EventImportCandidate.Status.DUPLICATE)

    def test_same_source_not_flagged_as_duplicate(self):
        first, _, _ = _upsert_candidate(self.source_a, self._data("uid-a"))
        again, created, _ = _upsert_candidate(self.source_a, self._data("uid-a"))
        self.assertFalse(created)
        self.assertEqual(again.pk, first.pk)
        self.assertNotEqual(again.status, EventImportCandidate.Status.DUPLICATE)

    def test_distinct_fingerprint_stays_pending(self):
        _upsert_candidate(self.source_a, self._data("uid-a"))
        other = self._data("uid-c", title="Exposition Photo")
        other["fingerprint"] = _fingerprint("Exposition Photo", self.start, None)
        third, _, _ = _upsert_candidate(self.source_b, other)
        self.assertEqual(third.status, EventImportCandidate.Status.PENDING)

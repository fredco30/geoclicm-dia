"""Le badge « À valider » ne compte que l'actionnable."""
from __future__ import annotations

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import User
from apps.events.models import EventImportCandidate as C
from apps.events.models import EventSource


class PendingCountsEventsTests(TestCase):
    def setUp(self):
        user = User.objects.create_user(username="ed", password="x", role=User.Role.EDITOR)
        self.client_api = APIClient()
        self.client_api.force_authenticate(user)
        self.source = EventSource.objects.create(
            label="OT", source_url="https://ot.test", created_by=user
        )
        self.n = 0

    def _cand(self, status, start=None, occurrences=None):
        self.n += 1
        end = start + timezone.timedelta(hours=2) if start else None
        return C.objects.create(
            source=self.source, source_uid=f"u{self.n}", source_url="https://ot.test/e",
            fingerprint=f"f{self.n}", title=f"E{self.n}", status=status,
            starts_at=start, ends_at=end, occurrences=occurrences or [],
        )

    def test_counts_only_actionable_events(self):
        now = timezone.now()
        future, past = now + timezone.timedelta(days=3), now - timezone.timedelta(days=3)
        self._cand(C.Status.PENDING, future)                       # compté
        self._cand(C.Status.PENDING, past)                         # passé : exclu
        self._cand(C.Status.PENDING, past, occurrences=[{}, {}])   # série : compté
        self._cand(C.Status.INVALID)                               # incomplet : exclu
        res = self.client_api.get("/api/admin/pending-counts/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["events"], 2)

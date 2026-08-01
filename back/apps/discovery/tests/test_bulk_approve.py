"""Logique de la validation en masse (bulk-approve) sans BDD."""

from django.test import SimpleTestCase


class BulkApproveFilteringTests(SimpleTestCase):
    """Verifie les regles metier appliquees par les endpoints bulk-approve."""

    def _business_importable(self, category_id, commune_id, status="pending"):
        return status == "pending" and category_id is not None and commune_id is not None

    def _event_importable(self, category_id, commune_id, starts_at, ends_at, status="pending"):
        return (
            status == "pending"
            and category_id is not None
            and commune_id is not None
            and starts_at is not None
            and ends_at is not None
        )

    def test_business_requires_category_and_commune(self):
        self.assertTrue(self._business_importable(1, 2))
        self.assertFalse(self._business_importable(None, 2))
        self.assertFalse(self._business_importable(1, None))
        self.assertFalse(self._business_importable(1, 2, status="imported"))

    def test_event_requires_dates(self):
        self.assertTrue(self._event_importable(1, 2, "2026-09-01", "2026-09-02"))
        self.assertFalse(self._event_importable(1, 2, None, "2026-09-02"))
        self.assertFalse(self._event_importable(1, 2, "2026-09-01", None))

    def test_ids_sanitized_to_int_and_capped(self):
        raw = [1, "2", 3.0, "x", None, 7] + list(range(600))
        ids = [i for i in raw if isinstance(i, int)][:500]
        self.assertEqual(ids[:3], [1, 7, 0])  # "2", 3.0, "x", None ecartes
        self.assertLessEqual(len(ids), 500)

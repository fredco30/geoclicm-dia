from django.test import SimpleTestCase

from apps.discovery.multi_extraction import (
    CATEGORY_HINT_SLUGS,
    _accepted_items,
    _merge_items,
)
from apps.discovery.multi_sync import _select_primary_places


class _FakePage:
    def __init__(self, title):
        self.title = title


class SelectPrimaryPlacesTests(SimpleTestCase):
    def test_single_place_kept(self):
        places = [{"title": "Phare de l'Espiguette"}]
        self.assertEqual(_select_primary_places(_FakePage("Phare"), places), places)

    def test_aggregation_keeps_page_subject(self):
        page = _FakePage("La carte interactive")
        places = [
            {"title": "Restaurant Le Sud"},
            {"title": "La carte interactive"},
            {"title": "Hôtel des Remparts"},
        ]
        selected = _select_primary_places(page, places)
        self.assertEqual(len(selected), 1)
        self.assertEqual(selected[0]["title"], "La carte interactive")

    def test_aggregation_without_match_returns_nothing(self):
        page = _FakePage("Nos partenaires")
        places = [{"title": "Restaurant A"}, {"title": "Hôtel B"}]
        self.assertEqual(_select_primary_places(page, places), [])


def _result(answer: str) -> dict:
    return {"answer": answer, "provider": "ovh", "model": "Qwen3.5-9B"}


class AcceptedItemsTests(SimpleTestCase):
    def test_splits_categories_by_key(self):
        answer = (
            '{"events":[{"source_page_url":"https://ot.fr/fete","title":"Fete"}],'
            '"markets":[{"source_page_url":"https://ot.fr/marche","title":"Marche"}],'
            '"places":[{"source_page_url":"https://ot.fr/plage","title":"Plage"}]}'
        )
        batch = [
            {"url": "https://ot.fr/fete"},
            {"url": "https://ot.fr/marche"},
            {"url": "https://ot.fr/plage"},
        ]
        accepted, error = _accepted_items(_result(answer), batch)
        self.assertIsNone(error)
        self.assertEqual(len(accepted["events"]), 1)
        self.assertEqual(len(accepted["markets"]), 1)
        self.assertEqual(len(accepted["places"]), 1)
        self.assertEqual(accepted["places"][0]["source_page_url"], "https://ot.fr/plage")

    def test_rejects_unknown_provenance(self):
        answer = '{"places":[{"source_page_url":"https://autre.fr/x","title":"X"}]}'
        batch = [{"url": "https://ot.fr/plage"}]
        accepted, error = _accepted_items(_result(answer), batch)
        self.assertEqual(accepted["places"], [])
        self.assertIsNotNone(error)

    def test_empty_when_no_content(self):
        answer = '{"events":[],"markets":[],"places":[]}'
        batch = [{"url": "https://ot.fr/page"}]
        accepted, error = _accepted_items(_result(answer), batch)
        self.assertIsNone(error)
        self.assertEqual(accepted["events"], [])

    def test_invalid_json_returns_error(self):
        accepted, error = _accepted_items(_result("pas du json"), [{"url": "https://ot.fr/x"}])
        self.assertIsNotNone(error)


class MergeItemsTests(SimpleTestCase):
    def test_merges_overlap_duplicates(self):
        items = [
            {"source_page_url": "https://ot.fr/p", "title": "Plage", "evidence": ["a"]},
            {"source_page_url": "https://ot.fr/p", "title": "Plage", "evidence": ["a", "b"], "duration": "1h"},
        ]
        merged = _merge_items(items)
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0]["duration"], "1h")
        self.assertEqual(sorted(merged[0]["evidence"]), ["a", "b"])


class CategoryHintTests(SimpleTestCase):
    def test_hints_cover_seeded_categories(self):
        for slug in ("patrimoine", "nature", "plages", "balades", "points-de-vue", "savoir-faire"):
            self.assertIn(slug, CATEGORY_HINT_SLUGS.values())

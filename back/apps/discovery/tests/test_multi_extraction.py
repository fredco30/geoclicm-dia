from django.test import SimpleTestCase

from apps.discovery.multi_extraction import (
    CATEGORY_HINT_SLUGS,
    _accepted_items,
    _merge_items,
)


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

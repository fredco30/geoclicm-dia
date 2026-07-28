from types import SimpleNamespace
from unittest import TestCase

from apps.events.imports import _event_page_url, _matches_url_patterns


class EventPageUrlsUnitTests(TestCase):
    def test_crawled_url_wins_when_declared_canonical_is_generic(self):
        page = SimpleNamespace(
            canonical_url="https://example.test/agenda/fiche-evenement",
            final_url="https://example.test/evenement/concert",
        )

        self.assertTrue(_matches_url_patterns(page, ["/evenement/"]))
        self.assertEqual(_event_page_url(page), page.final_url)

    def test_empty_patterns_keep_pages_without_a_matching_url(self):
        page = SimpleNamespace(
            canonical_url="https://example.test/informations",
            final_url="",
        )

        self.assertTrue(_matches_url_patterns(page, []))

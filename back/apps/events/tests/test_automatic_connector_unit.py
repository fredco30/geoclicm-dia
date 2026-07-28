from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from apps.events.imports import _discover_automatic, _looks_like_ics_url


class EventSourceAutomaticConnectorTests(TestCase):
    def test_recognizes_direct_ics_urls(self):
        self.assertTrue(_looks_like_ics_url("https://example.test/agenda.ics"))
        self.assertTrue(_looks_like_ics_url("https://example.test/export?format=ics"))
        self.assertFalse(_looks_like_ics_url("https://example.test/agenda"))

    @patch("apps.events.imports._normalize_ics")
    @patch("apps.events.imports._discover_ics")
    def test_direct_ics_skips_web_crawler(self, discover_ics, normalize_ics):
        source = SimpleNamespace(source_url="https://example.test/agenda.ics")
        discover_ics.return_value = [{"uid": "event-1"}]
        normalize_ics.return_value = {"fingerprint": "event-1"}

        with patch("apps.events.imports._normalize_web_source") as normalize_web:
            normalized, errors, ai_called = _discover_automatic(source)

        self.assertEqual(normalized, [{"fingerprint": "event-1"}])
        self.assertEqual(errors, [])
        self.assertFalse(ai_called)
        normalize_web.assert_not_called()

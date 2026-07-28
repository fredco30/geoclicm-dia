import json
import unittest
from unittest.mock import patch

from apps.events.ai_extraction import (
    MAX_INPUT_CHARS,
    _bounded_pages,
    _parse_json_object,
    extract_events,
)


class FakeSource:
    def __init__(self):
        self.ai_content_hash = ""
        self.ai_cached_events = []
        self.created_by_id = 1
        self.created_by = object()
        self.label = "Office de tourisme"
        self.saved = False

    def save(self, **kwargs):
        self.saved = True


class AiExtractionUnitTests(unittest.TestCase):
    def test_parse_json_accepts_wrapped_object(self):
        self.assertEqual(
            _parse_json_object('préfixe {"events": []} suffixe'),
            {"events": []},
        )

    def test_bounded_pages_preserves_provenance_and_limits_input(self):
        pages = [
            {
                "url": "https://example.test/agenda",
                "title": "Agenda",
                "image_url": "https://example.test/image.jpg",
                "links": ["https://example.test/reserver"],
                "content": "x" * (MAX_INPUT_CHARS * 2),
            }
        ]
        selected = _bounded_pages(pages)
        self.assertLessEqual(sum(len(page["content"]) for page in selected), MAX_INPUT_CHARS)
        self.assertEqual(selected[0]["links"], ["https://example.test/reserver"])

    @patch("apps.events.ai_extraction._call_mistral")
    def test_valid_event_is_cached_and_reused(self, call_mistral):
        payload = {
            "events": [
                {
                    "source_page_url": "https://example.test/agenda",
                    "title": "Concert",
                    "occurrences": [],
                    "evidence": ["Concert le 12 août"],
                }
            ],
        }
        call_mistral.return_value = {"answer": json.dumps(payload), "generation_id": 42}
        source = FakeSource()
        pages = [
            {
                "url": "https://example.test/agenda",
                "title": "Agenda",
                "image_url": "",
                "links": [],
                "content": "Concert le 12 août",
            }
        ]
        events, errors, called = extract_events(source, pages)
        self.assertTrue(called)
        self.assertFalse(errors)
        self.assertEqual(events[0]["_generation_id"], 42)
        self.assertTrue(source.saved)

        cached, errors, called = extract_events(source, pages)
        self.assertFalse(called)
        self.assertFalse(errors)
        self.assertEqual(cached, events)
        call_mistral.assert_called_once()

    @patch("apps.events.ai_extraction._call_mistral")
    def test_multiple_batches_are_all_processed(self, call_mistral):
        call_mistral.side_effect = [
            {
                "answer": json.dumps(
                    {
                        "events": [
                            {
                                "source_page_url": "https://example.test/page-1",
                                "title": "Premier ?v?nement",
                            }
                        ]
                    }
                ),
                "generation_id": 10,
            },
            {
                "answer": json.dumps(
                    {
                        "events": [
                            {
                                "source_page_url": "https://example.test/page-6",
                                "title": "Second ?v?nement",
                            }
                        ]
                    }
                ),
                "generation_id": 11,
            },
        ]
        source = FakeSource()
        pages = [
            {
                "url": f"https://example.test/page-{index}",
                "title": f"Page {index}",
                "image_url": "",
                "links": [],
                "content": "x" * 12_000,
            }
            for index in range(1, 7)
        ]

        events, errors, called = extract_events(source, pages)

        self.assertTrue(called)
        self.assertFalse(errors)
        self.assertEqual([event["_generation_id"] for event in events], [10, 11])
        self.assertEqual(call_mistral.call_count, 2)

    @patch("apps.events.ai_extraction._call_mistral")
    def test_empty_result_is_cached(self, call_mistral):
        call_mistral.return_value = {
            "answer": json.dumps({"events": []}),
            "generation_id": 12,
        }
        source = FakeSource()
        pages = [
            {
                "url": "https://example.test/agenda",
                "title": "Agenda",
                "image_url": "",
                "links": [],
                "content": "Aucun ?v?nement annonc?",
            }
        ]

        events, errors, called = extract_events(source, pages)
        self.assertTrue(called)
        self.assertFalse(errors)
        self.assertFalse(events)
        self.assertTrue(source.saved)

        events, errors, called = extract_events(source, pages)
        self.assertFalse(called)
        self.assertFalse(errors)
        self.assertFalse(events)
        call_mistral.assert_called_once()

    @patch("apps.events.ai_extraction._call_mistral")
    def test_event_with_unknown_source_page_is_rejected(self, call_mistral):
        call_mistral.return_value = {
            "answer": json.dumps(
                {
                    "events": [
                        {
                            "source_page_url": "https://attacker.test/fake",
                            "title": "Événement inventé",
                        }
                    ],
                }
            ),
            "generation_id": 7,
        }
        source = FakeSource()
        events, errors, called = extract_events(
            source,
            [
                {
                    "url": "https://example.test/agenda",
                    "title": "Agenda",
                    "image_url": "",
                    "links": [],
                    "content": "Programme officiel de la commune",
                }
            ],
        )
        self.assertTrue(called)
        self.assertFalse(events)
        self.assertIn("provenance", errors[0].lower())
        self.assertFalse(source.saved)

    @patch("apps.events.ai_extraction._call_mistral")
    def test_more_than_one_hundred_events_are_not_silently_dropped(self, call_mistral):
        url = "https://example.test/agenda"
        call_mistral.return_value = {
            "answer": json.dumps(
                {
                    "events": [
                        {"source_page_url": url, "title": f"Evenement {index}"}
                        for index in range(125)
                    ]
                }
            ),
            "generation_id": 99,
        }
        source = FakeSource()
        events, errors, called = extract_events(
            source,
            [
                {
                    "url": url,
                    "title": "Agenda",
                    "image_url": "",
                    "links": [],
                    "content": "Programme complet",
                }
            ],
        )
        self.assertTrue(called)
        self.assertFalse(errors)
        self.assertEqual(len(events), 125)


if __name__ == "__main__":
    unittest.main()

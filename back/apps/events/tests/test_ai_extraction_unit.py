import json
import unittest
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from apps.events.ai_extraction import (
    MAX_INPUT_CHARS,
    ExtractionUnavailable,
    _bounded_pages,
    _parse_json_object,
    extract_events,
)


class FakeSource:
    def __init__(self):
        self.ai_content_hash = ""
        self.ai_cached_events = []
        self.ai_extraction_cache = {}
        self.ai_provider = ""
        self.ai_model = ""
        self.ai_total_parts = 0
        self.ai_completed_parts = 0
        self.ai_failed_parts = 0
        self.created_by_id = 1
        self.created_by = object()
        self.label = "Office de tourisme"
        self.saved = False

    def save(self, **kwargs):
        self.saved = True


def result(payload: dict, generation_id: int) -> dict:
    return {
        "answer": json.dumps(payload),
        "generation_id": generation_id,
        "provider": "mistral",
        "model": "mistral-small-latest",
    }


@override_settings(
    EVENT_AI_PROVIDER="mistral",
    AI_ASSIST_DEFAULT_MODEL="mistral-small-latest",
)
class AiExtractionUnitTests(SimpleTestCase):
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
        self.assertLessEqual(
            sum(len(page["content"]) for page in selected),
            MAX_INPUT_CHARS,
        )
        self.assertEqual(selected[0]["links"], ["https://example.test/reserver"])

    @patch("apps.events.ai_extraction._call_ai")
    def test_valid_event_is_cached_and_reused(self, call_ai):
        payload = {
            "events": [
                {
                    "source_page_url": (
                        "https://example.test/agenda/?utm_source=ai#programme"
                    ),
                    "title": "Concert",
                    "occurrences": [],
                    "evidence": ["Concert le 12 août"],
                }
            ],
        }
        call_ai.return_value = result(payload, 42)
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
        self.assertEqual(events[0]["source_page_url"], "https://example.test/agenda")
        self.assertEqual(events[0]["_generation_id"], 42)
        self.assertEqual(source.ai_completed_parts, 1)

        cached, errors, called = extract_events(source, pages)
        self.assertFalse(called)
        self.assertFalse(errors)
        self.assertEqual(cached, events)
        call_ai.assert_called_once()

    @patch("apps.events.ai_extraction._call_ai")
    def test_each_segment_is_processed_independently(self, call_ai):
        call_ai.side_effect = [
            result(
                {
                    "events": [
                        {
                            "source_page_url": f"https://example.test/page-{index}",
                            "title": f"Événement {index}",
                        }
                    ]
                },
                index,
            )
            for index in range(1, 7)
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
        self.assertEqual(len(events), 6)
        self.assertEqual(call_ai.call_count, 6)
        self.assertEqual(source.ai_completed_parts, 6)

    @patch("apps.events.ai_extraction._call_ai")
    def test_partial_failure_is_checkpointed_and_resumed(self, call_ai):
        page_1 = "https://example.test/page-1"
        page_2 = "https://example.test/page-2"
        page_3 = "https://example.test/page-3"
        call_ai.side_effect = [
            result({"events": [{"source_page_url": page_1, "title": "Un"}]}, 1),
            ExtractionUnavailable("timeout"),
            result({"events": [{"source_page_url": page_3, "title": "Trois"}]}, 3),
            result({"events": [{"source_page_url": page_2, "title": "Deux"}]}, 2),
        ]
        source = FakeSource()
        pages = [
            {"url": url, "title": "", "image_url": "", "links": [], "content": url}
            for url in (page_1, page_2, page_3)
        ]

        events, errors, called = extract_events(source, pages)

        self.assertTrue(called)
        self.assertEqual(len(events), 2)
        self.assertEqual(len(errors), 1)
        self.assertEqual(source.ai_completed_parts, 2)
        self.assertEqual(source.ai_failed_parts, 1)
        self.assertEqual(len(source.ai_extraction_cache), 2)

        events, errors, called = extract_events(source, pages)

        self.assertTrue(called)
        self.assertFalse(errors)
        self.assertEqual({event["title"] for event in events}, {"Un", "Deux", "Trois"})
        self.assertEqual(call_ai.call_count, 4)
        self.assertEqual(source.ai_completed_parts, 3)
        self.assertEqual(source.ai_failed_parts, 0)

    @patch("apps.events.ai_extraction._call_ai")
    def test_overlapping_segments_merge_occurrences(self, call_ai):
        url = "https://example.test/agenda"
        call_ai.side_effect = [
            result(
                {
                    "events": [
                        {
                            "source_page_url": url,
                            "title": "Festival du Port",
                            "venue_name": "Quai Colbert",
                            "occurrences": [{"starts_at": "2026-08-12T20:00:00+02:00"}],
                            "evidence": ["12 août"],
                        }
                    ]
                },
                1,
            ),
            result(
                {
                    "events": [
                        {
                            "source_page_url": url,
                            "title": "Festival du Port",
                            "venue_name": "Quai Colbert",
                            "occurrences": [{"starts_at": "2026-08-13T20:00:00+02:00"}],
                            "evidence": ["13 août"],
                        }
                    ]
                },
                2,
            ),
        ]
        source = FakeSource()

        events, errors, called = extract_events(
            source,
            [
                {
                    "url": url,
                    "title": "Agenda",
                    "image_url": "",
                    "links": [],
                    "content": "x" * 13_000,
                }
            ],
        )

        self.assertTrue(called)
        self.assertFalse(errors)
        self.assertEqual(len(events), 1)
        self.assertEqual(len(events[0]["occurrences"]), 2)
        self.assertEqual(events[0]["evidence"], ["12 août", "13 août"])

    @patch("apps.events.ai_extraction._call_ai")
    def test_empty_result_is_cached(self, call_ai):
        call_ai.return_value = result({"events": []}, 12)
        source = FakeSource()
        pages = [
            {
                "url": "https://example.test/agenda",
                "title": "Agenda",
                "image_url": "",
                "links": [],
                "content": "Aucun événement annoncé",
            }
        ]

        events, errors, called = extract_events(source, pages)
        self.assertTrue(called)
        self.assertFalse(errors)
        self.assertFalse(events)

        events, errors, called = extract_events(source, pages)
        self.assertFalse(called)
        self.assertFalse(errors)
        self.assertFalse(events)
        call_ai.assert_called_once()

    @patch("apps.events.ai_extraction._call_ai")
    def test_event_with_unknown_source_page_is_rejected(self, call_ai):
        call_ai.return_value = result(
            {
                "events": [
                    {
                        "source_page_url": "https://attacker.test/fake",
                        "title": "Événement inventé",
                    }
                ],
            },
            7,
        )
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
        self.assertFalse(source.ai_extraction_cache)

    @patch("apps.events.ai_extraction._call_ai")
    def test_more_than_one_hundred_events_are_not_silently_dropped(self, call_ai):
        url = "https://example.test/agenda"
        call_ai.return_value = result(
            {
                "events": [
                    {"source_page_url": url, "title": f"Événement {index}"}
                    for index in range(125)
                ]
            },
            99,
        )
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

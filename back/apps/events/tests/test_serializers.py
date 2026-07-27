import json

from django.test import SimpleTestCase
from rest_framework import serializers

from apps.events.serializers import EventWriteSerializer
from apps.events.views import _ics_escape


class EventOccurrencePayloadTests(SimpleTestCase):
    def test_occurrence_payload_accepts_distinct_valid_dates(self):
        rows = [
            {
                "starts_at": "2026-08-01T08:00:00Z",
                "ends_at": "2026-08-01T12:00:00Z",
                "is_all_day": False,
                "status": "scheduled",
                "note": "",
            },
            {
                "starts_at": "2026-08-08T08:00:00Z",
                "ends_at": "2026-08-08T12:00:00Z",
                "is_all_day": False,
                "status": "scheduled",
                "note": "",
            },
        ]
        result = EventWriteSerializer().validate_occurrences_json(json.dumps(rows))
        self.assertEqual(len(result), 2)

    def test_occurrence_payload_rejects_duplicate_start(self):
        row = {
            "starts_at": "2026-08-01T08:00:00Z",
            "ends_at": "2026-08-01T12:00:00Z",
            "is_all_day": False,
            "status": "scheduled",
            "note": "",
        }
        with self.assertRaises(serializers.ValidationError):
            EventWriteSerializer().validate_occurrences_json(json.dumps([row, row]))

    def test_occurrence_payload_rejects_end_before_start(self):
        row = {
            "starts_at": "2026-08-01T12:00:00Z",
            "ends_at": "2026-08-01T08:00:00Z",
            "is_all_day": False,
            "status": "scheduled",
            "note": "",
        }
        with self.assertRaises(serializers.ValidationError):
            EventWriteSerializer().validate_occurrences_json(json.dumps([row]))

    def test_ics_escape_protects_reserved_characters(self):
        self.assertEqual(_ics_escape("A, B; C\\D\nE"), "A\\, B\\; C\\\\D\\nE")

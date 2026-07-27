from django.test import SimpleTestCase
from rest_framework import serializers

from apps.discovery.serializers import PlaceWriteSerializer


class PlaceRelationPayloadTests(SimpleTestCase):
    def test_relation_payload_accepts_integer_ids(self):
        data = {"related_articles_json": "[1, 2, 3]"}
        self.assertEqual(
            PlaceWriteSerializer()._relations(data),
            {"related_articles": [1, 2, 3]},
        )
        self.assertEqual(data, {})

    def test_relation_payload_rejects_non_integer_ids(self):
        with self.assertRaises(serializers.ValidationError):
            PlaceWriteSerializer()._relations({"related_events_json": '["1"]'})

"""En-têtes envoyés à la passerelle OpenCode, sans base de données."""

from django.test import SimpleTestCase

from apps.events.ai_extraction import _session_header


class FakeSource:
    def __init__(self, pk):
        self.pk = pk


class SessionHeaderTests(SimpleTestCase):
    def test_same_source_keeps_the_same_session(self):
        # La passerelle demande un identifiant stable d'un appel à l'autre.
        self.assertEqual(_session_header(FakeSource(1)), _session_header(FakeSource(1)))

    def test_two_sources_differ(self):
        self.assertNotEqual(_session_header(FakeSource(1)), _session_header(FakeSource(2)))

    def test_header_is_an_opaque_digest(self):
        # Opaque : la passerelle reçoit un condensé, pas un identifiant lisible.
        value = _session_header(FakeSource(42))
        self.assertEqual(len(value), 32)
        self.assertTrue(all(char in "0123456789abcdef" for char in value))

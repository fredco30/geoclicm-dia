"""Rejet des candidats issus de pages traduites (sans base)."""
from io import StringIO
from types import SimpleNamespace
from unittest.mock import MagicMock

from django.test import SimpleTestCase

from apps.discovery.management.commands.clean_imported_data import FOREIGN_REASON, Command
from apps.events.models import EventImportCandidate

Status = EventImportCandidate.Status


def row(url, status=Status.INVALID, errors=()):
    return SimpleNamespace(source_url=url, status=status, validation_errors=list(errors), save=MagicMock())


class RejectForeignCandidatesTests(SimpleTestCase):
    def test_only_translated_pages_are_rejected(self):
        french = row("https://ot.example/agenda/marche")
        spanish = row("https://ot.example/es/mercados", errors=["Catégorie non déterminée"])
        english = row("https://ot.example/en/markets", status=Status.PENDING)
        model = SimpleNamespace(Status=Status, objects=MagicMock())
        model.objects.filter.return_value.only.return_value = [french, spanish, english]
        command = Command(stdout=StringIO())

        self.assertEqual(command._reject_foreign_candidates("Agenda", model), 2)

        statuses = model.objects.filter.call_args.kwargs["status__in"]
        self.assertEqual(set(statuses), {Status.PENDING, Status.INVALID, Status.DUPLICATE})
        self.assertEqual(french.status, Status.INVALID)
        french.save.assert_not_called()
        for candidate in (spanish, english):
            self.assertEqual(candidate.status, Status.REJECTED)
            self.assertIn(FOREIGN_REASON, candidate.validation_errors)
            candidate.save.assert_called_once_with(update_fields=["status", "validation_errors"])
        self.assertIn("Catégorie non déterminée", spanish.validation_errors)

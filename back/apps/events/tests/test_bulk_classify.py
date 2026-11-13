"""Classement groupé des candidats Agenda (sans base : requêtes doublées)."""
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase

from apps.events import imports
from apps.events.models import EventImportCandidate

PENDING = EventImportCandidate.Status.PENDING
INVALID = EventImportCandidate.Status.INVALID


def candidate(pk, status, errors):
    return SimpleNamespace(
        pk=pk, status=status, validation_errors=list(errors), category=None, commune=None,
        save=MagicMock(),
    )


class ClassifyCandidatesTests(SimpleTestCase):
    def run_classify(self, rows, **kwargs):
        manager = MagicMock()
        manager.filter.return_value = rows
        with (
            patch.object(imports, "lock_identity"),
            patch.object(imports.EventImportCandidate, "objects", manager),
        ):
            result = imports.classify_candidates([row.pk for row in rows], **kwargs)
        return result, manager.filter.call_args.kwargs

    def test_category_completes_candidates_missing_only_it(self):
        only_category = candidate(1, INVALID, [imports.CATEGORY_ERROR])
        also_dates = candidate(2, INVALID, [imports.CATEGORY_ERROR, "Dates absentes ou invalides"])
        already_ready = candidate(3, PENDING, [])
        category = SimpleNamespace(name="Marché")
        result, filters = self.run_classify(
            [only_category, also_dates, already_ready], category=category
        )
        self.assertEqual(result["ready_ids"], [1])
        self.assertEqual(only_category.status, PENDING)
        self.assertEqual(also_dates.status, INVALID)
        self.assertEqual(also_dates.validation_errors, ["Dates absentes ou invalides"])
        self.assertEqual(already_ready.status, PENDING)
        for row in (only_category, also_dates, already_ready):
            self.assertIs(row.category, category)
            row.save.assert_called_once()
        # Jamais un candidat rejeté, importé, expiré ou doublon.
        self.assertEqual(set(filters["status__in"]), {PENDING, INVALID})

    def test_commune_removes_its_own_reason(self):
        row = candidate(4, INVALID, [imports.COMMUNE_ERROR, imports.CATEGORY_ERROR])
        commune = SimpleNamespace(name="Lunel")
        result, _ = self.run_classify([row], commune=commune)
        self.assertIs(row.commune, commune)
        self.assertIsNone(row.category)
        self.assertEqual(row.validation_errors, [imports.CATEGORY_ERROR])
        self.assertEqual(result["ready_ids"], [])

    def test_nothing_to_apply_is_refused(self):
        with self.assertRaises(ValueError):
            imports.classify_candidates([1])

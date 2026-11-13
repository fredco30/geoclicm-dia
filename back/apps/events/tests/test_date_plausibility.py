"""Une date sans année s'ancre sur la date de la page, pas sur aujourd'hui.

Cas réels de la boîte « À valider » : les événements des semaines à venir sont
corrects et doivent passer, le « 14 juillet » projeté depuis une page de 2024
ne doit pas.
"""

from datetime import datetime

from django.test import SimpleTestCase
from django.utils import timezone

from apps.events.imports import PARIS, implausible_date_reason, page_anchor_date

NOW = timezone.make_aware(datetime(2026, 11, 13, 10, 0), PARIS)


def occ(starts_at):
    return [{"starts_at": starts_at, "ends_at": starts_at, "is_all_day": False}]


class ImplausibleDateTests(SimpleTestCase):
    def reason(self, starts_at, published="", modified=""):
        return implausible_date_reason(
            occ(starts_at),
            {"published_at": published, "modified_at": modified},
            now=NOW,
        )

    def test_imminent_event_on_a_fresh_page_is_kept(self):
        # « Nouvel an au Point Cardinal », page de novembre : la page n'écrit
        # pas l'année, mais la date est juste.
        self.assertEqual(self.reason("2026-12-31T20:30:00+01:00", modified="2026-11-10"), "")

    def test_next_season_on_a_fresh_page_is_kept(self):
        self.assertEqual(self.reason("2027-04-24T18:30:00+02:00", modified="2026-11-01"), "")

    def test_event_projected_from_an_old_page_is_flagged(self):
        # « Feu d'artifice et bal » : page de 2024, date reportée à 2027.
        self.assertEqual(
            self.reason("2027-07-14T22:30:00+02:00", published="2024-07-01"),
            "page datée du 2024-07-01",
        )

    def test_absurd_year_is_flagged_without_any_page_date(self):
        self.assertEqual(self.reason("2030-11-17T15:00:00+01:00"), "plus de deux ans dans le futur")

    def test_undated_page_invents_no_motive(self):
        self.assertEqual(self.reason("2027-06-01T19:00:00+02:00"), "")

    def test_no_usable_occurrence(self):
        self.assertEqual(implausible_date_reason([], {}, now=NOW), "")
        self.assertEqual(implausible_date_reason([{"ends_at": "2027-01-01"}], {}, now=NOW), "")


class PageAnchorDateTests(SimpleTestCase):
    def test_most_recent_date_wins(self):
        anchor = page_anchor_date({"published_at": "2024-03-02", "modified_at": "2026-10-20"})
        self.assertEqual(anchor.isoformat(), "2026-10-20")

    def test_falls_back_to_publication(self):
        anchor = page_anchor_date({"published_at": "2024-03-02", "modified_at": ""})
        self.assertEqual(anchor.isoformat(), "2024-03-02")

    def test_garbage_gives_nothing(self):
        self.assertIsNone(page_anchor_date({"published_at": "pas une date"}))
        self.assertIsNone(page_anchor_date({}))
        self.assertIsNone(page_anchor_date(None))

"""Une année absente de la page n'a pas été lue : elle a été déduite."""

from django.test import SimpleTestCase

from apps.events.imports import normalize_page_text, years_absent_from_page


def occ(starts_at):
    return {"starts_at": starts_at, "ends_at": starts_at, "is_all_day": False}


class YearsAbsentFromPageTests(SimpleTestCase):
    def test_year_written_in_the_page_is_corroborated(self):
        page = normalize_page_text("Concert le 5 décembre 2026 à 20h")
        self.assertEqual(years_absent_from_page([occ("2026-12-05T20:00:00+01:00")], page), [])

    def test_year_absent_from_the_page_is_reported(self):
        page = normalize_page_text("Concert le 5 décembre à 20h")
        self.assertEqual(years_absent_from_page([occ("2027-12-05T20:00:00+01:00")], page), ["2027"])

    def test_fabricated_first_of_january(self):
        # Cas réel : « Marché hebdomadaire », activité permanente, datée 01/01/2024.
        page = normalize_page_text("Marché hebdomadaire tous les mercredis matin, toute l'année.")
        self.assertEqual(years_absent_from_page([occ("2024-01-01T08:00:00+01:00")], page), ["2024"])

    def test_only_the_uncorroborated_year_is_reported(self):
        page = normalize_page_text("Édition 2026 du festival. Rendez-vous en juillet.")
        missing = years_absent_from_page(
            [occ("2026-07-14T20:00:00+02:00"), occ("2027-07-14T20:00:00+02:00")], page
        )
        self.assertEqual(missing, ["2027"])

    def test_without_page_text_no_motive_is_invented(self):
        self.assertEqual(years_absent_from_page([occ("2030-11-17T15:00:00+01:00")], ""), [])

    def test_occurrence_without_start_is_ignored(self):
        page = normalize_page_text("Une page sans date.")
        self.assertEqual(
            years_absent_from_page([{"ends_at": "2027-01-01T00:00:00+01:00"}], page), []
        )

    def test_normalize_page_text_collapses_and_folds(self):
        self.assertEqual(normalize_page_text("  Fête\n\tVOTIVE  2026 "), "fête votive 2026")
        self.assertEqual(normalize_page_text(None), "")

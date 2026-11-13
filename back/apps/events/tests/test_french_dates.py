"""L'année se déduit du jour de la semaine. Cas réels, vérifiés au calendrier."""

from datetime import date, time

from django.test import SimpleTestCase

from apps.events.french_dates import read_dates

CRAWL = date(2026, 11, 8)


class ReadDatesTests(SimpleTestCase):
    def only(self, *parts):
        found = read_dates(*parts, reference=CRAWL)
        return found[0] if len(found) == 1 else None

    def test_mediatheque_inauguration_is_2024(self):
        # Page crawlée en 2026, mais le 23 novembre n'est un samedi qu'en 2024.
        found = self.only(
            "La ville inaugure la nouvelle médiathèque samedi 23 novembre à partir de 11H00"
        )
        self.assertEqual(found.day, date(2024, 11, 23))
        self.assertEqual(found.at, time(11, 0))

    def test_darlou_vernissage_is_2025(self):
        found = self.only("Vernissage le vendredi 04 juillet à 18h30.")
        self.assertEqual(found.day, date(2025, 7, 4))
        self.assertEqual(found.at, time(18, 30))

    def test_written_year_is_trusted(self):
        found = self.only("Du vendredi 4 au samedi 5 décembre 2026.")
        self.assertEqual(found.day, date(2026, 12, 5))

    def test_weekday_contradicting_the_written_year_gives_nothing(self):
        # Le 5 décembre 2026 est un samedi : la page se contredit.
        self.assertEqual(read_dates("VENDREDI 5 DÉCEMBRE 2026", reference=CRAWL), [])

    def test_day_and_month_alone_are_ambiguous(self):
        self.assertEqual(read_dates("Rendez-vous le 6 juillet", reference=CRAWL), [])

    def test_first_of_the_month(self):
        found = self.only("Ouverture le mercredi 1er juillet")
        self.assertEqual(found.day, date(2026, 7, 1))

    def test_impossible_day_is_ignored(self):
        self.assertEqual(read_dates("samedi 31 février", reference=CRAWL), [])

    def test_several_dates_are_sorted(self):
        found = read_dates(
            "Vernissage le vendredi 04 juillet à 18h30.",
            "Clôture samedi 23 novembre",
            reference=CRAWL,
        )
        self.assertEqual([row.day for row in found], [date(2024, 11, 23), date(2025, 7, 4)])

    def test_no_date_at_all(self):
        self.assertEqual(read_dates("Fête de la musique", "Divers lieux", reference=CRAWL), [])
        self.assertEqual(read_dates(None, "", reference=CRAWL), [])


class LatestBoundTests(SimpleTestCase):
    """Une année déduite ne doit pas dépasser le plafond donné par l'appelant."""

    def test_old_market_is_not_projected_into_the_future(self):
        # Le 29 décembre est un mercredi en 2021 et en 2027. 2021 est hors
        # fenêtre, donc 2027 passait pour l'unique solution.
        text = "Marchés traditionnels, mercredi 29 décembre"
        self.assertEqual(
            [row.day for row in read_dates(text, reference=CRAWL)], [date(2027, 12, 29)]
        )
        self.assertEqual(read_dates(text, reference=CRAWL, latest=CRAWL), [])

    def test_past_date_is_still_recovered_under_the_bound(self):
        found = read_dates(
            "Vernissage le vendredi 04 juillet à 18h30.", reference=CRAWL, latest=CRAWL
        )
        self.assertEqual([row.day for row in found], [date(2025, 7, 4)])

    def test_written_year_is_trusted_beyond_the_bound(self):
        found = read_dates(
            "Du vendredi 4 au samedi 5 décembre 2026.", reference=CRAWL, latest=CRAWL
        )
        self.assertEqual([row.day for row in found], [date(2026, 12, 5)])

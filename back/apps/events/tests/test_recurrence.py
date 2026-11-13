"""Un rythme annoncé n'est pas une date, mais ce n'est pas rien non plus.

Titres et descriptions repris de la boîte « À valider ».
"""

from django.test import SimpleTestCase

from apps.events.recurrence import announces_recurrence


class AnnouncesRecurrenceTests(SimpleTestCase):
    def test_weekly_market(self):
        self.assertTrue(announces_recurrence("Marché hebdomadaire"))
        self.assertTrue(announces_recurrence("Marché du Centre-Ville", "Tous les mercredis matin."))

    def test_all_year_round(self):
        self.assertTrue(announces_recurrence("Le petit train touristique", "Ouvert toute l'année."))
        self.assertTrue(announces_recurrence("Location de vélos", "7j/7 en saison."))

    def test_day_names_in_the_plural(self):
        self.assertTrue(announces_recurrence("Visite du phare", "Les samedis et dimanches."))
        self.assertTrue(announces_recurrence("Halte vélos", "Du lundi au vendredi, 9h-18h."))

    def test_accents_and_case_do_not_matter(self):
        self.assertTrue(announces_recurrence("ACTIVITÉ QUOTIDIENNE"))
        self.assertTrue(announces_recurrence("Chaque dimanche à l'Agora"))

    def test_a_dated_event_announces_no_rhythm(self):
        self.assertFalse(announces_recurrence("Feu d'artifice du 14 juillet"))
        self.assertFalse(announces_recurrence("Concert Gipsy Nuevo", "Soirée unique au Côté Plage."))

    def test_a_page_that_is_not_an_event(self):
        self.assertFalse(announces_recurrence("Une halte vélos sécurisée aux Ports de Plaisance"))
        self.assertFalse(announces_recurrence("LES STANDS"))
        self.assertFalse(announces_recurrence(""))
        self.assertFalse(announces_recurrence(None, None))

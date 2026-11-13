"""Catégorie devinée par mots-clés : cas réels de la boîte « À valider »."""
from django.test import SimpleTestCase

from apps.events.categorize import CATEGORY_RULES, guess_category_slug
from apps.events.management.commands.seed_event_categories import CATEGORIES


class GuessCategoryTests(SimpleTestCase):
    def assertGuess(self, expected, title, description="", kind=None):
        self.assertEqual(guess_category_slug(title, description, kind), expected, title)

    def test_real_titles(self):
        cases = [
            ("tradition-camarguaise", "ABRIVADO 8 TAUREAUX", ""),
            ("tradition-camarguaise", "COURSE CAMARGUAISE – TROPHÉE DES AS", "Course camarguaise avec bandido."),
            ("tradition-camarguaise", "Roussataïo", "Lâcher de juments."),
            ("marche", "Vide Grenier des Arènes", ""),
            ("marche", "Brocantes traditionnelles – Aigues-Mortes", ""),
            ("festival", "Feu d'artifice du 15 août", ""),
            ("festival", "Feu d'artifice et bal", "Bal avec l'orchestre Elixyr."),
            ("concert", "Aubades – Port Camargue – Olala", ""),
            ("concert", "Les dimanches dansants de l'Agora", ""),
            ("exposition", "10ème salon d'aquarelle", ""),
            ("gastronomie", "Beaujolais Nouveau à la Maison des Vins", ""),
            ("gastronomie", "Salon du chocolat et autres péchés mignon", "dégustations"),
            ("sport", "CONCOURS DE PÉTANQUE", ""),
            ("famille", "Vacances de février au Seaquarium", "ateliers créatifs"),
            ("culture", "Ciné Plein Air : « L'Odyssée »", "Projection du film en plein air."),
            ("culture", "Atelier du regard : Peinture hollandaise", "Conférence"),
        ]
        for expected, title, description in cases:
            self.assertGuess(expected, title, description)

    def test_market_kind_wins(self):
        self.assertGuess("marche", "Dégustations sur la place du village", kind="market")

    def test_brand_names_and_non_events_stay_unclassified(self):
        self.assertGuess(None, "Ouverture de la résidence Pierre et Vacances", "La résidence est ouverte.")
        self.assertGuess(None, "Collecte de vos lunettes usagées", "Au profit des nécessiteux.")
        self.assertGuess(None, "", "")

    def test_whole_words_only(self):
        # « bal » ne doit pas être trouvé dans « balcon » ni « balade ».
        self.assertNotEqual(guess_category_slug("Vue depuis le balcon du phare"), "concert")

    def test_every_rule_targets_a_seeded_category(self):
        from django.utils.text import slugify

        seeded = {slugify(name) for name, _icon, _color in CATEGORIES}
        self.assertLessEqual({slug for slug, _ in CATEGORY_RULES}, seeded)

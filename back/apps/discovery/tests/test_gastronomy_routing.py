from django.test import SimpleTestCase

from apps.discovery.multi_extraction import as_gastronomy_business, is_gastronomy_place


class GastronomyRoutingTests(SimpleTestCase):
    def test_detects_gastronomy_hint(self):
        self.assertTrue(is_gastronomy_place({"category_hint": "Gastronomie"}))
        self.assertTrue(is_gastronomy_place({"category_hint": "restaurant"}))
        self.assertFalse(is_gastronomy_place({"category_hint": "hebergements"}))
        self.assertFalse(is_gastronomy_place({}))

    def test_specialty_guess(self):
        def hint(title, desc=""):
            return as_gastronomy_business(
                {"title": title, "short_description": desc, "category_hint": "gastronomie"}
            )["category_hint"]

        self.assertEqual(hint("Brasserie Pub 3.14"), "Bars & Cafes")
        self.assertEqual(hint("Broche d'Or", "Pizza - Italienne Traditionnelle"), "Restaurants")
        self.assertEqual(hint("Glacier du port"), "Glaciers")
        self.assertEqual(hint("Caveau des Sables"), "Producteurs & Caveaux")

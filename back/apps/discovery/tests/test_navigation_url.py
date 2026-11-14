from django.test import SimpleTestCase

from apps.discovery.cleaning import is_navigation_url


class NavigationUrlTests(SimpleTestCase):
    def test_utility_pages_are_excluded(self):
        for url in (
            "https://letsgrau.com/plan-du-site",
            "https://ot.test/mentions-legales/",
            "https://ot.test/fr/contact.html",
            "https://ot.test/tag/plage/",
        ):
            self.assertTrue(is_navigation_url(url), url)

    def test_content_and_listing_pages_are_kept(self):
        for url in (
            "https://letsgrau.com/evenement/vide-grenier-des-arenes",
            "https://ot.test/agenda/",
            "https://ot.test/actualites/",
            "https://ot.test/",
            "https://ot.test/restaurant-le-contact-plage",
        ):
            self.assertFalse(is_navigation_url(url), url)

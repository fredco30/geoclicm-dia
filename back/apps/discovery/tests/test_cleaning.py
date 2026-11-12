from django.test import SimpleTestCase

from apps.discovery.cleaning import is_foreign_language_url, norm_text, strip_locality_suffix
from apps.events.event_images import is_decorative_image_url


class ForeignLanguageUrlTests(SimpleTestCase):
    def test_translated_pages_detected(self):
        for url in (
            "https://ot-aiguesmortes.com/es/las-torres-y-las-murallas",
            "https://ot-aiguesmortes.com/en/the-history-of-aigues-mortes",
            "https://example.org/en-gb/visit",
            "https://example.org/de/",
        ):
            self.assertTrue(is_foreign_language_url(url), url)

    def test_french_pages_kept(self):
        for url in (
            "https://letsgrau.com/que-faire/se-regaler/playa-miramar",
            "https://ot-aiguesmortes.com/fr/les-remparts",
            "https://example.org/",
            "https://example.org/entreprises/annuaire",
            "https://example.org/decouvrir/en/bateau",
            "",
        ):
            self.assertFalse(is_foreign_language_url(url), url)


class StripLocalitySuffixTests(SimpleTestCase):
    def test_repeated_suffixes_removed(self):
        self.assertEqual(
            strip_locality_suffix(
                "A.C.S - SECTION YOGA - Le Grau du Roi :Le Grau du Roi", "Le Grau-du-Roi"
            ),
            "A.C.S - SECTION YOGA",
        )
        self.assertEqual(
            strip_locality_suffix(
                "AVIRON TERRE DE CAMARGUE - LE GRAU DU ROI - Le Grau du Roi :Le Grau du Roi",
                "Le Grau du Roi",
                "Le Grau-du-Roi",
            ),
            "AVIRON TERRE DE CAMARGUE",
        )

    def test_other_suffixes_and_inner_mentions_kept(self):
        self.assertEqual(
            strip_locality_suffix("Spectacle : « De quelle couleur est le vent »", "Lunel"),
            "Spectacle : « De quelle couleur est le vent »",
        )
        self.assertEqual(
            strip_locality_suffix("BRIDGE CLUB DU GRAU DU ROI", "Le Grau-du-Roi"),
            "BRIDGE CLUB DU GRAU DU ROI",
        )
        self.assertEqual(
            strip_locality_suffix("Boulangerie - Marie Blachère", "Aigues-Mortes"),
            "Boulangerie - Marie Blachère",
        )

    def test_name_never_emptied(self):
        self.assertEqual(strip_locality_suffix("Aigues-Mortes", "Aigues-Mortes"), "Aigues-Mortes")
        self.assertEqual(strip_locality_suffix("Lunel", ""), "Lunel")


class NormTextTests(SimpleTestCase):
    def test_accents_case_punctuation(self):
        self.assertEqual(norm_text("Arènes du Grau-du-Roi"), norm_text("ARENES DU GRAU DU ROI"))


class DecorativeImageTests(SimpleTestCase):
    def test_theme_assets_and_pictograms_rejected(self):
        for url in (
            "https://www.lagrandemotte.com/wp-content/themes/otlgm/images/type-pdf.png",
            "https://example.org/uploads/logo-mairie.png",
            "https://example.org/uploads/picto_marche.jpg",
            "https://example.org/uploads/carte.svg",
        ):
            self.assertTrue(is_decorative_image_url(url), url)

    def test_content_photos_kept(self):
        for url in (
            "https://example.org/wp-content/uploads/2026/08/marche-traditionnel.jpg",
            "https://example.org/media/typographie-expo.webp",
            "https://example.org/photos/iconographie.jpg",
        ):
            self.assertFalse(is_decorative_image_url(url), url)

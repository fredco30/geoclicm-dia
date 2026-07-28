import gzip
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import patch

from apps.events.event_images import select_event_image


def page(html: str):
    return SimpleNamespace(
        final_url="https://example.test/evenement/concert",
        canonical_url="https://example.test/evenement/concert",
        raw_html_gzip=gzip.compress(html.encode()),
    )


class EventImageSelectionTests(TestCase):
    generic = {"https://example.test/site/dunes.jpg"}

    def test_json_ld_event_image_has_priority(self):
        result = select_event_image(
            page('<main><img src="/events/dom.jpg" alt="Concert"></main>'),
            title="Concert",
            json_ld_image={"url": "/events/json-ld.jpg"},
            generic_urls=self.generic,
        )
        self.assertEqual(result.url, "https://example.test/events/json-ld.jpg")
        self.assertEqual(result.method, "json_ld_event")

    def test_generic_og_is_rejected_for_event_image(self):
        html = """
        <head><meta property="og:image" content="/site/dunes.jpg"></head>
        <main><h1>Concert du port</h1>
        <img src="/events/concert.jpg" alt="Concert du port"></main>
        """
        result = select_event_image(
            page(html), title="Concert du port", generic_urls=self.generic
        )
        self.assertEqual(result.url, "https://example.test/events/concert.jpg")
        self.assertEqual(result.method, "dom_title")

    def test_page_without_specific_image_returns_empty(self):
        html = '<head><meta property="og:image" content="/site/dunes.jpg"></head><h1>Concert</h1>'
        result = select_event_image(page(html), title="Concert", generic_urls=self.generic)
        self.assertEqual(result.url, "")

    def test_two_event_cards_receive_their_own_images(self):
        html = """
        <main>
          <article><h2>Concert bleu</h2><img src="/blue.jpg" alt="Concert bleu"></article>
          <article><h2>Concert rouge</h2><img src="/red.jpg" alt="Concert rouge"></article>
        </main>
        """
        blue = select_event_image(page(html), title="Concert bleu")
        red = select_event_image(page(html), title="Concert rouge")
        self.assertEqual(blue.url, "https://example.test/blue.jpg")
        self.assertEqual(red.url, "https://example.test/red.jpg")

    def test_title_gallery_uses_first_image_deterministically(self):
        html = """
        <div class="swiper-wrapper">
          <div class="swiper-slide"><img src="/first.jpg" alt="Un livre à la plage"></div>
          <div class="swiper-slide"><img src="/second.jpg" alt="Un livre à la plage"></div>
        </div>
        """
        first = select_event_image(page(html), title="Un livre à la plage")
        second = select_event_image(page(html), title="Un livre à la plage")
        self.assertEqual(first.url, "https://example.test/first.jpg")
        self.assertEqual(first, second)

    @patch("requests.sessions.Session.request")
    def test_selection_from_stored_html_does_not_use_network(self, request):
        result = select_event_image(
            page('<main><img src="/event.jpg" alt="Concert local"></main>'),
            title="Concert local",
        )
        self.assertEqual(result.url, "https://example.test/event.jpg")
        request.assert_not_called()

from unittest import TestCase

from apps.assistant.services.shared_crawl import _parse_html, canonicalize_url


class SharedCrawlUnitTests(TestCase):
    def test_canonical_url_removes_fragment_and_tracking_only(self):
        self.assertEqual(
            canonicalize_url("HTTPS://Example.test/agenda/?utm_source=x&id=4#programme"),
            "https://example.test/agenda?id=4",
        )

    def test_parser_keeps_full_html_links_metadata_and_json_ld(self):
        html = """
        <html><head><title>Concert</title>
        <link rel="canonical" href="/evenement/concert/">
        <meta property="og:image" content="/media/concert.jpg">
        <script type="application/ld+json">{"@type":"Event","name":"Concert"}</script>
        </head><body><main><h1>Concert</h1><p>Programme officiel.</p>
        <a href="/reservation?utm_source=test">Reserver</a></main></body></html>
        """
        page = _parse_html(html, "https://example.test/agenda", "http", 200, 1)
        self.assertEqual(page["canonical_url"], "https://example.test/evenement/concert")
        self.assertEqual(page["metadata"]["image_url"], "https://example.test/media/concert.jpg")
        self.assertEqual(page["json_ld"][0]["@type"], "Event")
        self.assertIn("https://example.test/reservation", page["links"])
        self.assertEqual(page["html"], html)

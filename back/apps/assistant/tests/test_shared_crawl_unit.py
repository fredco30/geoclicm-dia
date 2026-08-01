from unittest import TestCase

from apps.assistant.services.shared_crawl import (
    _allowed,
    _page_identity_hash,
    _parse_html,
    canonicalize_url,
)


class _SourceStub:
    include_patterns = ""
    exclude_patterns = ""


class SharedCrawlUnitTests(TestCase):
    def test_allowed_rejects_listing_and_pagination_urls(self):
        source = _SourceStub()
        for url in (
            "https://ot.test/agenda?periode=2026-08",
            "https://ot.test/agenda?l-41-categorie=expo",
            "https://ot.test/tous-les-agendas",
            "https://ot.test/l-agenda-des-fetes",
            "https://ot.test/agenda?page=3",
        ):
            self.assertFalse(_allowed(source, url), url)

    def test_allowed_rejects_non_french_paths(self):
        source = _SourceStub()
        for url in (
            "https://ot.test/en/events/concert",
            "https://ot.test/es/agenda/concierto",
            "https://ot.test/it/eventi/concerto",
            "https://ot.test/de/veranstaltungen/konzert",
        ):
            self.assertFalse(_allowed(source, url), url)

    def test_allowed_keeps_french_detail_page(self):
        source = _SourceStub()
        self.assertTrue(_allowed(source, "https://ot.test/evenement/concert-jazz"))

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

    def test_pages_with_same_declared_canonical_keep_distinct_identities(self):
        html = """
        <html><head><title>Evenement</title>
        <link rel="canonical" href="/agenda/fiche-evenement/">
        </head><body><main><p>Programme officiel detaille.</p></main></body></html>
        """
        first = _parse_html(html, "https://example.test/evenement/concert", "http", 200, 1)
        second = _parse_html(html, "https://example.test/evenement/exposition", "http", 200, 1)

        self.assertEqual(first["canonical_url"], second["canonical_url"])
        self.assertNotEqual(first["url"], second["url"])
        self.assertNotEqual(
            _page_identity_hash(first),
            _page_identity_hash(second),
        )

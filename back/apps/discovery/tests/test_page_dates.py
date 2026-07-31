from django.test import SimpleTestCase

from apps.discovery.page_dates import resolve_page_dates


class ResolvePageDatesTests(SimpleTestCase):
    def test_meta_takes_priority(self):
        metadata = {"published_at": "2022-06-15T15:32:16+02:00", "modified_at": "2022-06-15"}
        json_ld = [{"datePublished": "2020-01-01", "dateModified": "2020-06-01"}]
        result = resolve_page_dates(metadata, json_ld)
        self.assertEqual(result["published_at"], "2022-06-15")
        self.assertEqual(result["modified_at"], "2022-06-15")

    def test_json_ld_fallback(self):
        metadata = {}
        json_ld = [
            {
                "@type": "Article",
                "datePublished": "2024-01-10T08:00:00+00:00",
                "dateModified": "2024-02-03",
            }
        ]
        result = resolve_page_dates(metadata, json_ld)
        self.assertEqual(result["published_at"], "2024-01-10")
        self.assertEqual(result["modified_at"], "2024-02-03")

    def test_json_ld_inside_graph(self):
        json_ld = [{"@graph": [{"@type": "WebPage", "datePublished": "2023-05-01"}]}]
        result = resolve_page_dates({}, json_ld)
        self.assertEqual(result["published_at"], "2023-05-01")

    def test_empty_when_nothing(self):
        self.assertEqual(resolve_page_dates(None, None), {"published_at": "", "modified_at": ""})

    def test_invalid_values_dropped(self):
        metadata = {"published_at": "pas une date", "modified_at": "n/a"}
        self.assertEqual(resolve_page_dates(metadata, []), {"published_at": "", "modified_at": ""})

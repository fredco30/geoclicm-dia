import sys
from types import ModuleType
from unittest import TestCase
from unittest.mock import Mock, patch

from apps.assistant.tasks import crawl_external_sources


class CrawlAllTaskTests(TestCase):
    def setUp(self):
        self.crawler_module = ModuleType("apps.assistant.indexers.web_crawler")
        self.crawler_module.crawl_all_active_sources = Mock()

    @patch("django.core.cache.cache.delete")
    @patch("django.core.cache.cache.add", return_value=True)
    def test_crawl_all_runs_once_and_releases_lock(self, cache_add, cache_delete):
        self.crawler_module.crawl_all_active_sources.return_value = {"created": 3}

        with patch.dict(
            sys.modules,
            {"apps.assistant.indexers.web_crawler": self.crawler_module},
        ):
            result = crawl_external_sources()

        self.assertEqual(result, {"created": 3})
        cache_add.assert_called_once_with(
            "assistant:crawl-all:running", True, timeout=6 * 60 * 60
        )
        self.crawler_module.crawl_all_active_sources.assert_called_once_with()
        cache_delete.assert_called_once_with("assistant:crawl-all:running")

    @patch("django.core.cache.cache.delete")
    @patch("django.core.cache.cache.add", return_value=False)
    def test_crawl_all_skips_when_lock_is_already_held(
        self, cache_add, cache_delete
    ):
        with patch.dict(
            sys.modules,
            {"apps.assistant.indexers.web_crawler": self.crawler_module},
        ):
            result = crawl_external_sources()

        self.assertEqual(result, {"skipped": 1})
        cache_add.assert_called_once_with(
            "assistant:crawl-all:running", True, timeout=6 * 60 * 60
        )
        self.crawler_module.crawl_all_active_sources.assert_not_called()
        cache_delete.assert_not_called()

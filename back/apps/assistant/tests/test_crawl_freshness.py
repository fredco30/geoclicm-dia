from datetime import timedelta
from types import SimpleNamespace
from unittest import TestCase
from unittest.mock import Mock, patch

from django.utils import timezone

from apps.assistant.models import CrawlRun
from apps.assistant.services.shared_crawl import ensure_source_fresh, source_is_fresh


class CrawlFreshnessTests(TestCase):
    def source(self, *, age_hours: int, status: str = CrawlRun.Status.OK):
        pages = Mock()
        pages.filter.return_value.exists.return_value = True
        return SimpleNamespace(
            pk=7,
            last_status=status,
            last_crawled_at=timezone.now() - timedelta(hours=age_hours),
            pages=pages,
        )

    def test_recent_successful_corpus_is_reused(self):
        source = self.source(age_hours=1)

        with patch(
            "apps.assistant.services.shared_crawl.refresh_source"
        ) as refresh_source:
            decision = ensure_source_fresh(source)

        self.assertFalse(decision.refreshed)
        self.assertEqual(decision.reason, "fresh")
        refresh_source.assert_not_called()

    @patch("apps.assistant.services.shared_crawl.cache.delete")
    @patch("apps.assistant.services.shared_crawl.cache.add", return_value=True)
    @patch("apps.assistant.services.shared_crawl.refresh_source")
    def test_expired_corpus_is_refreshed_once(
        self, refresh_source, cache_add, cache_delete
    ):
        source = self.source(age_hours=7)
        run = Mock()
        refresh_source.return_value = run

        decision = ensure_source_fresh(source)

        self.assertTrue(decision.refreshed)
        self.assertIs(decision.run, run)
        cache_add.assert_called_once()
        refresh_source.assert_called_once_with(source)
        cache_delete.assert_called_once_with("assistant:crawl-source:7:running")

    @patch("apps.assistant.services.shared_crawl.cache.delete")
    @patch("apps.assistant.services.shared_crawl.cache.add", return_value=True)
    @patch("apps.assistant.services.shared_crawl.refresh_source")
    def test_freshness_is_checked_again_after_lock(
        self, refresh_source, cache_add, cache_delete
    ):
        source = self.source(age_hours=7)

        def refresh_fields(**kwargs):
            source.last_crawled_at = timezone.now() - timedelta(minutes=1)

        source.refresh_from_db = Mock(side_effect=refresh_fields)

        decision = ensure_source_fresh(source)

        self.assertFalse(decision.refreshed)
        self.assertEqual(decision.reason, "fresh_after_lock")
        refresh_source.assert_not_called()
        cache_add.assert_called_once()
        cache_delete.assert_called_once_with("assistant:crawl-source:7:running")

    def test_partial_recent_corpus_with_pages_is_reusable(self):
        source = self.source(age_hours=1, status=CrawlRun.Status.PARTIAL)
        self.assertTrue(source_is_fresh(source))

"""Création d'article depuis le back-office (sans base : requêtes doublées)."""
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase
from rest_framework.exceptions import ValidationError

from apps.editorial.models import Article
from apps.editorial.serializers import ArticleWriteSerializer


class ArticleWriteSerializerTests(SimpleTestCase):
    def test_slug_and_body_optional_for_a_draft(self):
        fields = ArticleWriteSerializer().fields
        self.assertFalse(fields["slug"].required)
        self.assertFalse(fields["body"].required)
        self.assertTrue(fields["body"].allow_blank)
        data = {"status": Article.Status.DRAFT, "title": "Brouillon"}
        self.assertEqual(ArticleWriteSerializer().validate(data), data)

    def test_publishing_still_requires_a_body(self):
        with self.assertRaises(ValidationError):
            ArticleWriteSerializer().validate({"status": Article.Status.PUBLISHED})

    def test_partial_publish_uses_the_stored_body(self):
        serializer = ArticleWriteSerializer(
            instance=SimpleNamespace(
                body="Texte en base", status=Article.Status.DRAFT, published_at=None
            )
        )
        self.assertEqual(
            serializer.validate({"status": Article.Status.PUBLISHED}),
            {"status": Article.Status.PUBLISHED},
        )


class UniqueSlugTests(SimpleTestCase):
    def _slug(self, title, taken):
        query = SimpleNamespace()

        def filter_(slug):
            return SimpleNamespace(
                exclude=lambda **kwargs: SimpleNamespace(exists=lambda: slug in taken)
            )

        query.filter = filter_
        with patch.object(Article, "objects", query):
            return Article(title=title)._unique_slug()

    def test_suffix_added_when_slug_taken(self):
        self.assertEqual(self._slug("Fête votive", set()), "fete-votive")
        self.assertEqual(self._slug("Fête votive", {"fete-votive"}), "fete-votive-2")
        self.assertEqual(
            self._slug("Fête votive", {"fete-votive", "fete-votive-2"}), "fete-votive-3"
        )

    def test_title_without_letters(self):
        self.assertEqual(self._slug("!!!", set()), "article")


class ArchivedVisibilityTests(SimpleTestCase):
    """Une fiche archivée reste consultable par son adresse, pas dans les listes."""

    def _statuses(self, action):
        from django.contrib.auth.models import AnonymousUser

        from apps.editorial.views import ArticleViewSet

        view = ArticleViewSet()
        view.action = action
        view.request = SimpleNamespace(user=AnonymousUser())
        where = view.get_queryset().query.where
        lookups = [child for child in where.children if child.lhs.target.name == "status"]
        return set(lookups[0].rhs) if lookups[0].lookup_name == "in" else {lookups[0].rhs}

    def test_detail_includes_archived(self):
        self.assertEqual(
            self._statuses("retrieve"), {Article.Status.PUBLISHED, Article.Status.ARCHIVED}
        )

    def test_lists_exclude_archived(self):
        self.assertEqual(self._statuses("list"), {Article.Status.PUBLISHED})


class SchedulingValidationTests(SimpleTestCase):
    def setUp(self):
        from datetime import timedelta

        from django.utils import timezone

        self.now = timezone.now()
        self.later = self.now + timedelta(hours=2)
        self.earlier = self.now - timedelta(hours=2)

    def test_schedule_requires_future_date_and_body(self):
        serializer = ArticleWriteSerializer()
        ok = {"status": Article.Status.SCHEDULED, "body": "Texte", "published_at": self.later}
        self.assertEqual(serializer.validate(dict(ok)), ok)
        for bad in (
            {**ok, "published_at": self.earlier},
            {"status": Article.Status.SCHEDULED, "body": "Texte"},
            {**ok, "body": " "},
        ):
            with self.assertRaises(ValidationError):
                serializer.validate(bad)

    def test_publish_now_resets_a_future_date(self):
        serializer = ArticleWriteSerializer(
            instance=SimpleNamespace(
                status=Article.Status.SCHEDULED, body="Texte", published_at=self.later
            )
        )
        data = serializer.validate({"status": Article.Status.PUBLISHED})
        self.assertLessEqual(data["published_at"], self.later)
        self.assertLess(abs((data["published_at"] - self.now).total_seconds()), 60)

    def test_past_publication_date_kept(self):
        serializer = ArticleWriteSerializer(
            instance=SimpleNamespace(
                status=Article.Status.PUBLISHED, body="Texte", published_at=self.earlier
            )
        )
        self.assertNotIn("published_at", serializer.validate({"status": Article.Status.PUBLISHED}))


class PublishDueArticlesTests(SimpleTestCase):
    def test_due_articles_are_published(self):
        from unittest.mock import MagicMock

        from apps.editorial import tasks

        due = [MagicMock(slug="a", status=Article.Status.SCHEDULED), MagicMock(slug="b")]
        manager = MagicMock()
        manager.filter.return_value.order_by.return_value = due
        with patch.object(tasks.Article, "objects", manager):
            self.assertEqual(tasks.publish_due_articles(), ["a", "b"])
        kwargs = manager.filter.call_args.kwargs
        self.assertEqual(kwargs["status"], Article.Status.SCHEDULED)
        self.assertIn("published_at__lte", kwargs)
        for article in due:
            self.assertEqual(article.status, Article.Status.PUBLISHED)
            article.save.assert_called_once()

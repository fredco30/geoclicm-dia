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
        serializer = ArticleWriteSerializer(instance=SimpleNamespace(body="Texte en base"))
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

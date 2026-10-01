from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import User
from apps.editorial.models import Article, Category

LOCMEM = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}


@override_settings(CACHES=LOCMEM)
class ArticleViewCountTests(TestCase):
    def setUp(self):
        cache.clear()
        author = User.objects.create_user("redac", password="x", role=User.Role.EDITOR)
        category = Category.objects.create(name="Patrimoine", slug="patrimoine")
        self.article = Article.objects.create(
            title="Tour de Constance", slug="tour", chapeau="x", body="x",
            category=category, author=author, status=Article.Status.PUBLISHED,
            published_at=timezone.now(),
        )
        self.client = APIClient()

    def test_detail_no_longer_counts_and_view_is_deduplicated(self):
        self.client.get("/api/articles/tour/")
        self.article.refresh_from_db()
        self.assertEqual(self.article.view_count, 0)
        for _ in range(3):
            self.assertEqual(self.client.post("/api/articles/tour/view/").status_code, 204)
        self.article.refresh_from_db()
        self.assertEqual(self.article.view_count, 1)
        self.client.post("/api/articles/tour/view/", REMOTE_ADDR="198.51.100.7")
        self.article.refresh_from_db()
        self.assertEqual(self.article.view_count, 2)

    def test_draft_cannot_be_counted(self):
        Article.objects.filter(pk=self.article.pk).update(status=Article.Status.DRAFT)
        self.assertEqual(self.client.post("/api/articles/tour/view/").status_code, 404)

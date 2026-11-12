"""Publication Facebook : sans base ni appel réseau (requêtes doublées)."""
from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import SimpleTestCase, override_settings
from django.utils import timezone

from apps.editorial import facebook, signals
from apps.editorial.models import Article

CONFIGURED = {
    "FACEBOOK_PAGE_ID": "123",
    "FACEBOOK_PAGE_ACCESS_TOKEN": "jeton-de-test",
    "FACEBOOK_GRAPH_VERSION": "",
    "SITE_URL": "https://media.example",
}


def make_article(**overrides) -> Article:
    data = {
        "pk": 5,
        "slug": "fete-votive",
        "title": "Fête votive",
        "chapeau": "Trois jours de fête.",
        "status": Article.Status.PUBLISHED,
        "published_at": timezone.now() - timedelta(minutes=1),
        "facebook_post_id": "",
        "auto_publish_to_facebook": True,
    }
    data.update(overrides)
    article = Article(**{k: v for k, v in data.items() if k != "pk"})
    article.pk = data["pk"]
    return article


def response(status=200, payload=None):
    return SimpleNamespace(
        ok=200 <= status < 300, status_code=status, content=b"x", json=lambda: payload or {}
    )


@override_settings(**CONFIGURED)
class PublishArticleTests(SimpleTestCase):
    def setUp(self):
        self.manager = MagicMock()
        self.manager.filter.return_value.update.return_value = 1
        patcher = patch.object(facebook.Article, "objects", self.manager)
        patcher.start()
        self.addCleanup(patcher.stop)

    def test_posts_once_with_link_and_message(self):
        with patch.object(facebook.requests, "post", return_value=response(200, {"id": "123_456"})) as post:
            self.assertEqual(facebook.publish_article(make_article()), "123_456")
        url = post.call_args.args[0]
        data = post.call_args.kwargs["data"]
        self.assertEqual(url, "https://graph.facebook.com/123/feed")
        self.assertEqual(data["link"], "https://media.example/articles/fete-votive")
        self.assertEqual(data["message"], "Fête votive\n\nTrois jours de fête.")
        # Réservation conditionnelle avant l'appel (anti double publication).
        self.manager.filter.assert_any_call(pk=5, facebook_post_id="")

    def test_refused_when_already_claimed(self):
        self.manager.filter.return_value.update.return_value = 0
        with patch.object(facebook.requests, "post") as post:
            with self.assertRaises(facebook.FacebookError):
                facebook.publish_article(make_article())
        post.assert_not_called()

    def test_failure_releases_the_claim(self):
        error = {"error": {"message": "Jeton expiré"}}
        with patch.object(facebook.requests, "post", return_value=response(400, error)):
            with self.assertRaisesMessage(facebook.FacebookError, "Jeton expiré"):
                facebook.publish_article(make_article())
        self.manager.filter.assert_any_call(pk=5, facebook_post_id=facebook.PENDING)

    def test_only_published_articles(self):
        for article in (
            make_article(status=Article.Status.DRAFT),
            make_article(published_at=timezone.now() + timedelta(hours=1)),
            make_article(facebook_post_id="déjà"),
        ):
            with self.assertRaises(facebook.FacebookError):
                facebook.publish_article(article)

    @override_settings(FACEBOOK_PAGE_ACCESS_TOKEN="")
    def test_disabled_without_configuration(self):
        self.assertFalse(facebook.is_enabled())
        with self.assertRaises(facebook.FacebookError):
            facebook.publish_article(make_article())

    @override_settings(FACEBOOK_GRAPH_VERSION="v23.0")
    def test_graph_version_used_when_set(self):
        self.assertEqual(facebook._graph_url("1/feed"), "https://graph.facebook.com/v23.0/1/feed")


@override_settings(**CONFIGURED)
class AutoShareSignalTests(SimpleTestCase):
    def _fires(self, article, previous):
        article._previous_status = previous
        with patch.object(signals.transaction, "on_commit") as on_commit:
            signals.share_on_facebook_when_published(Article, article)
        return on_commit.called

    def test_shared_when_going_online(self):
        self.assertTrue(self._fires(make_article(), Article.Status.DRAFT))
        self.assertTrue(self._fires(make_article(), Article.Status.SCHEDULED))
        self.assertTrue(self._fires(make_article(), None))

    def test_not_shared_on_simple_update_or_opt_out(self):
        self.assertFalse(self._fires(make_article(), Article.Status.PUBLISHED))
        self.assertFalse(self._fires(make_article(auto_publish_to_facebook=False), None))
        self.assertFalse(self._fires(make_article(facebook_post_id="x"), None))
        self.assertFalse(self._fires(make_article(status=Article.Status.DRAFT), None))

    @override_settings(FACEBOOK_PAGE_ID="")
    def test_nothing_without_configuration(self):
        self.assertFalse(self._fires(make_article(), None))

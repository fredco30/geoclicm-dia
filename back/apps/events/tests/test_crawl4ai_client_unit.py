import unittest
from unittest.mock import Mock, patch

from apps.events.crawl4ai_client import _clear_token_cache, fetch_rendered_html


def response(status=200, payload=None):
    mocked = Mock(status_code=status)
    mocked.json.return_value = payload or {}
    if status >= 400:
        mocked.raise_for_status.side_effect = RuntimeError(f"HTTP {status}")
    return mocked


class Crawl4AIClientUnitTests(unittest.TestCase):
    def setUp(self):
        _clear_token_cache()

    @patch("apps.events.crawl4ai_client.requests.post")
    def test_exchanges_api_token_for_jwt(self, post):
        post.side_effect = [
            response(payload={"access_token": "jwt-1"}),
            response(payload={"results": [{"success": True, "html": "<main>OK</main>"}]}),
        ]

        html = fetch_rendered_html(
            "https://example.test",
            base_url="http://127.0.0.1:11235",
            api_token="api-secret",
            email="crawl4ai@geoclic.fr",
        )

        self.assertEqual(html, "<main>OK</main>")
        self.assertTrue(post.call_args_list[0].args[0].endswith("/token"))
        self.assertEqual(
            post.call_args_list[1].kwargs["headers"]["Authorization"],
            "Bearer jwt-1",
        )

    @patch("apps.events.crawl4ai_client.requests.post")
    def test_reuses_cached_jwt(self, post):
        post.side_effect = [
            response(payload={"access_token": "jwt-cached"}),
            response(payload={"results": [{"html": "premier"}]}),
            response(payload={"results": [{"html": "second"}]}),
        ]
        kwargs = {
            "base_url": "http://127.0.0.1:11235",
            "api_token": "api-secret",
            "email": "crawl4ai@geoclic.fr",
        }

        self.assertEqual(fetch_rendered_html("https://one.test", **kwargs), "premier")
        self.assertEqual(fetch_rendered_html("https://two.test", **kwargs), "second")
        self.assertEqual(
            sum(call.args[0].endswith("/token") for call in post.call_args_list),
            1,
        )

    @patch("apps.events.crawl4ai_client.requests.post")
    def test_refreshes_jwt_once_after_401(self, post):
        post.side_effect = [
            response(payload={"access_token": "jwt-old"}),
            response(status=401),
            response(payload={"access_token": "jwt-new"}),
            response(payload={"results": [{"html": "renouvelé"}]}),
        ]

        html = fetch_rendered_html(
            "https://example.test",
            base_url="http://127.0.0.1:11235",
            api_token="api-secret",
            email="crawl4ai@geoclic.fr",
        )

        self.assertEqual(html, "renouvelé")
        self.assertEqual(
            post.call_args_list[-1].kwargs["headers"]["Authorization"],
            "Bearer jwt-new",
        )


if __name__ == "__main__":
    unittest.main()

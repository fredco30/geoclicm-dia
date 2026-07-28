from types import SimpleNamespace
from unittest.mock import Mock, patch

import requests
from django.test import SimpleTestCase

from apps.ai_assist.services.openai_compatible import (
    LLMProviderNotConfigured,
    generate_openai_compatible,
)


class OpenAICompatibleProviderTests(SimpleTestCase):
    def setUp(self):
        self.user = SimpleNamespace(id=7)

    @patch("apps.ai_assist.services.openai_compatible.AIGeneration.objects.create")
    @patch("apps.ai_assist.services.openai_compatible._check_budget")
    @patch("apps.ai_assist.services.openai_compatible.requests.post")
    def test_success_is_audited_without_logging_token(
        self,
        post,
        check_budget,
        create_generation,
    ):
        response = Mock(status_code=200)
        response.json.return_value = {
            "model": "Qwen3.5-9B",
            "choices": [{"message": {"content": '{"events":[]}'}}],
            "usage": {"prompt_tokens": 1000, "completion_tokens": 200},
        }
        post.return_value = response
        create_generation.return_value = SimpleNamespace(id=123)

        result = generate_openai_compatible(
            user=self.user,
            endpoint="events.extract.ovh",
            provider="OVHcloud",
            base_url="https://example.test/v1/",
            api_key="secret-token",
            model="Qwen3.5-9B",
            system_prompt="system",
            user_prompt="user",
            reasoning_effort="none",
        )

        check_budget.assert_called_once_with(user_id=7)
        self.assertEqual(result["generation_id"], 123)
        self.assertEqual(str(result["cost_eur"]), "0.000130")
        request = post.call_args
        self.assertEqual(request.args[0], "https://example.test/v1/chat/completions")
        self.assertEqual(request.kwargs["headers"]["Authorization"], "Bearer secret-token")
        self.assertEqual(request.kwargs["json"]["reasoning_effort"], "none")
        audited = create_generation.call_args.kwargs
        self.assertNotIn("secret-token", audited["prompt"])
        self.assertNotIn("secret-token", audited["response"])

    @patch("apps.ai_assist.services.openai_compatible.time.sleep")
    @patch("apps.ai_assist.services.openai_compatible.AIGeneration.objects.create")
    @patch("apps.ai_assist.services.openai_compatible._check_budget")
    @patch("apps.ai_assist.services.openai_compatible.requests.post")
    def test_timeout_is_retried_then_audited_once(
        self,
        post,
        check_budget,
        create_generation,
        sleep,
    ):
        post.side_effect = requests.Timeout("slow")

        with self.assertRaisesRegex(RuntimeError, "OVHcloud"):
            generate_openai_compatible(
                user=self.user,
                endpoint="events.extract.ovh",
                provider="OVHcloud",
                base_url="https://example.test/v1",
                api_key="secret-token",
                model="Qwen3.5-9B",
                system_prompt="system",
                user_prompt="user",
                max_attempts=3,
            )

        self.assertEqual(post.call_count, 3)
        self.assertEqual(sleep.call_count, 2)
        create_generation.assert_called_once()
        self.assertIn("Erreur réseau", create_generation.call_args.kwargs["error_message"])

    def test_missing_token_fails_before_any_network_call(self):
        with patch(
            "apps.ai_assist.services.openai_compatible.requests.post"
        ) as post:
            with self.assertRaises(LLMProviderNotConfigured):
                generate_openai_compatible(
                    user=self.user,
                    endpoint="events.extract.ovh",
                    provider="OVHcloud",
                    base_url="https://example.test/v1",
                    api_key="",
                    model="Qwen3.5-9B",
                    system_prompt="system",
                    user_prompt="user",
                )
            post.assert_not_called()

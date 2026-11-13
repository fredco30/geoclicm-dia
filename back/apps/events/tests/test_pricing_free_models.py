"""Les modèles gratuits OpenCode sont connus de la table de tarifs."""

from decimal import Decimal

from django.test import SimpleTestCase

from apps.ai_assist.services.pricing import (
    MODEL_PRICING,
    OPENCODE_FREE_MODELS,
    estimate_cost_eur,
)


class FreeModelPricingTests(SimpleTestCase):
    def test_every_free_model_is_listed(self):
        # Un modèle absent de la table fait un avertissement par appel, soit
        # plusieurs centaines par collecte.
        for model in OPENCODE_FREE_MODELS:
            self.assertIn(model, MODEL_PRICING, model)

    def test_a_free_model_costs_nothing(self):
        self.assertEqual(
            estimate_cost_eur("deepseek-v4.1-flash-free", 120_000, 8_000), Decimal("0.000000")
        )

    def test_paid_models_are_untouched(self):
        self.assertEqual(MODEL_PRICING["mistral-small-latest"], (Decimal("0.20"), Decimal("0.60")))
        self.assertGreater(estimate_cost_eur("mistral-small-latest", 1_000_000, 0), Decimal("0"))

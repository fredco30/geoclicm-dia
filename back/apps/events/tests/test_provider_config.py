"""Choix du fournisseur IA de la collecte, sans base de données."""

from django.test import SimpleTestCase, override_settings

from apps.events.ai_extraction import ExtractionUnavailable, _provider_config


class ProviderConfigTests(SimpleTestCase):
    @override_settings(EVENT_AI_PROVIDER="opencode", OPENCODE_MODEL="glm-4.6")
    def test_opencode_uses_its_own_model_setting(self):
        self.assertEqual(_provider_config(), ("opencode", "glm-4.6"))

    @override_settings(EVENT_AI_PROVIDER="opencode", OPENCODE_MODEL="")
    def test_opencode_without_a_model_is_refused(self):
        # Aucun défaut n'est raisonnable : la passerelle sert plusieurs
        # familles de modèles, et certaines ne parlent pas /chat/completions.
        with self.assertRaises(ExtractionUnavailable):
            _provider_config()

    @override_settings(EVENT_AI_PROVIDER="OpenCode  ", OPENCODE_MODEL="kimi-k2")
    def test_provider_name_is_normalised(self):
        self.assertEqual(_provider_config(), ("opencode", "kimi-k2"))

    @override_settings(EVENT_AI_PROVIDER="mistral", AI_ASSIST_DEFAULT_MODEL="mistral-small-latest")
    def test_mistral_remains_the_default_path(self):
        self.assertEqual(_provider_config(), ("mistral", "mistral-small-latest"))

    @override_settings(EVENT_AI_PROVIDER="inconnu")
    def test_unknown_provider_is_refused(self):
        with self.assertRaises(ExtractionUnavailable):
            _provider_config()

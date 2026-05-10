from django.apps import AppConfig


class AdsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.ads"
    verbose_name = "Régie publicitaire"

    def ready(self):
        # Signals : pipeline image (cap 1600 + variants) pour AdCampaign.image
        from . import signals  # noqa: F401


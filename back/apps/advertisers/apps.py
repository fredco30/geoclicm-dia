from django.apps import AppConfig


class AdvertisersConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.advertisers"
    verbose_name = "Annonceurs (abonnements & factures)"

    def ready(self):
        # Import des signal handlers Stripe (E.2)
        from . import signals  # noqa: F401

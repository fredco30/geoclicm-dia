from django.apps import AppConfig


class DiscoveryConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.discovery"
    verbose_name = "Découvrir"

    def ready(self) -> None:
        from . import signals  # noqa: F401

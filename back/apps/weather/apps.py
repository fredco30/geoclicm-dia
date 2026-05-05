from django.apps import AppConfig


class WeatherConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.weather"
    verbose_name = "Météo"

    def ready(self):
        from . import signals  # noqa: F401

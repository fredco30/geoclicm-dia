from django.apps import AppConfig


class DirectoryConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.directory"
    verbose_name = "Annuaire commerçants"

    def ready(self):
        # Signals : pipeline image (cap + variants) pour Business.logo + cover_image
        from . import signals  # noqa: F401

from django.apps import AppConfig


class EditorialConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.editorial"
    verbose_name = "Editorial (articles, catégories, tags)"

    def ready(self) -> None:
        from . import signals  # noqa: F401

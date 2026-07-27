"""Settings dev — debug ON, BrowsableAPI activé, mails en console."""
from .base import *  # noqa: F401,F403
from .base import DATABASES, REST_FRAMEWORK, INSTALLED_APPS, MIDDLEWARE

DEBUG = True
ALLOWED_HOSTS = ["*"]

# Évite qu'une commande locale (check, makemigrations…) reste bloquée plusieurs
# minutes lorsqu'aucun tunnel PostgreSQL n'est ouvert.
DATABASES["default"].setdefault("OPTIONS", {})["connect_timeout"] = 3

# GeoDjango sous Windows : permet de pointer vers les DLL QGIS/OSGeo sans
# figer un chemin propre à une machine dans le dépôt.
_gdal_library_path = env("GDAL_LIBRARY_PATH", default="")
if _gdal_library_path:
    GDAL_LIBRARY_PATH = _gdal_library_path

_geos_library_path = env("GEOS_LIBRARY_PATH", default="")
if _geos_library_path:
    GEOS_LIBRARY_PATH = _geos_library_path

INSTALLED_APPS = INSTALLED_APPS + [
    "django_extensions",
]

# DRF : ajouter BrowsableAPIRenderer en dev pour tester via navigateur
REST_FRAMEWORK = {
    **REST_FRAMEWORK,
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        "rest_framework.renderers.BrowsableAPIRenderer",
    ],
}

# Email console (dev uniquement)
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# Logging plus verbeux côté dev
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {"class": "logging.StreamHandler"},
    },
    "loggers": {
        "django": {"handlers": ["console"], "level": "INFO"},
        "django.db.backends": {"handlers": ["console"], "level": "WARNING"},
    },
}

# CORS large en dev
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# CSRF — accepter les origins front en dev pour les POST/PATCH/DELETE depuis Next.js
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://135.125.159.142:3001",
    "https://media.geoclic.fr",
]

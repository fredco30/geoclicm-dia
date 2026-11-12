"""Isolated real auth DB tests without PostGIS/network; never import production env."""

from pathlib import Path

SECRET_KEY = "local-recovery-tests-only"
DEBUG = False
ALLOWED_HOSTS = ["testserver", "media.geoclic.fr", "attacker.example"]
ROOT_URLCONF = "apps.core.recovery_test_urls"
INSTALLED_APPS = ["django.contrib.auth", "django.contrib.contenttypes", "django.contrib.sessions"]
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}}
MIDDLEWARE = [
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
]
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [Path(__file__).resolve().parents[2] / "templates"],
        "APP_DIRS": True,
    }
]
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator", "OPTIONS": {"min_length": 8}},
    {"NAME": "apps.core.password_validators.SymbolValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
PASSWORD_HASHERS = ["django.contrib.auth.hashers.PBKDF2PasswordHasher"]
PASSWORD_RESET_TIMEOUT = 3600
ACCOUNT_RECOVERY_ENABLED = True
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = "smtp.example.test"
EMAIL_HOST_USER = "local-test-user"
EMAIL_HOST_PASSWORD = "local-test-placeholder"
EMAIL_USE_TLS = True
EMAIL_USE_SSL = False
DEFAULT_FROM_EMAIL = "media@example.test"
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

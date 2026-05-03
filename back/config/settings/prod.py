"""Settings prod — sécurité renforcée, Sentry, Whitenoise."""
from .base import *  # noqa: F401,F403
from .base import MIDDLEWARE, env

DEBUG = False

# CSRF trusted origins — nécessaire pour les form POST depuis le front sur autre origin
CSRF_TRUSTED_ORIGINS = env.list(
    "CSRF_TRUSTED_ORIGINS",
    default=["https://media.geoclic.fr"],
)

# --- HTTPS / sécurité ---
SECURE_SSL_REDIRECT = True
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 60 * 60 * 24 * 30  # 30 jours (montera à 1 an après stabilisation)
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = False  # à activer après vérification HSTS preload list
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_REFERRER_POLICY = "same-origin"

# --- Whitenoise (static files servis par Django, simple en sprint 1) ---
MIDDLEWARE = (
    MIDDLEWARE[:1]  # CORS en premier
    + ["whitenoise.middleware.WhiteNoiseMiddleware"]
    + MIDDLEWARE[1:]
)
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {
        "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
    },
}

# --- Email (à configurer Brevo en sprint 2) ---
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"

# --- Sentry (optionnel) ---
SENTRY_DSN = env("SENTRY_DSN", default="")
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.celery import CeleryIntegration
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration(), CeleryIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
        environment="production",
    )

# --- Logging fichier ---
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "file": {
            "class": "logging.FileHandler",
            "filename": "/var/log/geoclicmedia/django.log",
        },
    },
    "loggers": {
        "django": {"handlers": ["file"], "level": "INFO"},
    },
}

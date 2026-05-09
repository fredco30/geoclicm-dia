"""
Settings communs à tous les environnements.

Lecture des variables sensibles via django-environ depuis un .env (jamais committé).
Override par dev.py / prod.py pour les spécificités.
"""
from pathlib import Path

import environ

# --- Chemins ---
# back/config/settings/base.py → BASE_DIR = back/
BASE_DIR = Path(__file__).resolve().parent.parent.parent

# --- env ---
env = environ.Env(
    DJANGO_DEBUG=(bool, False),
)
environ.Env.read_env(BASE_DIR / ".env")

# --- Sécurité ---
SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env("DJANGO_DEBUG")
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# --- Apps ---
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.gis",  # PostGIS / champs géo (GDAL installé sur VPS Linux)
    "django.contrib.postgres",  # SearchVector, ArrayField, etc.
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "drf_spectacular",
    "django_filters",
    "corsheaders",
    "django_celery_beat",
    "django_otp",
    "django_otp.plugins.otp_totp",
    "djstripe",  # synchronisation Stripe ↔ DB (Sprint 3 Lot E)
]

LOCAL_APPS = [
    "apps.core",
    "apps.editorial",
    "apps.directory",
    "apps.ads",
    "apps.advertisers",
    "apps.weather",
    "apps.tiles",
    "apps.assistant",
    "apps.utility",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS

# --- Middleware ---
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django_otp.middleware.OTPMiddleware",  # 2FA admin
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# --- Base de données ---
# PostgreSQL + PostGIS via django.contrib.gis.db.backends.postgis.
# Tout le runtime tourne sur le VPS Linux où GDAL est installé.
DATABASES = {
    "default": {
        "ENGINE": "django.contrib.gis.db.backends.postgis",
        "NAME": env("DB_NAME"),
        "USER": env("DB_USER"),
        "PASSWORD": env("DB_PASSWORD"),
        "HOST": env("DB_HOST", default="localhost"),
        "PORT": env("DB_PORT", default="5432"),
    }
}

# --- Auth ---
AUTH_USER_MODEL = "core.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# --- i18n / l10n ---
LANGUAGE_CODE = "fr-fr"
TIME_ZONE = "Europe/Paris"
USE_I18N = True
USE_TZ = True

# --- Static / Media ---
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"] if (BASE_DIR / "static").exists() else []

MEDIA_URL = env("MEDIA_URL", default="/media/")
MEDIA_ROOT = BASE_DIR / env("MEDIA_ROOT", default="mediafiles")

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- DRF ---
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.SearchFilter",
        "rest_framework.filters.OrderingFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_RENDERER_CLASSES": [
        "rest_framework.renderers.JSONRenderer",
        # BrowsableAPIRenderer ajouté en dev
    ],
}

# --- drf-spectacular ---
SPECTACULAR_SETTINGS = {
    "TITLE": "geoclicMédia API",
    "DESCRIPTION": "API REST publique du média local du littoral camarguais.",
    "VERSION": "0.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
}

# --- CORS ---
CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=[])
CORS_ALLOW_CREDENTIALS = True

# --- Celery ---
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default="redis://localhost:6379/1")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", default="redis://localhost:6379/2")
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_TIMEZONE = TIME_ZONE

# --- Cache (Redis) ---
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": env("REDIS_URL", default="redis://localhost:6379/0"),
    }
}

# --- Sécurité headers (renforcé en prod) ---
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"

# --- Stripe / dj-stripe (Sprint 3 Lot E) ---
# Mode TEST en phase pilote 2026 (cartes 4242 4242 4242 4242 acceptées),
# bascule LIVE au lancement commercial Pâques 2027 via STRIPE_LIVE_MODE=True
# + clés sk_live_*** / pk_live_***.
#
# Récupère les clés depuis https://dashboard.stripe.com/test/apikeys
# Webhook secret : généré quand on crée le webhook endpoint dans Stripe
# (https://dashboard.stripe.com/test/webhooks → endpoint /stripe/webhook/)
STRIPE_TEST_PUBLIC_KEY = env("STRIPE_TEST_PUBLIC_KEY", default="")
STRIPE_TEST_SECRET_KEY = env("STRIPE_TEST_SECRET_KEY", default="")
STRIPE_LIVE_PUBLIC_KEY = env("STRIPE_LIVE_PUBLIC_KEY", default="")
STRIPE_LIVE_SECRET_KEY = env("STRIPE_LIVE_SECRET_KEY", default="")
STRIPE_LIVE_MODE = env.bool("STRIPE_LIVE_MODE", default=False)

# Webhook secret — différent en TEST et LIVE (un endpoint webhook chacun)
DJSTRIPE_WEBHOOK_SECRET = env("DJSTRIPE_WEBHOOK_SECRET", default="")

# UUID au lieu de l'ID Stripe brut comme PK des modèles djstripe
# (recommandé par dj-stripe pour stabilité multi-environnement)
DJSTRIPE_USE_NATIVE_JSONFIELD = True
DJSTRIPE_FOREIGN_KEY_TO_FIELD = "id"

# IDs des prix Stripe (Price IDs) — créés dans le dashboard Stripe :
# https://dashboard.stripe.com/test/products
# Format attendu : price_xxxxxxxxxxxxxxxxx
STRIPE_PRICE_BASIC = env("STRIPE_PRICE_BASIC", default="")     # 79€/an
STRIPE_PRICE_PREMIUM = env("STRIPE_PRICE_PREMIUM", default="")  # 149€/an

# URL publique du site (pour les success/cancel URLs Stripe Checkout)
SITE_URL = env("SITE_URL", default="https://media.geoclic.fr")

# --- Assistant IA (Mistral AI + pgvector) ---
# Clé API Mistral, à générer sur https://console.mistral.ai/api-keys
# Mode TEST gratuit Mistral disponible avec un crédit initial — bascule
# en facturé après. Coûts attendus : 5-15 €/mois en cruise (cf
# docs/20-assistant-ia-deploiement.md).
MISTRAL_API_KEY = env("MISTRAL_API_KEY", default="")
MISTRAL_MODEL = env("MISTRAL_MODEL", default="mistral-small-latest")
MISTRAL_EMBED_MODEL = env("MISTRAL_EMBED_MODEL", default="mistral-embed")

# Anti-abus : nb max de questions par IP par heure (sliding window).
# Hashage SHA-256 de l'IP en cache Redis (RGPD).
ASSISTANT_RATE_LIMIT_PER_HOUR = env.int("ASSISTANT_RATE_LIMIT_PER_HOUR", default=20)

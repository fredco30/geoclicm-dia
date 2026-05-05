"""URL configuration racine."""
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)

from apps.ads.views import ad_redirect


def healthcheck(request):
    """Endpoint de healthcheck pour monitoring (UptimeRobot, k8s, etc.)."""
    return JsonResponse({"status": "ok", "service": "geoclicmedia-api"})


urlpatterns = [
    # Django Admin déplacé sur /django-admin/ pour libérer /admin/* au back-office custom Next.js
    path("django-admin/", admin.site.urls),
    path("healthz/", healthcheck, name="healthcheck"),
    # Redirect tracker pour les clicks d'encarts publicitaires
    path("r/<int:pk>/", ad_redirect, name="ad-redirect"),
    # Webhook Stripe (dj-stripe) — endpoint à enregistrer dans le dashboard Stripe
    path("stripe/", include("djstripe.urls", namespace="djstripe")),
    # API
    path("api/", include("apps.core.urls")),
    path("api/", include("apps.editorial.urls")),
    path("api/", include("apps.directory.urls")),
    path("api/", include("apps.ads.urls")),
    path("api/", include("apps.advertisers.urls")),
    # OpenAPI / Swagger
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/schema/swagger-ui/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/schema/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AdCampaignViewSet, AdServeView, AdvertiserAdCampaignViewSet

app_name = "ads"

# Routeur historique (préfixes "ads" / "ad-campaigns") — conservé en alias
# pour ne pas casser les éventuels liens externes ou caches en circulation.
router = DefaultRouter()
router.register("ad-campaigns", AdCampaignViewSet, basename="ad-campaign")
router.register(
    "advertiser/ad-campaigns",
    AdvertiserAdCampaignViewSet,
    basename="advertiser-ad-campaign",
)

# Routeur "sponsors" (anti-bloqueurs) — les bloqueurs de pub matchent
# agressivement le pattern /ads/ dans les URLs et bloquent les requêtes
# côté navigateur (uBlock, AdBlock). Conséquence directe : 30 à 40 % du
# trafic ne voit pas les encarts servis par /api/ads/serve/. On expose
# donc la même logique sous /api/sponsors/* et le front public
# (composant <AdSlot>) tape exclusivement ces nouvelles URLs.
sponsor_router = DefaultRouter()
sponsor_router.register(
    "sponsor-campaigns", AdCampaignViewSet, basename="sponsor-campaign",
)
sponsor_router.register(
    "advertiser/sponsor-campaigns",
    AdvertiserAdCampaignViewSet,
    basename="advertiser-sponsor-campaign",
)

urlpatterns = [
    # Anciennes URLs — gardées pour compatibilité, ne plus les utiliser
    # depuis le front. Pourront être retirées après stabilisation.
    path("", include(router.urls)),
    path("ads/serve/", AdServeView.as_view(), name="ad-serve"),

    # Nouvelles URLs neutres (anti-bloqueurs) — utilisées par le front.
    path("", include(sponsor_router.urls)),
    path("sponsors/serve/", AdServeView.as_view(), name="sponsor-serve"),
]

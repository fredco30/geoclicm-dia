from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AdCampaignViewSet, AdServeView, AdvertiserAdCampaignViewSet

app_name = "ads"

router = DefaultRouter()
router.register("ad-campaigns", AdCampaignViewSet, basename="ad-campaign")
router.register(
    "advertiser/ad-campaigns",
    AdvertiserAdCampaignViewSet,
    basename="advertiser-ad-campaign",
)

urlpatterns = [
    path("", include(router.urls)),
    path("ads/serve/", AdServeView.as_view(), name="ad-serve"),
]

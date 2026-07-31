from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AdvertiserBusinessViewSet,
    BusinessCategoryViewSet,
    BusinessImportCandidateAdminViewSet,
    BusinessViewSet,
)

app_name = "directory"

router = DefaultRouter()
router.register("businesses", BusinessViewSet, basename="business")
router.register("business-categories", BusinessCategoryViewSet, basename="business-category")
router.register(
    "advertiser/businesses",
    AdvertiserBusinessViewSet,
    basename="advertiser-business",
)
router.register(
    "admin/business-imports",
    BusinessImportCandidateAdminViewSet,
    basename="admin-business-import",
)

urlpatterns = [
    path("", include(router.urls)),
]

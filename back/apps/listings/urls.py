from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    ListingAdminViewSet,
    ListingCategoryAdminViewSet,
    ListingCategoryPublicViewSet,
    ListingImportCandidateAdminViewSet,
    ListingPublicViewSet,
)

router = DefaultRouter()
router.register("listings", ListingPublicViewSet, basename="listing")
router.register("listing-categories", ListingCategoryPublicViewSet, basename="listing-category")
router.register("admin/listings", ListingAdminViewSet, basename="admin-listing")
router.register(
    "admin/listing-categories",
    ListingCategoryAdminViewSet,
    basename="admin-listing-category",
)
router.register(
    "admin/listing-imports",
    ListingImportCandidateAdminViewSet,
    basename="admin-listing-import",
)

urlpatterns = [path("", include(router.urls))]

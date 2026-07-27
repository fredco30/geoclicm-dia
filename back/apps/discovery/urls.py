from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import PlaceAdminViewSet, PlaceCategoryAdminViewSet, PlaceCategoryPublicViewSet, PlacePublicViewSet

router = DefaultRouter()
router.register("places", PlacePublicViewSet, basename="place")
router.register("place-categories", PlaceCategoryPublicViewSet, basename="place-category")
router.register("admin/places", PlaceAdminViewSet, basename="admin-place")
router.register("admin/place-categories", PlaceCategoryAdminViewSet, basename="admin-place-category")

urlpatterns = [path("", include(router.urls))]

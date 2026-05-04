from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BusinessCategoryViewSet, BusinessViewSet

app_name = "directory"

router = DefaultRouter()
router.register("businesses", BusinessViewSet, basename="business")
router.register("business-categories", BusinessCategoryViewSet, basename="business-category")

urlpatterns = [
    path("", include(router.urls)),
]

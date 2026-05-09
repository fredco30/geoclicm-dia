from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .media_views import MediaViewSet
from .views import (
    ArticleViewSet,
    CategoryAdminViewSet,
    CategoryViewSet,
    CommuneViewSet,
    SearchViewSet,
    TagViewSet,
)

app_name = "editorial"

router = DefaultRouter()
router.register("articles", ArticleViewSet, basename="article")
router.register("categories", CategoryViewSet, basename="category")
router.register("tags", TagViewSet, basename="tag")
router.register("communes", CommuneViewSet, basename="commune")
router.register("search", SearchViewSet, basename="search")
router.register("media", MediaViewSet, basename="media")

# CRUD admin séparé sous /api/admin/categories/ — réservé editor/admin.
admin_router = DefaultRouter()
admin_router.register(
    "admin/categories", CategoryAdminViewSet, basename="admin-category",
)

urlpatterns = [
    path("", include(router.urls)),
    path("", include(admin_router.urls)),
]

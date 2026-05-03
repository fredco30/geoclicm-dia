from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .media_views import MediaViewSet
from .views import (
    ArticleViewSet,
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

urlpatterns = [
    path("", include(router.urls)),
]

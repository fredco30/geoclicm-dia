from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import TileAdminViewSet, TilePublicDetailView, TilePublicListView

app_name = "tiles"

admin_router = DefaultRouter()
admin_router.register("admin/tiles", TileAdminViewSet, basename="admin-tile")

urlpatterns = [
    path("", include(admin_router.urls)),
    path("tiles/", TilePublicListView.as_view(), name="tile-list"),
    path("tiles/<int:pk>/", TilePublicDetailView.as_view(), name="tile-detail"),
]

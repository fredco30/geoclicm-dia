from django.urls import include, path
from rest_framework.routers import DefaultRouter

from . import auth_views, views
from .user_views import UserAdminViewSet

app_name = "core"

router = DefaultRouter()
router.register("users", UserAdminViewSet, basename="user")

urlpatterns = [
    path("", views.api_root, name="api-root"),
    path("auth/csrf/", auth_views.CSRFView.as_view(), name="auth-csrf"),
    path("auth/login/", auth_views.LoginView.as_view(), name="auth-login"),
    path("auth/logout/", auth_views.LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", auth_views.MeView.as_view(), name="auth-me"),
    path(
        "auth/register-advertiser/",
        auth_views.AdvertiserRegisterView.as_view(),
        name="auth-register-advertiser",
    ),
    path("", include(router.urls)),
]

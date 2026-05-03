from django.urls import path

from . import auth_views, views

app_name = "core"

urlpatterns = [
    path("", views.api_root, name="api-root"),
    path("auth/csrf/", auth_views.CSRFView.as_view(), name="auth-csrf"),
    path("auth/login/", auth_views.LoginView.as_view(), name="auth-login"),
    path("auth/logout/", auth_views.LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", auth_views.MeView.as_view(), name="auth-me"),
]

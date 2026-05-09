"""URL patterns pour la rubrique Pratique."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import UsefulContactAdminViewSet, UsefulContactPublicListView

app_name = "utility"

admin_router = DefaultRouter()
admin_router.register(
    "admin/utility/contacts",
    UsefulContactAdminViewSet,
    basename="admin-utility-contact",
)

urlpatterns = [
    path("", include(admin_router.urls)),
    path(
        "utility/contacts/",
        UsefulContactPublicListView.as_view(),
        name="utility-contact-list",
    ),
]

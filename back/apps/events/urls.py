from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    EventAdminViewSet,
    EventCategoryAdminViewSet,
    EventCategoryPublicViewSet,
    EventImportCandidateAdminViewSet,
    EventPublicViewSet,
    EventSourceAdminViewSet,
    event_ics,
)

public_router = DefaultRouter()
public_router.register("events", EventPublicViewSet, basename="event")
public_router.register(
    "event-categories",
    EventCategoryPublicViewSet,
    basename="event-category",
)

admin_router = DefaultRouter()
admin_router.register("admin/events", EventAdminViewSet, basename="admin-event")
admin_router.register("admin/event-sources", EventSourceAdminViewSet, basename="admin-event-source")
admin_router.register("admin/event-imports", EventImportCandidateAdminViewSet, basename="admin-event-import")
admin_router.register(
    "admin/event-categories",
    EventCategoryAdminViewSet,
    basename="admin-event-category",
)

urlpatterns = [
    path("", include(public_router.urls)),
    path("", include(admin_router.urls)),
    path("events/<slug:slug>/calendar.ics", event_ics, name="event-ics"),
]

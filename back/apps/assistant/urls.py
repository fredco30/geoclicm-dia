from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import AssistantAskView, CrawlSourceAdminViewSet

app_name = "assistant"

admin_router = DefaultRouter()
admin_router.register(
    "admin/crawl-sources",
    CrawlSourceAdminViewSet,
    basename="admin-crawl-source",
)

urlpatterns = [
    path("assistant/ask/", AssistantAskView.as_view(), name="assistant-ask"),
    path("", include(admin_router.urls)),
]

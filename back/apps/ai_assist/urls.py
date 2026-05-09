"""URL patterns pour l'app ai_assist."""
from django.urls import path

from .views import BusinessDescribeView

app_name = "ai_assist"

urlpatterns = [
    path(
        "business/describe/",
        BusinessDescribeView.as_view(),
        name="business-describe",
    ),
]

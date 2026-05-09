"""URL patterns pour l'app ai_assist."""
from django.urls import path

from .views import AdHeadlineView, BusinessDescribeView, TextRewriteView

app_name = "ai_assist"

urlpatterns = [
    path(
        "business/describe/",
        BusinessDescribeView.as_view(),
        name="business-describe",
    ),
    path(
        "text/rewrite/",
        TextRewriteView.as_view(),
        name="text-rewrite",
    ),
    path(
        "ad/headline/",
        AdHeadlineView.as_view(),
        name="ad-headline",
    ),
]

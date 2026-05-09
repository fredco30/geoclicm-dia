from django.urls import path

from .views import AssistantAskView

app_name = "assistant"

urlpatterns = [
    path("assistant/ask/", AssistantAskView.as_view(), name="assistant-ask"),
]

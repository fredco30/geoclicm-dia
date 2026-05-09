"""URL patterns pour l'app ai_assist.

PR-A1 : aucun endpoint exposé pour l'instant — c'est la fondation. Les
features arrivent dans les PRs suivantes :
- PR-A2 : POST /api/ai-assist/business/describe/
- PR-A3 : POST /api/ai-assist/text/rewrite/
- PR-A4 : POST /api/ai-assist/ad/headline/
"""
from django.urls import path

app_name = "ai_assist"

urlpatterns: list = [
    # Vide en PR-A1
]

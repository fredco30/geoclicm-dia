"""Vues API core."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def api_root(request):
    """Point d'entrée de l'API publique. Liste les endpoints disponibles."""
    return Response(
        {
            "service": "geoclicmedia-api",
            "version": "0.1.0",
            "endpoints": {
                "schema": "/api/schema/",
                "swagger": "/api/schema/swagger-ui/",
                "redoc": "/api/schema/redoc/",
                "articles": "/api/articles/",
                "categories": "/api/categories/",
                "communes": "/api/communes/",
                "tags": "/api/tags/",
                "search": "/api/search/?q=...",
                "auth": {
                    "csrf": "/api/auth/csrf/",
                    "login": "/api/auth/login/",
                    "logout": "/api/auth/logout/",
                    "me": "/api/auth/me/",
                },
            },
        }
    )

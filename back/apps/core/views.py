"""Vues API core (sprint 1 minimal)."""
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
                # ÉTAPE 3 : articles, categories, communes, tags, search
            },
        }
    )

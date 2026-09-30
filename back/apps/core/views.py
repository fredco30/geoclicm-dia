"""Vues API core."""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, BasePermission
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


class CanPublish(BasePermission):
    """Équipe éditoriale uniquement (editor/admin/superuser), lecture comprise."""

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user.is_authenticated and getattr(request.user, "can_publish", False)
        )


@api_view(["GET"])
@permission_classes([CanPublish])
def pending_counts(request):
    """GET /api/admin/pending-counts/ — candidats « À valider » par boîte.

    Même périmètre que la vue par défaut de chaque boîte : statuts
    « à vérifier » et « incomplet ».
    """
    from apps.directory.models import BusinessImportCandidate
    from apps.discovery.models import PlaceImportCandidate
    from apps.events.models import EventImportCandidate
    from apps.listings.models import ListingImportCandidate

    def count(model) -> int:
        return model.objects.filter(
            status__in=(model.Status.PENDING, model.Status.INVALID)
        ).count()

    return Response(
        {
            "events": count(EventImportCandidate),
            "places": count(PlaceImportCandidate),
            "businesses": count(BusinessImportCandidate),
            "listings": count(ListingImportCandidate),
        }
    )

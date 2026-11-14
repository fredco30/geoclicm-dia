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

    Seulement ce qui est réellement actionnable : les « incomplets » ont
    leur propre onglet et gonflaient le badge (685 dont une majorité de
    pages sans évènement). Pour l'Agenda, on exclut aussi les candidats
    dont la date unique est passée depuis le crawl.
    """
    from django.db.models import Q
    from django.utils import timezone

    from apps.directory.models import Business, BusinessImportCandidate
    from apps.discovery.models import PlaceImportCandidate
    from apps.events.models import EventImportCandidate
    from apps.listings.models import ListingImportCandidate

    def pending(model):
        return model.objects.filter(status__in=(model.Status.PENDING, "needs_review"))

    # Une série (au moins 2 occurrences) garde son badge : sa première date
    # peut être passée alors qu'il lui en reste à venir.
    events = pending(EventImportCandidate).exclude(
        Q(ends_at__lt=timezone.now()) & Q(occurrences__1__isnull=True)
    )

    return Response(
        {
            "events": events.count(),
            "places": pending(PlaceImportCandidate).count(),
            "businesses": pending(BusinessImportCandidate).count(),
            "listings": pending(ListingImportCandidate).count(),
            # Modifications de fiches publiées proposées par les annonceurs.
            "business_changes": Business.objects.filter(pending_changes__isnull=False).count(),
        }
    )

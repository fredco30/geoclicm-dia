from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.editorial.permissions import IsEditorOrAdmin

from .models import Listing, ListingCategory, ListingImportCandidate
from .serializers import (
    ListingCategorySerializer,
    ListingDetailSerializer,
    ListingImportCandidateSerializer,
    ListingListSerializer,
    ListingWriteSerializer,
)


def _active_queryset():
    """Annonces visibles publiquement : publiées et non expirées."""
    return (
        Listing.objects.select_related("category", "commune")
        .filter(status=Listing.Status.PUBLISHED)
        .exclude(expires_at__isnull=False, expires_at__lt=timezone.now())
    )


class ListingPublicViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ListingListSerializer
    lookup_field = "slug"
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        qs = _active_queryset()
        params = self.request.query_params
        if params.get("category"):
            qs = qs.filter(category__slug=params["category"])
        if params.get("commune"):
            qs = qs.filter(commune__slug=params["commune"])
        return qs

    def get_serializer_class(self):
        return ListingListSerializer if self.action == "list" else ListingDetailSerializer


class ListingCategoryPublicViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    queryset = ListingCategory.objects.filter(is_active=True)
    serializer_class = ListingCategorySerializer
    lookup_field = "slug"
    permission_classes = (permissions.AllowAny,)
    pagination_class = None


class ListingAdminViewSet(viewsets.ModelViewSet):
    """CRUD admin des annonces (saisie manuelle : locations annuelles, etc.)."""

    queryset = Listing.objects.select_related("category", "commune", "created_by")
    lookup_field = "slug"
    permission_classes = (permissions.IsAuthenticated, IsEditorOrAdmin)
    pagination_class = None

    def get_serializer_class(self):
        return (
            ListingWriteSerializer
            if self.action in ("create", "update", "partial_update")
            else ListingDetailSerializer
        )

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ListingCategoryAdminViewSet(viewsets.ModelViewSet):
    queryset = ListingCategory.objects.all()
    serializer_class = ListingCategorySerializer
    lookup_field = "slug"
    permission_classes = (permissions.IsAuthenticated, IsEditorOrAdmin)
    pagination_class = None


class ListingImportCandidateAdminViewSet(viewsets.ModelViewSet):
    """Boîte « À valider » Annonces : validation humaine des offres détectées."""

    queryset = ListingImportCandidate.objects.all().select_related(
        "crawl_source", "commune", "category", "matched_listing"
    )
    serializer_class = ListingImportCandidateSerializer
    permission_classes = (permissions.IsAuthenticated, IsEditorOrAdmin)
    pagination_class = None
    http_method_names = ("get", "patch", "post", "head", "options")

    def get_queryset(self):
        qs = super().get_queryset()
        if source_id := self.request.query_params.get("source"):
            qs = qs.filter(crawl_source_id=source_id)
        if candidate_status := self.request.query_params.get("status"):
            qs = qs.filter(status=candidate_status)
        else:
            qs = qs.filter(
                status__in=(
                    ListingImportCandidate.Status.PENDING,
                    ListingImportCandidate.Status.INVALID,
                    ListingImportCandidate.Status.NEEDS_REVIEW,
                )
            )
        # Toujours borné : sans limite, une liste de plusieurs milliers de
        # candidats (charges utiles IA comprises) bloquait les workers
        # Gunicorn et rendait tout le site indisponible.
        if self.action == "list":
            try:
                limit = min(max(int(self.request.query_params.get("limit", 50)), 1), 100)
                offset = max(int(self.request.query_params.get("offset", 0)), 0)
            except (TypeError, ValueError):
                limit, offset = 50, 0
            qs = qs[offset : offset + limit]
        return qs

    @action(detail=True, methods=["post"], url_path="confirm-validity")
    def confirm_validity(self, request, pk=None):
        from copy import deepcopy

        from django.db import transaction

        from apps.discovery.review import lock_identity, review_candidate
        from apps.discovery.validity import validity

        if request.data.get("confirmed") is not True:
            return Response({"detail": "Confirmer explicitement la vérification de la source."}, status=400)
        with transaction.atomic():
            candidate = self.get_object()
            lock_identity(candidate)
            candidate.refresh_from_db()
            if candidate.status in {"imported", "rejected"}:
                return Response({"detail": "Ce candidat est déjà traité."}, status=400)
            if validity(candidate).state == "expired":
                return Response({"detail": "La période prouvée est terminée : corriger la source avant validation."}, status=400)
            payload = deepcopy(candidate.raw_payload or {})
            review = payload.setdefault("review", {})
            review["validity_confirmation"] = {
                "checked_at": timezone.now().isoformat(), "user_id": request.user.pk,
                "source_url": candidate.source_url,
            }
            candidate.raw_payload = payload
            candidate.save(update_fields=["raw_payload"])
            candidate = review_candidate(candidate)
        return Response(self.get_serializer(candidate).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        from apps.discovery.multi_sync import import_listing_candidate

        candidate = self.get_object()
        serializer = self.get_serializer(
            candidate, data=request.data or {}, partial=True
        )
        serializer.is_valid(raise_exception=True)
        candidate = serializer.save()
        missing = []
        if candidate.category_id is None:
            missing.append("catégorie")
        if missing:
            return Response(
                {"detail": "Champs requis : " + ", ".join(missing)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            listing = import_listing_candidate(
                candidate, user=request.user, publish=True
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            ListingDetailSerializer(listing, context={"request": request}).data
        )

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        candidate = self.get_object()
        candidate.status = ListingImportCandidate.Status.REJECTED
        candidate.save(update_fields=["status", "last_seen_at"])
        return Response(self.get_serializer(candidate).data)

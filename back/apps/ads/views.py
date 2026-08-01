"""
ViewSets DRF pour ads.

- AdCampaignViewSet : CRUD admin (editor/admin)
- AdServeView : endpoint public /api/ads/serve/?placement=X (sert un
  encart aux conditions de placement + ciblage), incrémente impression_count
- ad_redirect : redirect /r/<id>/ qui incrémente click_count puis redirige
  vers target_url
"""
from __future__ import annotations

import random

from django.db.models import F, Q
from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, status, viewsets
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.core.models import User
from apps.editorial.permissions import IsEditorOrAdmin

from .filters import AdCampaignFilter
from .models import AdCampaign
from .permissions import IsAdvertiserOrTeam, IsCampaignOwnerOrTeam
from .serializers import (
    AdCampaignAdvertiserWriteSerializer,
    AdCampaignDetailSerializer,
    AdCampaignListSerializer,
    AdCampaignWriteSerializer,
    AdServeSerializer,
)


class AdCampaignViewSet(viewsets.ModelViewSet):
    """
    /api/ad-campaigns/         — list (admin)
    /api/ad-campaigns/<pk>/    — detail
    POST/PATCH/DELETE          — réservés editor/admin
    """

    queryset = AdCampaign.objects.select_related("business").prefetch_related(
        "target_communes", "target_categories"
    )
    permission_classes = (IsEditorOrAdmin,)
    filterset_class = AdCampaignFilter
    filter_backends = (DjangoFilterBackend, filters.OrderingFilter, filters.SearchFilter)
    search_fields = ("name", "headline", "business__name")
    ordering_fields = ("starts_at", "ends_at", "impression_count", "click_count")
    ordering = ("-starts_at",)

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return AdCampaignWriteSerializer
        if self.action == "list":
            return AdCampaignListSerializer
        return AdCampaignDetailSerializer


class AdvertiserAdCampaignViewSet(viewsets.ModelViewSet):
    """
    /api/advertiser/ad-campaigns/        — list (limité aux campagnes des
                                            businesses du user)
    /api/advertiser/ad-campaigns/<pk>/   — detail
    POST/PATCH/DELETE                    — gestion par l'annonceur de SES
                                            campagnes

    À la création : is_active=False, is_paid=False (validation par
    l'équipe avant diffusion). Le ciblage (target_communes / categories)
    n'est pas exposé en self-service v1 — phase pilote, chaque
    commerçant cible "tout le territoire" par défaut.
    """

    permission_classes = (IsAdvertiserOrTeam, IsCampaignOwnerOrTeam)
    filter_backends = (DjangoFilterBackend, filters.OrderingFilter)
    ordering_fields = ("starts_at", "ends_at", "impression_count", "click_count")
    ordering = ("-starts_at",)

    def get_queryset(self):
        qs = AdCampaign.objects.select_related("business")
        user = self.request.user
        if user.is_superuser or user.role in {User.Role.EDITOR, User.Role.ADMIN}:
            return qs
        # Advertiser : uniquement les campagnes de SES businesses
        return qs.filter(business__owner=user)

    def get_serializer_class(self):
        if self.action in ("create", "update", "partial_update"):
            return AdCampaignAdvertiserWriteSerializer
        if self.action == "list":
            return AdCampaignListSerializer
        return AdCampaignDetailSerializer

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == User.Role.ADVERTISER:
            # Sécurité : on ne fait pas confiance au champ business reçu —
            # on vérifie qu'il appartient bien à l'utilisateur
            business = serializer.validated_data.get("business")
            if business and business.owner_id != user.id:
                from rest_framework.exceptions import PermissionDenied
                raise PermissionDenied(
                    "Tu ne peux créer une campagne que pour une de tes fiches."
                )
            serializer.save(is_active=False, is_paid=False)
        else:
            serializer.save()


class AdServeView(APIView):
    """
    GET /api/ads/serve/?placement=home_sidebar&commune=le-grau-du-roi&category=restauration

    Retourne UNE campagne active à la date courante pour le placement demandé,
    en respectant le ciblage (communes / catégories) si fourni dans la requête.

    Si plusieurs candidates : choix random pour répartir les impressions.
    Si aucune : 204 No Content (le composant front rend null, sans encart).

    Incrémente impression_count atomiquement (F-expression).
    """

    permission_classes = (AllowAny,)

    def get(self, request):
        placement = request.query_params.get("placement", "").strip()
        if not placement:
            return Response(
                {"detail": "Paramètre `placement` requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        commune_slug = request.query_params.get("commune", "").strip()
        category_slug = request.query_params.get("category", "").strip()

        now = timezone.now()
        qs = AdCampaign.objects.filter(
            placement=placement,
            is_active=True,
            starts_at__lte=now,
            ends_at__gte=now,
        ).select_related("business")

        # Ciblage commune : passer si la campagne ne cible aucune commune
        # spécifique OU si la commune courante est dans target_communes.
        if commune_slug:
            qs = qs.filter(
                Q(target_communes__isnull=True) | Q(target_communes__slug=commune_slug)
            )
        else:
            qs = qs.filter(target_communes__isnull=True)

        if category_slug:
            qs = qs.filter(
                Q(target_categories__isnull=True)
                | Q(target_categories__slug=category_slug)
            )
        else:
            qs = qs.filter(target_categories__isnull=True)

        candidates = list(qs.distinct().values_list("id", flat=True))
        if not candidates:
            return Response(status=status.HTTP_204_NO_CONTENT)

        chosen_id = random.choice(candidates)
        campaign = (
            AdCampaign.objects.select_related("business", "featured_event")
            .prefetch_related("featured_event__occurrences")
            .get(pk=chosen_id)
        )

        # Incrément atomique impression_count
        AdCampaign.objects.filter(pk=chosen_id).update(
            impression_count=F("impression_count") + 1
        )

        serializer = AdServeSerializer(campaign, context={"request": request})
        return Response(serializer.data)


@api_view(["GET"])
@permission_classes([AllowAny])
def ad_redirect(request, pk: int):
    """
    GET /r/<id>/

    Incrémente click_count puis redirige vers la target_url de la campagne.
    Retourne 404 si la campagne n'existe pas (pas de fuite info).
    """
    campaign = get_object_or_404(AdCampaign, pk=pk)
    AdCampaign.objects.filter(pk=campaign.pk).update(
        click_count=F("click_count") + 1
    )
    # Bandeau "Agenda — À la une" : le clic renvoie vers la fiche de
    # l'événement mis en avant (target_url externe ignorée dans ce mode).
    if campaign.featured_event_id:
        return HttpResponseRedirect(f"/agenda/{campaign.featured_event.slug}")
    return HttpResponseRedirect(campaign.target_url)

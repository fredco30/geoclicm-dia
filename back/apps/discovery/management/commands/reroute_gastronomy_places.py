"""Bascule les candidats Découvrir « gastronomie » en attente vers Commerçants.

Ponctuel : avant le correctif du prompt, les restaurants arrivaient dans
Découvrir avec la catégorie inactive « Gastronomie ». Sans --apply : simulation.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q

from apps.discovery.models import PlaceImportCandidate as P
from apps.discovery.multi_extraction import (
    as_gastronomy_business,
    is_gastronomy_place,
    normalize_business,
)
from apps.discovery.multi_sync import _upsert_business_candidate


class Command(BaseCommand):
    help = "Bascule les candidats Découvrir gastronomie vers Commerçants."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true")

    def handle(self, *args, apply=False, **options):
        qs = P.objects.filter(status__in=(P.Status.PENDING, P.Status.INVALID)).select_related(
            "crawl_source", "category"
        )
        moved = skipped = 0
        for cand in qs.iterator():
            raw = (cand.raw_payload or {}).get("ai") or {}
            is_gastro = is_gastronomy_place(raw) or (
                cand.category is not None and cand.category.slug == "gastronomie"
            )
            if not is_gastro:
                continue
            source = cand.crawl_source
            page = source.pages.filter(
                Q(final_url=cand.source_url) | Q(canonical_url=cand.source_url)
            ).first()
            if page is None or not raw:
                skipped += 1
                self.stdout.write(f"  ignoré #{cand.pk} {cand.title} (page ou sortie IA absente)")
                continue
            business_raw = as_gastronomy_business(raw)
            self.stdout.write(f"  #{cand.pk} {cand.title} -> {business_raw['category_hint']}")
            moved += 1
            if apply:
                with transaction.atomic():
                    data = normalize_business(source, business_raw, crawl_page=page)
                    _upsert_business_candidate(source, data)
                    cand.status = P.Status.REJECTED
                    cand.save(update_fields=["status"])
        verb = "basculés" if apply else "à basculer (simulation, ajouter --apply)"
        self.stdout.write(self.style.SUCCESS(f"{moved} {verb}, {skipped} ignorés"))

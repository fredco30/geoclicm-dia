"""Signale les dates d'événement incompatibles avec la date de leur page.

    python manage.py flag_doubtful_dates            # rapport seul
    python manage.py flag_doubtful_dates --apply    # pose le motif

Les candidats déjà collectés ont été datés en ancrant un jour-mois sans année
sur « aujourd'hui » : une page de 2024 annonçant « 14 juillet » a donc produit
le 14 juillet de l'an prochain, un événement que personne n'a annoncé. On
compare ici la date annoncée à la date que la page expose elle-même.

Seuls les candidats encore en attente ET datés dans le futur sont modifiés : une
date passée est déjà hors de l'agenda, et un candidat déjà importé correspond à
un événement publié qu'on ne retouche pas en silence — il est seulement listé.
"""

from __future__ import annotations

from collections import Counter

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.assistant.models import CrawledPage
from apps.discovery.page_dates import resolve_page_dates
from apps.events.imports import DATE_ANCHOR_ERROR, implausible_date_reason
from apps.events.models import EventImportCandidate


class Command(BaseCommand):
    help = "Signale les dates incompatibles avec la date de la page. Simulation par défaut."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", dest="apply_changes")

    def handle(self, *args, **options):
        now = timezone.now()
        counters = Counter()
        future_rows: list[str] = []
        published_rows: list[str] = []

        queryset = (
            EventImportCandidate.objects.filter(
                extraction_method=EventImportCandidate.ExtractionMethod.AI
            )
            .exclude(occurrences=[])
            .exclude(
                status__in=(
                    EventImportCandidate.Status.REJECTED,
                    EventImportCandidate.Status.DUPLICATE,
                )
            )
            .order_by("starts_at")
        )

        with transaction.atomic():
            for candidate in queryset.iterator():
                page = (
                    CrawledPage.objects.filter(
                        Q(final_url=candidate.source_url) | Q(canonical_url=candidate.source_url)
                    )
                    .only("metadata", "json_ld")
                    .first()
                )
                page_dates = (
                    resolve_page_dates(page.metadata, page.json_ld) if page is not None else {}
                )
                reason = implausible_date_reason(candidate.occurrences, page_dates, now=now)
                if not reason:
                    counters["date plausible"] += 1
                    continue

                when = (
                    timezone.localtime(candidate.starts_at).strftime("%d/%m/%Y %H:%M")
                    if candidate.starts_at
                    else "date inconnue"
                )
                line = f"#{candidate.pk}  {when}  {candidate.title[:48]}"

                if candidate.status == EventImportCandidate.Status.IMPORTED:
                    counters["déjà publié (à vérifier à la main)"] += 1
                    if len(published_rows) < 50:
                        published_rows.append(f"{line}   {reason}")
                    continue

                reference = candidate.ends_at or candidate.starts_at
                if reference is None or reference < now:
                    counters["date passée (sans effet sur l'agenda)"] += 1
                    continue

                counters["à venir : motif posé"] += 1
                if len(future_rows) < 100:
                    future_rows.append(f"{line}   {reason}")
                errors = list(candidate.validation_errors or [])
                if DATE_ANCHOR_ERROR not in errors:
                    errors.append(DATE_ANCHOR_ERROR)
                candidate.validation_errors = errors
                candidate.status = EventImportCandidate.Status.INVALID
                candidate.save(update_fields=["validation_errors", "status", "last_seen_at"])

            if not options["apply_changes"]:
                transaction.set_rollback(True)

        self.stdout.write("")
        for label, count in counters.most_common():
            self.stdout.write(f"  {count}  {label}")
        if future_rows:
            self.stdout.write("")
            self.stdout.write("À venir, date incompatible avec la page — à rejeter ou corriger :")
            for line in future_rows:
                self.stdout.write(f"  {line}")
        if published_rows:
            self.stdout.write("")
            self.stdout.write(self.style.WARNING("Déjà publiés, non modifiés :"))
            for line in published_rows:
                self.stdout.write(f"  {line}")
        self.stdout.write("")
        if options["apply_changes"]:
            self.stdout.write(self.style.SUCCESS("Motif posé sur les candidats à venir."))
        else:
            self.stdout.write(
                self.style.WARNING("Simulation : rien n'a été modifié. Relancer avec --apply.")
            )

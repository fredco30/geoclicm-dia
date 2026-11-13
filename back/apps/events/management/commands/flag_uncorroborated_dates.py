"""Signale les dates d'événement que la page ne corrobore pas. Simulation par défaut.

    python manage.py flag_uncorroborated_dates            # rapport seul
    python manage.py flag_uncorroborated_dates --apply    # pose le motif

Le prompt d'extraction interdit de fabriquer une date, mais le modèle projette
quand même une année que le document ne donne pas : 1er janvier sur une activité
permanente, édition passée reportée à l'année suivante. Une année introuvable
dans le texte de la page n'a pas été lue, et seul un humain peut trancher.

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
from apps.events.imports import (
    DATE_EVIDENCE_ERROR,
    normalize_page_text,
    years_absent_from_page,
)
from apps.events.models import EventImportCandidate


class Command(BaseCommand):
    help = "Signale les dates non corroborées par la page. Simulation par défaut."

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
                    .only("cleaned_text")
                    .first()
                )
                if page is None:
                    counters["page introuvable (non vérifiable)"] += 1
                    continue

                missing = years_absent_from_page(
                    candidate.occurrences, normalize_page_text(page.cleaned_text)
                )
                if not missing:
                    counters["année corroborée"] += 1
                    continue

                reference = candidate.ends_at or candidate.starts_at
                is_future = reference is not None and reference >= now
                when = (
                    timezone.localtime(candidate.starts_at).strftime("%d/%m/%Y %H:%M")
                    if candidate.starts_at
                    else "date inconnue"
                )
                line = f"#{candidate.pk}  {when}  {candidate.title[:50]}"

                if candidate.status == EventImportCandidate.Status.IMPORTED:
                    counters["déjà publié (à vérifier à la main)"] += 1
                    if len(published_rows) < 50:
                        published_rows.append(line)
                    continue
                if not is_future:
                    counters["date passée (sans effet sur l'agenda)"] += 1
                    continue

                counters["à venir : motif posé"] += 1
                if len(future_rows) < 100:
                    future_rows.append(f"{line}   années absentes : {', '.join(missing)}")
                errors = list(candidate.validation_errors or [])
                if DATE_EVIDENCE_ERROR not in errors:
                    errors.append(DATE_EVIDENCE_ERROR)
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
            self.stdout.write("À venir, année introuvable dans la page — à rejeter ou corriger :")
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

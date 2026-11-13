"""Retrouve les dates perdues des candidats Agenda. Simulation par défaut.

    python manage.py recover_dates_from_text            # rapport seul
    python manage.py recover_dates_from_text --apply    # applique

582 candidats n'ont aucune date alors que leur page l'annonce : l'IA a renvoyé
« occurrences: [] » parce qu'elle ne pouvait pas garantir une date future sans
année, tout en recopiant « Vernissage le vendredi 04 juillet à 18h30 » dans ses
preuves. L'année se retrouve en accordant le jour de la semaine, sans appel IA.

Les dates retrouvées étant souvent passées, beaucoup de candidats partent en
« Expirés » : c'est l'objectif, ils encombraient la boîte. Rien n'est publié,
l'approbation reste un geste humain.
"""

from __future__ import annotations

from collections import Counter

from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.assistant.models import CrawledPage
from apps.events.event_dates import apply_occurrence_filter
from apps.events.imports import DATES_ERROR, occurrences_from_text
from apps.events.models import EventImportCandidate


class Command(BaseCommand):
    help = "Retrouve les dates perdues par accord du jour de la semaine. Simulation par défaut."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", dest="apply_changes")

    def handle(self, *args, **options):
        cutoff = timezone.now()
        counters = Counter()
        samples: dict[str, list[str]] = {"a_venir": [], "expire": []}

        queryset = EventImportCandidate.objects.filter(
            validation_errors__contains=[DATES_ERROR],
            status__in=(
                EventImportCandidate.Status.PENDING,
                EventImportCandidate.Status.INVALID,
            ),
            occurrences=[],
        ).order_by("id")

        with transaction.atomic():
            for candidate in queryset.iterator():
                page = (
                    CrawledPage.objects.filter(
                        Q(final_url=candidate.source_url) | Q(canonical_url=candidate.source_url)
                    )
                    .only("fetched_at")
                    .first()
                )
                if page is None:
                    counters["page introuvable"] += 1
                    continue

                evidence = (candidate.raw_payload or {}).get("verified_evidence") or []
                occurrences = occurrences_from_text(
                    candidate.title,
                    candidate.short_description,
                    *(evidence if isinstance(evidence, list) else []),
                    reference=page.fetched_at.date(),
                )
                if not occurrences:
                    counters["aucune date lisible (reste sans date)"] += 1
                    continue

                data = apply_occurrence_filter({"occurrences": occurrences}, cutoff=cutoff)
                errors = [
                    error for error in (candidate.validation_errors or []) if error != DATES_ERROR
                ]
                candidate.occurrences = data["occurrences"]
                candidate.validation_errors = errors
                fields = ["occurrences", "validation_errors", "status", "last_seen_at"]
                when = str(data["occurrences"][0].get("starts_at"))[:16]
                line = f"#{candidate.pk}  {when}  {candidate.title[:48]}"

                if data["_expired"]:
                    candidate.status = EventImportCandidate.Status.EXPIRED
                    counters["date retrouvée, déjà passée (« Expirés »)"] += 1
                    if len(samples["expire"]) < 15:
                        samples["expire"].append(line)
                else:
                    candidate.starts_at = data["starts_at"]
                    candidate.ends_at = data["ends_at"]
                    candidate.is_all_day = data["is_all_day"]
                    fields += ["starts_at", "ends_at", "is_all_day"]
                    if candidate.status == EventImportCandidate.Status.INVALID and not errors:
                        candidate.status = EventImportCandidate.Status.PENDING
                    counters["date retrouvée, à venir"] += 1
                    if len(samples["a_venir"]) < 25:
                        samples["a_venir"].append(line)

                candidate.save(update_fields=fields)

            if not options["apply_changes"]:
                transaction.set_rollback(True)

        self.stdout.write("")
        for label, count in counters.most_common():
            self.stdout.write(f"  {count}  {label}")
        for bucket, title in (
            ("a_venir", "Dates retrouvées, à venir"),
            ("expire", "Dates retrouvées, déjà passées"),
        ):
            if samples[bucket]:
                self.stdout.write("")
                self.stdout.write(f"{title} :")
                for line in samples[bucket]:
                    self.stdout.write(f"  {line}")
        self.stdout.write("")
        if options["apply_changes"]:
            self.stdout.write(self.style.SUCCESS("Dates appliquées."))
        else:
            self.stdout.write(
                self.style.WARNING("Simulation : rien n'a été modifié. Relancer avec --apply.")
            )

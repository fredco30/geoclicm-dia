"""Répare les candidats Agenda bloqués sur « Dates absentes ». Simulation par défaut.

    python manage.py repair_candidate_dates            # rapport seul
    python manage.py repair_candidate_dates --apply    # applique

Le prompt d'extraction interdit d'inventer une heure : l'IA renvoie donc souvent
une occurrence sans `ends_at`. Le chemin IA la jetait au lieu de déduire la fin,
comme le font déjà les chemins JSON-LD et ICS, et le candidat restait bloqué.

Les occurrences brutes sont conservées dans `raw_payload["ai"]` : la réparation
se fait hors ligne, sans re-crawl ni appel Mistral. Rien n'est publié,
l'approbation reste un geste humain.
"""

from __future__ import annotations

from collections import Counter

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.events.event_dates import apply_occurrence_filter
from apps.events.imports import DATES_ERROR, build_occurrences
from apps.events.models import EventImportCandidate


class Command(BaseCommand):
    help = "Déduit la date de fin manquante des candidats Agenda. Simulation par défaut."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", dest="apply_changes")

    def handle(self, *args, **options):
        cutoff = timezone.now()
        counters = Counter()
        examples: list[str] = []
        queryset = EventImportCandidate.objects.filter(
            validation_errors__contains=[DATES_ERROR],
            status__in=(
                EventImportCandidate.Status.PENDING,
                EventImportCandidate.Status.INVALID,
            ),
        ).order_by("id")

        total = 0
        with transaction.atomic():
            for candidate in queryset:
                total += 1
                raw = (candidate.raw_payload or {}).get("ai")
                occurrences = build_occurrences(
                    raw.get("occurrences") if isinstance(raw, dict) else None
                )
                if not occurrences:
                    counters["aucune date dans la page (à rejeter)"] += 1
                    continue

                data = apply_occurrence_filter({"occurrences": occurrences}, cutoff=cutoff)
                errors = [
                    error for error in (candidate.validation_errors or []) if error != DATES_ERROR
                ]
                candidate.occurrences = data["occurrences"]
                candidate.validation_errors = errors
                fields = ["occurrences", "validation_errors", "status", "last_seen_at"]

                if data["_expired"]:
                    candidate.status = EventImportCandidate.Status.EXPIRED
                    counters["dates passées (expiré)"] += 1
                else:
                    candidate.starts_at = data["starts_at"]
                    candidate.ends_at = data["ends_at"]
                    candidate.is_all_day = data["is_all_day"]
                    fields += ["starts_at", "ends_at", "is_all_day"]
                    if candidate.status == EventImportCandidate.Status.INVALID and not errors:
                        candidate.status = EventImportCandidate.Status.PENDING
                        counters["réparé et complet (passe dans « À valider »)"] += 1
                    else:
                        counters["réparé, autre motif restant"] += 1
                    if len(examples) < 8:
                        when = timezone.localtime(data["starts_at"]).strftime("%d/%m/%Y %H:%M")
                        examples.append(f"{candidate.title[:55]} → {when}")

                candidate.save(update_fields=fields)

            if not options["apply_changes"]:
                transaction.set_rollback(True)

        self.stdout.write("")
        self.stdout.write(f"Candidats bloqués sur les dates : {total}")
        for label, count in counters.most_common():
            self.stdout.write(f"  {count}  {label}")
        if examples:
            self.stdout.write("")
            self.stdout.write("Exemples de dates retrouvées :")
            for line in examples:
                self.stdout.write(f"  - {line}")
        self.stdout.write("")
        if options["apply_changes"]:
            self.stdout.write(self.style.SUCCESS("Modifications appliquées."))
        else:
            self.stdout.write(
                self.style.WARNING("Simulation : rien n'a été modifié. Relancer avec --apply.")
            )

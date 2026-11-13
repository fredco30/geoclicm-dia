"""Trie les candidats Agenda restés sans aucune date. Simulation par défaut.

    python manage.py triage_undated_candidates            # rapport seul
    python manage.py triage_undated_candidates --apply    # rejette la 3e catégorie

Trois sorts, et un seul mène au rejet :

- un marché garde sa place quoi qu'il arrive : sans date précise il reste du
  contenu voulu par la rubrique Marchés ;
- une activité qui annonce son rythme (« tous les mercredis », « toute
  l'année ») n'est pas un événement daté, mais elle est réelle : elle attend
  une gestion de la récurrence, pas la corbeille ;
- le reste n'a ni date ni rythme — un service, une ouverture de commerce, un
  article de presse. Ce n'est pas un événement, et c'est ce que `--apply`
  rejette.

Un rejet reste un simple changement de statut, réversible depuis le
back-office.
"""

from __future__ import annotations

from collections import Counter

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.events.imports import DATES_ERROR
from apps.events.models import Event, EventImportCandidate
from apps.events.recurrence import announces_recurrence

NOT_AN_EVENT = "Pas un événement daté"
SAMPLE_SIZE = 25


class Command(BaseCommand):
    help = "Trie les candidats Agenda sans date. Simulation par défaut."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", dest="apply_changes")

    def handle(self, *args, **options):
        counters = Counter()
        samples: dict[str, list[str]] = {"marche": [], "recurrent": [], "rejete": []}

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
                if candidate.kind == Event.Kind.MARKET:
                    bucket = "marche"
                elif announces_recurrence(
                    candidate.title, candidate.short_description, candidate.description
                ):
                    bucket = "recurrent"
                else:
                    bucket = "rejete"

                counters[bucket] += 1
                if len(samples[bucket]) < SAMPLE_SIZE:
                    samples[bucket].append(f"#{candidate.pk}  {candidate.title[:62]}")

                if bucket != "rejete":
                    continue

                errors = list(candidate.validation_errors or [])
                if NOT_AN_EVENT not in errors:
                    errors.append(NOT_AN_EVENT)
                candidate.validation_errors = errors
                candidate.status = EventImportCandidate.Status.REJECTED
                candidate.save(update_fields=["validation_errors", "status", "last_seen_at"])

            if not options["apply_changes"]:
                transaction.set_rollback(True)

        total = sum(counters.values())
        self.stdout.write("")
        self.stdout.write(f"Candidats sans aucune date : {total}")
        self.stdout.write(f"  {counters['marche']}  marchés — gardés (rubrique Marchés)")
        self.stdout.write(f"  {counters['recurrent']}  activités récurrentes — gardées")
        self.stdout.write(f"  {counters['rejete']}  ni date ni rythme — rejetés par --apply")

        for bucket, title in (
            ("rejete", "Rejetés : vérifie qu'aucun événement réel ne traîne ici"),
            ("recurrent", "Gardés, rythme annoncé"),
            ("marche", "Gardés, marchés"),
        ):
            if samples[bucket]:
                self.stdout.write("")
                self.stdout.write(f"{title} :")
                for line in samples[bucket]:
                    self.stdout.write(f"  {line}")

        self.stdout.write("")
        if options["apply_changes"]:
            self.stdout.write(self.style.SUCCESS(f"{counters['rejete']} candidats rejetés."))
        else:
            self.stdout.write(
                self.style.WARNING("Simulation : rien n'a été modifié. Relancer avec --apply.")
            )

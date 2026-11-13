"""Trie les candidats Agenda restés sans aucune date. Simulation par défaut.

    python manage.py triage_undated_candidates            # rapport seul
    python manage.py triage_undated_candidates --apply    # rejette la 4e catégorie

Quatre sorts, et un seul mène au rejet :

- un marché garde sa place quoi qu'il arrive : sans date précise il reste du
  contenu voulu par la rubrique Marchés ;
- une activité qui annonce son rythme (« tous les mercredis », « toute
  l'année ») attend une gestion de la récurrence, pas la corbeille ;
- un candidat qui ne vient pas de l'IA est gardé lui aussi : pour lui le rejet
  serait définitif, et nous n'avons pas de quoi le prononcer ;
- le reste est rejeté par `--apply`.

Le rejet ne dit pas « ce n'est pas un événement » : la liste contient des
pièces de théâtre et la Fête de la musique. Il dit que nous n'avons pas su
lire leur date, et il range la boîte en attendant mieux.

C'est sans perte parce que l'upsert ressuscite un candidat IA rejeté dès que
son payload change (`imports.py`) : au prochain crawl sous le prompt v6, une
page qui livre enfin sa date repasse d'elle-même en « À vérifier ». D'où la
restriction aux candidats IA — eux seuls bénéficient de ce retour.
"""

from __future__ import annotations

from collections import Counter

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.events.imports import DATES_ERROR
from apps.events.models import Event, EventImportCandidate
from apps.events.recurrence import announces_recurrence

UNDATED = "Aucune date lisible dans la page extraite"
SAMPLE_SIZE = 25


class Command(BaseCommand):
    help = "Trie les candidats Agenda sans date. Simulation par défaut."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", dest="apply_changes")

    def handle(self, *args, **options):
        counters = Counter()
        samples: dict[str, list[str]] = {
            "marche": [],
            "recurrent": [],
            "manuel": [],
            "rejete": [],
        }

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
                elif candidate.extraction_method != EventImportCandidate.ExtractionMethod.AI:
                    bucket = "manuel"
                else:
                    bucket = "rejete"

                counters[bucket] += 1
                if len(samples[bucket]) < SAMPLE_SIZE:
                    samples[bucket].append(f"#{candidate.pk}  {candidate.title[:62]}")

                if bucket != "rejete":
                    continue

                errors = list(candidate.validation_errors or [])
                if UNDATED not in errors:
                    errors.append(UNDATED)
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
        self.stdout.write(f"  {counters['manuel']}  hors IA — gardés (leur rejet serait définitif)")
        self.stdout.write(f"  {counters['rejete']}  rejetés par --apply (ressuscités au re-crawl)")

        for bucket, title in (
            ("rejete", "Rejetés, en attente d'un re-crawl qui livre leur date"),
            ("manuel", "Gardés, hors IA"),
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

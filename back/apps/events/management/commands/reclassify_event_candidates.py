"""Attribue une catégorie aux candidats Agenda qui n'en ont pas. Simulation par défaut.

    python manage.py reclassify_event_candidates            # rapport seul
    python manage.py reclassify_event_candidates --apply    # applique

Catégorie devinée par mots-clés (apps.events.categorize), sans appel à l'IA.
Seuls les candidats « À valider » ou « Incomplets » sans catégorie sont
touchés ; ceux qui n'ont plus d'autre motif passent dans « À valider ».
Rien n'est publié : l'approbation reste un geste humain.
"""
from __future__ import annotations

from collections import Counter, defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.events.categorize import guess_category_slug
from apps.events.imports import classify_candidates
from apps.events.models import EventCategory, EventImportCandidate


class Command(BaseCommand):
    help = "Devine la catégorie des candidats Agenda qui n'en ont pas. Simulation par défaut."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", dest="apply_changes")

    def handle(self, *args, **options):
        categories = {category.slug: category for category in EventCategory.objects.filter(is_active=True)}
        waiting = EventImportCandidate.objects.filter(
            category__isnull=True,
            status__in=(EventImportCandidate.Status.PENDING, EventImportCandidate.Status.INVALID),
        ).only("pk", "title", "short_description", "description", "kind")

        by_category: dict[str, list[int]] = defaultdict(list)
        examples: dict[str, list[str]] = defaultdict(list)
        unknown = 0
        for candidate in waiting.iterator():
            slug = guess_category_slug(
                candidate.title,
                f"{candidate.short_description} {candidate.description}",
                candidate.kind,
            )
            if slug not in categories:
                unknown += 1
                continue
            by_category[slug].append(candidate.pk)
            if len(examples[slug]) < 3:
                examples[slug].append(candidate.title[:70])

        ready = 0
        with transaction.atomic():
            for slug, ids in by_category.items():
                for start in range(0, len(ids), 500):
                    result = classify_candidates(ids[start : start + 500], category=categories[slug])
                    ready += len(result["ready_ids"])
            if not options["apply_changes"]:
                transaction.set_rollback(True)

        counts = Counter({slug: len(ids) for slug, ids in by_category.items()})
        self.stdout.write("")
        for slug, count in counts.most_common():
            self.stdout.write(f"{categories[slug].name} : {count}   ex. {' | '.join(examples[slug])}")
        self.stdout.write("")
        self.stdout.write(f"Candidats classés : {sum(counts.values())}")
        self.stdout.write(f"Dont devenus complets (passent dans « À valider ») : {ready}")
        self.stdout.write(f"Sans catégorie reconnue (à traiter à la main) : {unknown}")
        if options["apply_changes"]:
            self.stdout.write(self.style.SUCCESS("Modifications appliquées."))
        else:
            self.stdout.write(
                self.style.WARNING("Simulation : rien n'a été modifié. Relancer avec --apply.")
            )

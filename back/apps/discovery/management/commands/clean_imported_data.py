"""Nettoie les contenus déjà importés. Simulation par défaut, rien n'est supprimé.

    python manage.py clean_imported_data            # rapport seul
    python manage.py clean_imported_data --apply    # applique

Quatre corrections, toutes réversibles depuis le back-office :

1. commerces  : suffixe de commune répété retiré du nom (l'adresse web ne change pas) ;
2. lieux      : pages traduites (/en/, /es/…) archivées ;
3. lieux      : doublons (même titre, même commune) archivés, un seul conservé ;
4. événements : pictogramme du site source pris pour une image, retiré.

Les mêmes règles s'appliquent désormais à l'import (apps.discovery.cleaning).
"""

from __future__ import annotations

from collections import defaultdict

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.directory.models import Business
from apps.discovery.cleaning import is_foreign_language_url, norm_text, strip_locality_suffix
from apps.discovery.models import Place
from apps.events.event_images import is_decorative_image_url
from apps.events.models import Event


class Command(BaseCommand):
    help = "Nettoie noms, doublons, pages traduites et fausses images. Simulation par défaut."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", dest="apply_changes")

    def handle(self, *args, **options):
        apply_changes = options["apply_changes"]
        with transaction.atomic():
            counts = {
                "Noms de commerces nettoyés": self._clean_business_names(),
                "Lieux en langue étrangère archivés": self._archive_foreign_places(),
                "Lieux en double archivés": self._archive_duplicate_places(),
                "Fausses images d'événements retirées": self._drop_decorative_event_images(),
            }
            if not apply_changes:
                transaction.set_rollback(True)

        self.stdout.write("")
        for label, count in counts.items():
            self.stdout.write(f"{label} : {count}")
        if apply_changes:
            self.stdout.write(self.style.SUCCESS("Modifications appliquées."))
        else:
            self.stdout.write(
                self.style.WARNING("Simulation : rien n'a été modifié. Relancer avec --apply.")
            )

    def _clean_business_names(self) -> int:
        count = 0
        for business in Business.objects.select_related("commune").order_by("name"):
            cleaned = strip_locality_suffix(
                business.name, business.city, business.commune.name if business.commune else ""
            )
            if cleaned != business.name:
                self.stdout.write(f"[nom] {business.name}  →  {cleaned}")
                business.name = cleaned
                business.save(update_fields=["name", "updated_at"])
                count += 1
        return count

    def _archive(self, place: Place, reason: str) -> None:
        self.stdout.write(f"[{reason}] {place.title} ({place.slug}) — {place.official_url}")
        place.status = Place.Status.ARCHIVED
        place.save(update_fields=["status", "updated_at"])

    def _archive_foreign_places(self) -> int:
        count = 0
        for place in Place.objects.filter(status=Place.Status.PUBLISHED).order_by("title"):
            if is_foreign_language_url(place.official_url):
                self._archive(place, "langue")
                count += 1
        return count

    def _archive_duplicate_places(self) -> int:
        groups: dict[tuple[str, int], list[Place]] = defaultdict(list)
        for place in Place.objects.filter(status=Place.Status.PUBLISHED):
            groups[(norm_text(place.title), place.commune_id)].append(place)
        count = 0
        for places in groups.values():
            if len(places) < 2:
                continue
            # On garde la fiche la plus complète : mise en avant, avec image,
            # description la plus longue, puis la plus ancienne.
            places.sort(
                key=lambda place: (
                    not place.is_featured,
                    not place.cover_image,
                    -len(place.description or ""),
                    place.pk,
                )
            )
            self.stdout.write(f"[doublon] conservé : {places[0].title} ({places[0].slug})")
            for place in places[1:]:
                self._archive(place, "doublon")
                count += 1
        return count

    def _drop_decorative_event_images(self) -> int:
        count = 0
        for event in Event.objects.exclude(source_image_url="").order_by("title"):
            if not is_decorative_image_url(event.source_image_url):
                continue
            self.stdout.write(f"[image] {event.title} — {event.source_image_url}")
            if event.source_cover_image:
                event.source_cover_image.delete(save=False)
            event.source_cover_image = None
            event.source_image_url = ""
            event.source_image_hash = ""
            event.save(
                update_fields=[
                    "source_cover_image",
                    "source_image_url",
                    "source_image_hash",
                    "updated_at",
                ]
            )
            count += 1
        return count

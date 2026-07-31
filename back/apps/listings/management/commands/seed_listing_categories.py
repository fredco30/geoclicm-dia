"""Seed des ListingCategory : offres d'emploi + locations annuelles.

Usage : python manage.py seed_listing_categories
Idempotent : update_or_create sur le slug.
"""
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.listings.models import ListingCategory

CATEGORIES = [
    {
        "name": "Offres d'emploi",
        "icon": "Briefcase",
        "description": "Offres d'emploi du territoire (collectÃ©es via les sites "
                       "officiels crawlÃ©s, validÃ©es avant publication).",
    },
    {
        "name": "Locations annuelles",
        "icon": "House",
        "description": "Offres et demandes de locations Ã  l'annÃ©e (La "
                       "Grande-Motte, Le Grau-du-Roi, Aigues-Mortes). Saisie "
                       "manuelle par l'Ã©quipe.",
    },
]


class Command(BaseCommand):
    help = "Seed des ListingCategory (emploi, locations annuelles)."

    def handle(self, *args, **options) -> None:
        created, updated = 0, 0
        for idx, data in enumerate(CATEGORIES):
            slug = slugify(data["name"])
            _, was_created = ListingCategory.objects.update_or_create(
                slug=slug,
                defaults={
                    "name": data["name"],
                    "icon": data["icon"],
                    "description": data["description"],
                    "sort_order": idx * 10,
                    "is_active": True,
                },
            )
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"+ {data['name']}"))
            else:
                updated += 1
                self.stdout.write(f"~ {data['name']} (dÃ©jÃ  existante, mise Ã  jour)")
        self.stdout.write(
            self.style.SUCCESS(f"\nTerminÃ© : {created} crÃ©Ã©es, {updated} mises Ã  jour.")
        )

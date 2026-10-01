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
        "slug": "offres-d-emploi",
        "icon": "Briefcase",
        "description": "Offres d'emploi du territoire (collectées via les sites "
                       "officiels crawlés, validées avant publication).",
    },
    {
        "name": "Locations annuelles",
        "slug": "locations-annuelles",
        "icon": "House",
        "description": "Offres et demandes de locations à l'année (La "
                       "Grande-Motte, Le Grau-du-Roi, Aigues-Mortes). Saisie "
                       "manuelle par l'équipe.",
    },
]


class Command(BaseCommand):
    help = "Seed des ListingCategory (emploi, locations annuelles)."

    def handle(self, *args, **options) -> None:
        created, updated = 0, 0
        for idx, data in enumerate(CATEGORIES):
            # Slug fige (utilise par le front et les hints IA), pas derive du nom.
            slug = data["slug"]
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
                self.stdout.write(f"~ {data['name']} (déjà existante, mise à jour)")
        self.stdout.write(
            self.style.SUCCESS(f"\nTerminé : {created} créées, {updated} mises à jour.")
        )

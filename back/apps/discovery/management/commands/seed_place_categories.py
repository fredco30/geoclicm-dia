from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.discovery.models import PlaceCategory

CATEGORIES = [
    ("Patrimoine", "Landmark", "#92400e"),
    ("Nature", "Trees", "#4d7c3f"),
    ("Plages", "Umbrella", "#0284c7"),
    ("Balades", "Route", "#1a4d6e"),
    ("Points de vue", "Binoculars", "#7c3aed"),
    ("Savoir-faire", "Hammer", "#a8533a"),
    ("Activités & Sports", "Bike", "#0f766e"),
    ("Gastronomie", "UtensilsCrossed", "#b45309"),
    ("Hébergements", "Hotel", "#6d28d9"),
]


class Command(BaseCommand):
    help = "Crée ou met à jour les catégories initiales du module Découvrir."

    def handle(self, *args, **options):
        for index, (name, icon, color) in enumerate(CATEGORIES, start=1):
            PlaceCategory.objects.update_or_create(slug=slugify(name), defaults={"name": name, "icon": icon, "color": color, "sort_order": index * 10, "is_active": True})
        self.stdout.write(self.style.SUCCESS("Catégories Découvrir mises à jour."))

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.events.models import EventCategory


CATEGORIES = [
    ("Marché", "ShoppingBasket", "#4d7c3f"),
    ("Festival", "PartyPopper", "#a8533a"),
    ("Culture", "Landmark", "#1a4d6e"),
    ("Concert", "Music", "#7c3aed"),
    ("Sport", "Trophy", "#0284c7"),
    ("Tradition camarguaise", "Waves", "#92400e"),
    ("Famille", "Users", "#db2777"),
    ("Gastronomie", "UtensilsCrossed", "#c2410c"),
    ("Exposition", "Image", "#475569"),
]


class Command(BaseCommand):
    help = "Crée ou met à jour les catégories initiales de l'Agenda."

    def handle(self, *args, **options):
        created = 0
        updated = 0
        for index, (name, icon, color) in enumerate(CATEGORIES, start=1):
            _, was_created = EventCategory.objects.update_or_create(
                slug=slugify(name),
                defaults={
                    "name": name,
                    "icon": icon,
                    "color": color,
                    "sort_order": index * 10,
                    "is_active": True,
                },
            )
            created += int(was_created)
            updated += int(not was_created)
        self.stdout.write(
            self.style.SUCCESS(f"Catégories Agenda : {created} créées, {updated} mises à jour."),
        )

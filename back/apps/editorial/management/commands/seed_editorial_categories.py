from django.core.management.base import BaseCommand

from apps.editorial.models import Category


CATEGORIES = [
    ("Mémoire vivante", "memoire-vivante", "BookOpen", "#8b4513"),
    ("Patrimoine", "patrimoine", "Landmark", "#b8860b"),
    ("Pêche et traditions", "peche-et-traditions", "Fish", "#1a4d6e"),
    ("Portraits", "portraits", "Users", "#a8533a"),
    ("Reportages", "reportages", "Newspaper", "#475569"),
    ("Archives photos", "archives-photos", "Camera", "#64748b"),
    ("Bons plans", "bons-plans", "Tag", "#4d7c3f"),
    ("Tribune libre", "tribune-libre", "MessageSquare", "#7c3aed"),
]


class Command(BaseCommand):
    help = "Crée ou met à jour les catégories éditoriales attendues par les tuiles et les seeds."

    def handle(self, *args, **options):
        for index, (name, slug, icon, color) in enumerate(CATEGORIES, start=1):
            Category.objects.update_or_create(
                slug=slug,
                defaults={"name": name, "icon": icon, "color": color, "sort_order": index * 10, "is_active": True},
            )
        self.stdout.write(self.style.SUCCESS("Catégories éditoriales mises à jour."))

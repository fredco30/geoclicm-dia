"""Seed initial des 10 tuiles racine validées au plan v2.

Usage : python manage.py seed_tiles

Idempotent : ré-exécutable sans dupliquer (si une tuile avec le même
label existe déjà, elle est mise à jour ; sinon créée). Les sous-tuiles
ne sont pas seedées par cette commande — elles seront créées au cas par
cas depuis l'admin selon les besoins éditoriaux.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.tiles.models import Tile


SEED_TILES = [
    {
        "label": "Actualités",
        "icon": "Newspaper",
        "color": Tile.ColorPreset.CAMARGUE,
        "kind": Tile.Kind.MODULE,
        "module_key": Tile.ModuleKey.NEWS,
        "sort_order": 10,
    },
    {
        "label": "Météo & mer",
        "icon": "CloudSun",
        "color": Tile.ColorPreset.MER,
        "kind": Tile.Kind.MODULE,
        "module_key": Tile.ModuleKey.WEATHER,
        "sort_order": 20,
    },
    {
        "label": "Commerçants",
        "icon": "Store",
        "color": Tile.ColorPreset.TERRE,
        "kind": Tile.Kind.MODULE,
        "module_key": Tile.ModuleKey.BUSINESSES,
        "sort_order": 30,
    },
    {
        "label": "Agenda local",
        "icon": "Calendar",
        "color": Tile.ColorPreset.AGRUME,
        "kind": Tile.Kind.INTERNAL_ROUTE,
        "internal_path": "/agenda",
        "sort_order": 40,
    },
    {
        "label": "Bons plans",
        "icon": "Tag",
        "color": Tile.ColorPreset.OLIVE,
        "kind": Tile.Kind.INTERNAL_ROUTE,
        "internal_path": "/categories/bons-plans",
        "sort_order": 50,
    },
    {
        "label": "Marchés & producteurs",
        "icon": "ShoppingBasket",
        "color": Tile.ColorPreset.OLIVE,
        "kind": Tile.Kind.INTERNAL_ROUTE,
        "internal_path": "/marches",
        "sort_order": 60,
    },
    {
        "label": "Découvrir",
        "icon": "Compass",
        "color": Tile.ColorPreset.SEL,
        "kind": Tile.Kind.INTERNAL_ROUTE,
        "internal_path": "/decouvrir",
        "sort_order": 70,
        "span_2x": True,
    },
    {
        "label": "Numéros utiles",
        "icon": "Phone",
        "color": Tile.ColorPreset.NEUTRE,
        "kind": Tile.Kind.INTERNAL_ROUTE,
        "internal_path": "/numeros-utiles",
        "sort_order": 80,
    },
    {
        "label": "Démarches",
        "icon": "FileText",
        "color": Tile.ColorPreset.NEUTRE,
        "kind": Tile.Kind.INTERNAL_ROUTE,
        "internal_path": "/demarches",
        "sort_order": 90,
    },
    {
        "label": "Tribune libre",
        "icon": "MessageSquare",
        "color": Tile.ColorPreset.CAMARGUE,
        "kind": Tile.Kind.INTERNAL_ROUTE,
        "internal_path": "/categories/tribune-libre",
        "sort_order": 100,
    },
]


class Command(BaseCommand):
    help = "Seed initial des 10 tuiles racine validées au plan v2."

    def handle(self, *args, **options):
        created = 0
        updated = 0
        for spec in SEED_TILES:
            label = spec["label"]
            tile, was_created = Tile.objects.update_or_create(
                label=label,
                parent=None,
                defaults={
                    **{k: v for k, v in spec.items() if k != "label"},
                    "is_active": True,
                    "show_on_home": True,
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"Tuiles seedées : {created} créées, {updated} mises à jour."
            )
        )

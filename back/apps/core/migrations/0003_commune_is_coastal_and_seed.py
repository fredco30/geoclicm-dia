"""Ajoute is_coastal à Commune + seed coordonnées (lat/lng) et flag côtier.

Coordonnées approximatives (centre commune, source IGN/Wikipédia).
Côtières : Le Grau-du-Roi, Aigues-Mortes (port et accès lagunaire), La Grande-Motte.
"""
from __future__ import annotations

from django.db import migrations, models

# (lng, lat, is_coastal) keyed by INSEE code
COMMUNES_GEO = {
    "30133": (4.1383, 43.5345, True),   # Le Grau-du-Roi
    "30003": (4.1900, 43.5667, True),   # Aigues-Mortes
    "34344": (4.0833, 43.5667, True),   # La Grande-Motte
    "30290": (4.2003, 43.6244, False),  # Saint-Laurent-d'Aigouze
    "34150": (4.1750, 43.6500, False),  # Marsillargues
    "34145": (4.1378, 43.6772, False),  # Lunel
    "30341": (4.2667, 43.7000, False),  # Vauvert
}


def seed_geo(apps, schema_editor):
    from django.contrib.gis.geos import Point

    Commune = apps.get_model("core", "Commune")
    for insee, (lng, lat, coastal) in COMMUNES_GEO.items():
        Commune.objects.filter(insee_code=insee).update(
            location=Point(lng, lat, srid=4326),
            is_coastal=coastal,
        )


def reverse_seed_geo(apps, schema_editor):
    Commune = apps.get_model("core", "Commune")
    Commune.objects.filter(insee_code__in=COMMUNES_GEO.keys()).update(is_coastal=False)


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0002_commune_media"),
    ]

    operations = [
        migrations.AddField(
            model_name="commune",
            name="is_coastal",
            field=models.BooleanField(
                default=False,
                help_text="Commune avec accès direct à la mer (active le bloc météo marine).",
            ),
        ),
        migrations.RunPython(seed_geo, reverse_seed_geo),
    ]

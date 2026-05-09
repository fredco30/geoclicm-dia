"""Ajout latitude/longitude sur KnowledgeChunk pour les deep-links Maps/Waze."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("assistant", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="knowledgechunk",
            name="latitude",
            field=models.DecimalField(
                blank=True,
                decimal_places=7,
                help_text="Latitude WGS84. Active les boutons Maps/Waze côté widget.",
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name="knowledgechunk",
            name="longitude",
            field=models.DecimalField(
                blank=True,
                decimal_places=7,
                help_text="Longitude WGS84. Active les boutons Maps/Waze côté widget.",
                max_digits=10,
                null=True,
            ),
        ),
    ]

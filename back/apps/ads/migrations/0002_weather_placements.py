"""Ajoute les placements weather_top et weather_sidebar à AdCampaign."""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("ads", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="adcampaign",
            name="placement",
            field=models.CharField(
                choices=[
                    ("home_hero", "Page d'accueil — Hero"),
                    ("home_sidebar", "Page d'accueil — Sidebar"),
                    ("article_inline", "Article — Inline"),
                    ("article_sidebar", "Article — Sidebar"),
                    ("directory_top", "Annuaire — Top"),
                    ("directory_inline", "Annuaire — Inline"),
                    ("agenda_top", "Agenda — Top"),
                    ("weather_top", "Météo — Top"),
                    ("weather_sidebar", "Météo — Sidebar"),
                    ("newsletter", "Newsletter"),
                ],
                db_index=True,
                max_length=30,
            ),
        ),
    ]

# Pose un defaut '{}' en base sur CrawledPage.signals.
#
# Sans ce defaut, la colonne NOT NULL refusait toute insertion qui ne
# fournissait pas explicitement la valeur (crawl de nouvelles pages),
# avec l'erreur "null value in column signals violates not-null constraint".

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("assistant", "0004_crawledpage_signals"),
    ]

    operations = [
        migrations.AlterField(
            model_name="crawledpage",
            name="signals",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Signaux structurels calcules (voir services/page_signals.py).",
            ),
        ),
        migrations.RunSQL(
            sql=(
                "ALTER TABLE assistant_crawledpage "
                "ALTER COLUMN signals SET DEFAULT '{}'::jsonb;"
            ),
            reverse_sql=(
                "ALTER TABLE assistant_crawledpage "
                "ALTER COLUMN signals DROP DEFAULT;"
            ),
        ),
    ]

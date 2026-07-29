# Generated manually for Lot 1 (docs/26) — champ signals sur CrawledPage.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("assistant", "0003_shared_crawl_pipeline"),
    ]

    operations = [
        migrations.AddField(
            model_name="crawledpage",
            name="signals",
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text="Signaux structurels calcules (voir services/page_signals.py).",
            ),
        ),
    ]

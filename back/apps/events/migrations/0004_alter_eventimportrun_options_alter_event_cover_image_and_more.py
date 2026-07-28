from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("events", "0003_shared_crawl_source"),
    ]

    operations = [
        migrations.AlterModelOptions(
            name="eventimportrun",
            options={
                "ordering": ["-started_at"],
                "verbose_name": "Exécution d'import Agenda",
                "verbose_name_plural": "Exécutions d'import Agenda",
            },
        ),
        migrations.AlterField(
            model_name="event",
            name="cover_image",
            field=models.ImageField(
                blank=True,
                help_text="Remplacement manuel prioritaire sur l'image officielle.",
                null=True,
                upload_to="events/%Y/%m/",
            ),
        ),
        migrations.AlterField(
            model_name="eventsource",
            name="sync_images",
            field=models.BooleanField(
                default=True,
                help_text="Télécharger et actualiser automatiquement l'image officielle.",
            ),
        ),
        migrations.AlterField(
            model_name="eventsource",
            name="website_url",
            field=models.URLField(
                blank=True,
                help_text="Site public de l'organisme, utilisé pour la provenance.",
            ),
        ),
    ]

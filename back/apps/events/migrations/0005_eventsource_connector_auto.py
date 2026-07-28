from django.db import migrations, models


def use_auto_for_web_sources(apps, schema_editor):
    EventSource = apps.get_model("events", "EventSource")
    EventSource.objects.filter(connector__in=("json_ld", "crawl4ai")).update(
        connector="auto"
    )


def restore_json_ld(apps, schema_editor):
    EventSource = apps.get_model("events", "EventSource")
    EventSource.objects.filter(connector="auto").update(connector="json_ld")


class Migration(migrations.Migration):
    dependencies = [
        (
            "events",
            "0004_alter_eventimportrun_options_alter_event_cover_image_and_more",
        ),
    ]

    operations = [
        migrations.AlterField(
            model_name="eventsource",
            name="connector",
            field=models.CharField(
                choices=[
                    ("auto", "Détection automatique"),
                    ("json_ld", "Pages web avec JSON-LD Event"),
                    ("crawl4ai", "Pages JavaScript via Crawl4AI"),
                    ("ics", "Flux calendrier ICS"),
                ],
                db_index=True,
                default="auto",
                max_length=20,
            ),
        ),
        migrations.AlterField(
            model_name="eventsource",
            name="url_patterns",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Une sous-chaine d URL d evenement par ligne.",
            ),
        ),
        migrations.RunPython(use_auto_for_web_sources, restore_json_ld),
    ]

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("assistant", "0003_shared_crawl_pipeline"), ("events", "0002_event_sources_and_imports")]
    operations = [
        migrations.AddField(model_name="eventsource", name="crawl_source", field=models.ForeignKey(blank=True, help_text="Corpus partage a reutiliser pour les connecteurs web.", null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="event_sources", to="assistant.crawlsource")),
        migrations.AddField(model_name="eventsource", name="url_patterns", field=models.TextField(blank=True, default="/agenda/\n/evenement/", help_text="Une sous-chaine d URL d evenement par ligne.")),
        migrations.AlterField(model_name="eventsource", name="max_pages", field=models.PositiveIntegerField(default=0, help_text="Limite Agenda autonome. 0 = utiliser toute la source partagee.")),
    ]

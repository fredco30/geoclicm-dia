"""
Réindexation manuelle de l'assistant — utile au premier déploiement
ou après changement structurel (modification du chunking, du modèle
d'embedding, etc.).

Usage :
    python manage.py reindex_assistant                  # tout
    python manage.py reindex_assistant --source articles
    python manage.py reindex_assistant --source businesses --source wikipedia
    python manage.py reindex_assistant --dry-run        # affiche ce qui serait fait

Sources disponibles :
    businesses, articles, wikipedia, osm, datatourisme,
    external_sources, business_websites
"""
from __future__ import annotations

from django.core.management.base import BaseCommand


SOURCE_CHOICES = (
    "businesses", "articles", "wikipedia", "osm",
    "datatourisme", "external_sources", "business_websites",
)


class Command(BaseCommand):
    help = "Réindexe l'assistant IA — sources internes et externes."

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            action="append",
            choices=SOURCE_CHOICES,
            help="Source à réindexer (répétable). Par défaut : toutes.",
        )

    def handle(self, *args, **options):
        sources = options.get("source") or list(SOURCE_CHOICES)

        # Imports tardifs pour éviter de charger Mistral si la commande
        # est juste demandée pour --help
        from apps.assistant.indexers.articles import index_all_articles
        from apps.assistant.indexers.businesses import index_all_businesses
        from apps.assistant.indexers.datatourisme import index_all_datatourisme
        from apps.assistant.indexers.osm import index_all_osm
        from apps.assistant.indexers.web_crawler import (
            crawl_all_active_sources,
            crawl_business_websites,
        )
        from apps.assistant.indexers.wikipedia import index_all_wikipedia

        registry = {
            "businesses": index_all_businesses,
            "articles": index_all_articles,
            "wikipedia": index_all_wikipedia,
            "osm": index_all_osm,
            "datatourisme": index_all_datatourisme,
            "external_sources": crawl_all_active_sources,
            "business_websites": crawl_business_websites,
        }

        self.stdout.write(self.style.NOTICE(
            f"Réindexation : {', '.join(sources)}"
        ))

        for src in sources:
            self.stdout.write(self.style.NOTICE(f"\n→ {src}"))
            try:
                result = registry[src]()
            except Exception as exc:  # noqa: BLE001
                self.stdout.write(self.style.ERROR(f"  ❌ Erreur : {exc}"))
                continue
            self.stdout.write(self.style.SUCCESS(
                f"  ✅ created={result.get('created', 0)} "
                f"updated={result.get('updated', 0)} "
                f"unchanged={result.get('unchanged', 0)} "
                f"deactivated={result.get('deactivated', 0)} "
                f"embedded={result.get('embedded', 0)}"
            ))

        self.stdout.write(self.style.SUCCESS("\nRéindexation terminée."))

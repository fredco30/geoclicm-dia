"""Recalcule les signaux structurels des pages crawlees (idempotent).

Usage :
    python manage.py refresh_page_signals                 # toutes les sources
    python manage.py refresh_page_signals --source 2      # une source
"""
from __future__ import annotations

from django.core.management.base import BaseCommand

from apps.assistant.models import CrawlSource
from apps.assistant.services.page_signals import distinct_stats, refresh_source_signals


class Command(BaseCommand):
    help = "Recalcule les signaux structurels des pages crawlees (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--source",
            type=int,
            default=None,
            help="ID d'une CrawlSource. Par defaut : toutes les sources actives.",
        )

    def handle(self, *args, **options):
        qs = CrawlSource.objects.filter(is_active=True)
        if options["source"] is not None:
            qs = qs.filter(pk=options["source"])
        for source in qs:
            total = refresh_source_signals(source)
            stats = distinct_stats(source)
            self.stdout.write(
                f"[{source.pk}] {source.label}: {total} pages signalees | "
                f"distinctes={stats['distinct_canonicals']} "
                f"jsonld={stats['with_jsonld']} ics={stats['with_ics']} "
                f"iso_date={stats['with_iso_date']}"
            )
        self.stdout.write(self.style.SUCCESS("Signaux recalcules."))

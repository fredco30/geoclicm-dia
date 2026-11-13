"""Juge un modèle d'extraction sur quelques pages réelles, sans rien écrire.

    python manage.py probe_event_extraction --source 1 --pages 5

Basculer de fournisseur engage 500 pages et invalide le cache de prompt. La
sonde en interroge cinq, affiche ce que le modèle a répondu, et n'écrit ni
candidat, ni cache, ni progression sur la source.

Ce qu'elle sert à vérifier tient en une ligne : le modèle obéit-il à la règle
qui lui interdit d'inventer une année ? Un modèle bon marché peut extraire
correctement et désobéir à l'abstention, ce qui ne se voit qu'en lisant ses
réponses. La colonne « occurrences » doit rester vide quand la page n'écrit
pas d'année, et la preuve doit alors porter le jour de la semaine.
"""

from __future__ import annotations

import json
from datetime import date

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q

from apps.assistant.models import CrawledPage
from apps.events.ai_extraction import (
    ExtractionUnavailable,
    _accepted_events,
    _call_ai,
    _page_batches,
    _provider_config,
)
from apps.events.french_dates import read_dates
from apps.events.models import EventSource

MIN_TEXT_CHARS = 200


class Command(BaseCommand):
    help = "Interroge le modèle configuré sur quelques pages, sans rien écrire."

    def add_arguments(self, parser):
        parser.add_argument("--source", type=int, help="Id de l'EventSource à utiliser.")
        parser.add_argument("--pages", type=int, default=5)
        parser.add_argument("--url", default="", help="Ne garder que les URL contenant ceci.")

    def handle(self, *args, **options):
        source = self._source(options.get("source"))
        provider, model = _provider_config()
        self.stdout.write(f"Fournisseur : {provider} | modèle : {model}")

        pages = self._pages(source, options["url"], options["pages"])
        if not pages:
            raise CommandError("Aucune page crawlée ne correspond.")

        # _page_batches segmente lui-même les pages : un segment par appel.
        batches = _page_batches(pages)
        self.stdout.write(f"Pages : {len(pages)} | appels prévus : {len(batches)}")

        total_events = 0
        dated = 0
        undated = 0
        resolvable = 0
        for batch in batches:
            head = batch[0]
            self.stdout.write("")
            self.stdout.write(f"--- {head['url']} ({head['content_part']})")
            prompt = (
                f"Date d'aujourd'hui (today) : {date.today().isoformat()}\n"
                "Document officiel collecté par GeoClic :\n" + json.dumps(batch, ensure_ascii=False)
            )
            try:
                result = _call_ai(source, prompt)
            except ExtractionUnavailable as exc:
                self.stdout.write(self.style.ERROR(f"  indisponible : {str(exc)[:300]}"))
                continue

            accepted, error = _accepted_events(result, batch)
            if error:
                self.stdout.write(self.style.ERROR(f"  réponse rejetée : {error[:300]}"))
                continue
            if not accepted:
                self.stdout.write("  aucun événement")
                continue

            for event in accepted:
                total_events += 1
                occurrences = event.get("occurrences") or []
                title = str(event.get("title") or "")[:60]
                if occurrences:
                    when = str(occurrences[0].get("starts_at") or "")[:16]
                    # Une date passée est un succès : le modèle a cessé de jeter
                    # l'information, et c'est notre code qui classe en « Expirés ».
                    past = when[:10] < date.today().isoformat()
                    dated += 1
                    self.stdout.write(f"  {when}{' (passée)' if past else ''}  {title}")
                    continue

                undated += 1
                evidence = event.get("evidence") or []
                found = read_dates(
                    title,
                    *(evidence if isinstance(evidence, list) else []),
                    reference=self._reference(head["url"], pages),
                )
                mark = "résoluble" if found else "sans recours"
                if found:
                    resolvable += 1
                self.stdout.write(f"  (sans date, {mark})  {title}")
                for line in (evidence if isinstance(evidence, list) else [])[:2]:
                    self.stdout.write(f"      preuve : {str(line)[:110]}")

        self.stdout.write("")
        self.stdout.write(f"Événements : {total_events}, dont datés : {dated}")
        self.stdout.write(
            f"  dont sans date : {undated}, dont résolubles par le jour : {resolvable}"
        )
        self.stdout.write(
            self.style.WARNING("Sonde : aucun candidat, aucun cache, aucune progression écrits.")
        )

    def _source(self, source_id: int | None) -> EventSource:
        queryset = EventSource.objects.exclude(created_by__isnull=True)
        source = queryset.filter(pk=source_id).first() if source_id else queryset.first()
        if source is None:
            raise CommandError("Aucune EventSource utilisable (il en faut une avec un créateur).")
        return source

    def _pages(self, source: EventSource, url_filter: str, limit: int) -> list[dict]:
        queryset = CrawledPage.objects.filter(is_active=True)
        if source.crawl_source_id:
            queryset = queryset.filter(source_id=source.crawl_source_id)
        if url_filter:
            queryset = queryset.filter(
                Q(final_url__icontains=url_filter) | Q(canonical_url__icontains=url_filter)
            )
        rows = []
        for page in queryset.order_by("-fetched_at")[: max(limit, 1) * 4]:
            if len(page.cleaned_text or "") < MIN_TEXT_CHARS:
                continue
            rows.append(
                {
                    "url": page.final_url or page.canonical_url,
                    "title": page.title,
                    "content": page.cleaned_text,
                    "links": list(page.links or [])[:100],
                    "image_url": "",
                    "_fetched_on": page.fetched_at.date(),
                }
            )
            if len(rows) >= limit:
                break
        return rows

    def _reference(self, url: str, pages: list[dict]) -> date:
        for page in pages:
            if page["url"] == url:
                return page["_fetched_on"]
        return date.today()

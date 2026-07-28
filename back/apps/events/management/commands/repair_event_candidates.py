"""Répare les candidats depuis le corpus stocké, sans requête distante."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.assistant.models import CrawledPage
from apps.events.event_dates import filter_finished_occurrences
from apps.events.event_images import generic_image_urls, select_event_image
from apps.events.models import EventImportCandidate, EventSource


class Command(BaseCommand):
    help = "Répare images et dates depuis raw_html_gzip. Dry-run par défaut."

    def add_arguments(self, parser):
        parser.add_argument("--source", type=int, required=True)
        parser.add_argument("--apply", action="store_true", dest="apply_changes")
        parser.add_argument("--report", type=Path)

    def handle(self, *args, **options):
        try:
            source = EventSource.objects.select_related("crawl_source").get(
                pk=options["source"]
            )
        except EventSource.DoesNotExist as exc:
            raise CommandError("Source Agenda introuvable") from exc
        if source.crawl_source_id is None:
            raise CommandError("Cette source n'est reliée à aucun corpus")

        cutoff = timezone.now()
        generic_urls = generic_image_urls(source.crawl_source)
        counters = Counter()
        rows = []
        queryset = source.candidates.order_by("id")
        with transaction.atomic():
            for candidate in queryset:
                before_image = candidate.image_url
                page = CrawledPage.objects.filter(
                    source=source.crawl_source,
                ).filter(
                    Q(final_url=candidate.source_url)
                    | Q(canonical_url=candidate.source_url)
                ).first()
                if page is None:
                    selection_url = ""
                    method = "error"
                    reason = "Page stockée introuvable"
                    ambiguous = False
                    counters["errors"] += 1
                else:
                    selection = select_event_image(
                        page,
                        title=candidate.title,
                        json_ld_image=(
                            candidate.raw_payload.get("image")
                            if candidate.extraction_method
                            == EventImportCandidate.ExtractionMethod.JSON_LD
                            else None
                        ),
                        generic_urls=generic_urls,
                    )
                    selection_url = selection.url
                    method = selection.method
                    reason = selection.reason
                    ambiguous = selection.ambiguous
                    if ambiguous:
                        counters["ambiguous"] += 1
                    elif not selection_url:
                        counters["without_image"] += 1
                    elif selection_url == before_image:
                        counters["unchanged"] += 1
                    else:
                        counters["corrected"] += 1

                dates = filter_finished_occurrences(
                    candidate.occurrences,
                    cutoff=cutoff,
                )
                next_status = candidate.status
                if dates.expired:
                    next_status = EventImportCandidate.Status.EXPIRED
                    counters["expired"] += 1
                elif candidate.status == EventImportCandidate.Status.EXPIRED:
                    next_status = (
                        EventImportCandidate.Status.INVALID
                        if candidate.validation_errors
                        else EventImportCandidate.Status.PENDING
                    )
                counters["removed_occurrences"] += dates.removed_count

                row = {
                    "candidate_id": candidate.pk,
                    "title": candidate.title,
                    "source_url": candidate.source_url,
                    "old_image_url": before_image,
                    "new_image_url": selection_url,
                    "image_method": method,
                    "image_reason": reason,
                    "ambiguous": ambiguous,
                    "old_status": candidate.status,
                    "new_status": next_status,
                    "removed_occurrences": dates.removed_count,
                }
                rows.append(row)
                if options["apply_changes"]:
                    candidate.image_url = selection_url
                    candidate.status = next_status
                    candidate.occurrences = dates.occurrences
                    if dates.occurrences and not dates.expired:
                        first = dates.occurrences[0]
                        candidate.starts_at = first.get("starts_at")
                        candidate.ends_at = first.get("ends_at")
                        candidate.is_all_day = bool(first.get("is_all_day"))
                    candidate.save(
                        update_fields=[
                            "image_url",
                            "status",
                            "occurrences",
                            "starts_at",
                            "ends_at",
                            "is_all_day",
                            "last_seen_at",
                        ]
                    )
            if not options["apply_changes"]:
                transaction.set_rollback(True)

        report = {
            "mode": "apply" if options["apply_changes"] else "dry-run",
            "source_id": source.pk,
            "cutoff": cutoff.isoformat(),
            "candidate_count": len(rows),
            "counters": dict(sorted(counters.items())),
            "candidates": rows,
        }
        rendered = json.dumps(report, ensure_ascii=False, indent=2)
        if options["report"]:
            options["report"].write_text(rendered + "\n", encoding="utf-8")
            self.stdout.write(f"Rapport : {options['report']}")
        self.stdout.write(
            json.dumps(report["counters"], ensure_ascii=False, sort_keys=True)
        )

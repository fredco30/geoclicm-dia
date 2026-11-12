"""Reclassement non destructif, avec bilan préalable et sauvegarde obligatoire."""

import json
from collections import Counter
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import connection, transaction
from django.utils import timezone

from apps.discovery.review import candidate_models, review_all


class Command(BaseCommand):
    help = "Contrôle doublons/validité. Lecture seule par défaut ; --apply exige --report."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", dest="apply_changes")
        parser.add_argument("--report", type=Path)

    def handle(self, *args, **options):
        apply = options["apply_changes"]
        path = options["report"]
        if apply and not path:
            raise CommandError("--apply exige --report pour conserver l'état précédent.")
        if path and path.exists():
            raise CommandError("Ce rapport existe déjà : choisir un nouveau chemin.")
        with transaction.atomic():
            if connection.vendor == "postgresql":
                with connection.cursor() as cursor:
                    cursor.execute("SET TRANSACTION READ ONLY")
            snapshots = [
                {"model": model._meta.label_lower, **row}
                for model in candidate_models()
                for row in model.objects.exclude(status__in=["imported", "rejected"]).values(
                    "id", "status", "raw_payload"
                )
            ]
            changes = review_all()
        report = {
            "created_at": timezone.now().isoformat(),
            "mode": "dry-run",
            "counts": dict(Counter(f"{r['model']}:{r['after']}" for r in changes)),
            "candidates": changes,
            "before_snapshots": snapshots,
        }
        if path:
            with path.open("x", encoding="utf-8") as output:
                output.write(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
            path.chmod(0o600)
        if apply:
            # Service rechecks each candidate under a lock, not a blind application of the preview.
            applied = review_all(apply=True)
            report["mode"] = "apply"
            report["applied_counts"] = dict(Counter(f"{r['model']}:{r['after']}" for r in applied))
            path.write_text(
                json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
        self.stdout.write(json.dumps(
            {k: v for k, v in report.items() if k not in {"candidates", "before_snapshots"}},
            ensure_ascii=False,
        ))

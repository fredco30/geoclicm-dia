"""Normalisation auditable des occurrences candidates."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from zoneinfo import ZoneInfo

from django.utils import timezone
from django.utils.dateparse import parse_datetime

PARIS = ZoneInfo("Europe/Paris")


@dataclass(frozen=True)
class OccurrenceFilterResult:
    occurrences: list[dict]
    expired: bool
    removed_count: int
    has_valid_occurrences: bool


def _aware_datetime(value: object) -> datetime | None:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        parsed = parse_datetime(value)
    else:
        return None
    if parsed is None:
        return None
    return timezone.make_aware(parsed, PARIS) if timezone.is_naive(parsed) else parsed


def filter_finished_occurrences(
    occurrences: object,
    *,
    cutoff: datetime | None = None,
) -> OccurrenceFilterResult:
    """Retire le passé d'une série, sans effacer une série entièrement expirée."""
    rows = [dict(row) for row in occurrences or [] if isinstance(row, dict)]
    cutoff = cutoff or timezone.now()
    valid: list[tuple[dict, datetime]] = []
    for row in rows:
        if ends_at := _aware_datetime(row.get("ends_at")):
            valid.append((row, ends_at))
    if not valid:
        return OccurrenceFilterResult(rows, False, 0, False)

    remaining = [row for row, ends_at in valid if ends_at >= cutoff]
    removed = len(valid) - len(remaining)
    if not remaining:
        return OccurrenceFilterResult(rows, True, 0, True)
    return OccurrenceFilterResult(remaining, False, removed, True)


def apply_occurrence_filter(data: dict, *, cutoff: datetime | None = None) -> dict:
    """Applique le tri et recalcule les dates d'affichage de la première occurrence."""
    result = filter_finished_occurrences(data.get("occurrences"), cutoff=cutoff)
    data["occurrences"] = result.occurrences
    data["_expired"] = result.expired
    data["_removed_occurrence_count"] = result.removed_count
    if result.occurrences and not result.expired:
        first = result.occurrences[0]
        data["starts_at"] = _aware_datetime(first.get("starts_at"))
        data["ends_at"] = _aware_datetime(first.get("ends_at"))
        data["is_all_day"] = bool(first.get("is_all_day"))
    return data

from datetime import datetime
from unittest import TestCase
from zoneinfo import ZoneInfo

from apps.events.event_dates import filter_finished_occurrences
from apps.events.imports import _aware_ics_end

PARIS = ZoneInfo("Europe/Paris")


class EventDateFilteringTests(TestCase):
    cutoff = datetime(2026, 7, 29, 12, 0, tzinfo=PARIS)

    def row(self, start: str, end: str, *, all_day: bool = False):
        return {"starts_at": start, "ends_at": end, "is_all_day": all_day}

    def test_future_event_is_kept(self):
        row = self.row("2026-07-30T10:00:00+02:00", "2026-07-30T12:00:00+02:00")
        result = filter_finished_occurrences([row], cutoff=self.cutoff)
        self.assertEqual(result.occurrences, [row])
        self.assertFalse(result.expired)

    def test_ongoing_event_is_kept(self):
        row = self.row("2026-07-29T10:00:00+02:00", "2026-07-29T14:00:00+02:00")
        result = filter_finished_occurrences([row], cutoff=self.cutoff)
        self.assertEqual(result.occurrences, [row])
        self.assertFalse(result.expired)

    def test_past_event_is_expired_and_kept_for_audit(self):
        row = self.row("2026-07-28T10:00:00+02:00", "2026-07-28T12:00:00+02:00")
        result = filter_finished_occurrences([row], cutoff=self.cutoff)
        self.assertTrue(result.expired)
        self.assertEqual(result.occurrences, [row])

    def test_mixed_series_removes_only_finished_occurrences(self):
        past = self.row("2026-07-28T10:00:00+02:00", "2026-07-28T12:00:00+02:00")
        future = self.row("2026-07-30T10:00:00+02:00", "2026-07-30T12:00:00+02:00")
        result = filter_finished_occurrences([past, future], cutoff=self.cutoff)
        self.assertEqual(result.occurrences, [future])
        self.assertEqual(result.removed_count, 1)
        self.assertFalse(result.expired)
        repeated = filter_finished_occurrences(
            result.occurrences, cutoff=self.cutoff
        )
        self.assertEqual(repeated.occurrences, [future])
        self.assertEqual(repeated.removed_count, 0)

    def test_all_day_current_day_remains_valid_until_local_day_end(self):
        row = self.row(
            "2026-07-29T00:00:00+02:00",
            "2026-07-29T23:59:59.999999+02:00",
            all_day=True,
        )
        result = filter_finished_occurrences([row], cutoff=self.cutoff)
        self.assertFalse(result.expired)

    def test_ics_all_day_end_remains_exclusive(self):
        end = _aware_ics_end(datetime(2026, 7, 30).date())
        self.assertEqual(end.hour, 0)
        self.assertEqual(end.day, 30)

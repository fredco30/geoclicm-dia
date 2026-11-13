"""Fin déduite quand la page n'annonce pas d'heure de fin."""

from django.test import SimpleTestCase

from apps.events.imports import build_occurrences


class BuildOccurrencesTests(SimpleTestCase):
    def ends(self, starts_at, ends_at=None, **extra):
        rows = build_occurrences([{"starts_at": starts_at, "ends_at": ends_at, **extra}])
        return rows[0]["ends_at"] if rows else None

    def test_missing_end_becomes_next_midnight(self):
        # « Concert le 5 décembre à 20h » : la page ne donne aucune fin.
        self.assertEqual(self.ends("2026-12-05T20:00:00"), "2026-12-06T00:00:00+01:00")

    def test_end_equal_to_start_is_derived(self):
        self.assertEqual(
            self.ends("2026-12-05T20:00:00", "2026-12-05T20:00:00"),
            "2026-12-06T00:00:00+01:00",
        )

    def test_end_before_start_is_derived(self):
        self.assertEqual(
            self.ends("2026-12-05T20:00:00", "2026-12-04T18:00:00"),
            "2026-12-06T00:00:00+01:00",
        )

    def test_real_end_is_kept(self):
        self.assertEqual(
            self.ends("2026-12-05T20:00:00", "2026-12-05T23:30:00"),
            "2026-12-05T23:30:00+01:00",
        )

    def test_date_only_spans_the_whole_day(self):
        rows = build_occurrences([{"starts_at": "2026-12-05", "is_all_day": True}])
        self.assertEqual(rows[0]["starts_at"], "2026-12-05T00:00:00+01:00")
        self.assertEqual(rows[0]["ends_at"], "2026-12-06T00:00:00+01:00")
        self.assertTrue(rows[0]["is_all_day"])

    def test_summer_time_keeps_the_local_day(self):
        self.assertEqual(self.ends("2026-07-14T22:00:00"), "2026-07-15T00:00:00+02:00")

    def test_occurrence_without_start_is_dropped(self):
        self.assertEqual(build_occurrences([{"ends_at": "2026-12-05T20:00:00"}]), [])

    def test_garbage_payloads_are_ignored(self):
        self.assertEqual(build_occurrences(None), [])
        self.assertEqual(build_occurrences("2026-12-05"), [])
        self.assertEqual(build_occurrences(["2026-12-05"]), [])

    def test_occurrences_are_sorted(self):
        rows = build_occurrences(
            [{"starts_at": "2026-12-05T20:00:00"}, {"starts_at": "2026-11-02T09:00:00"}]
        )
        self.assertEqual([row["starts_at"][:10] for row in rows], ["2026-11-02", "2026-12-05"])

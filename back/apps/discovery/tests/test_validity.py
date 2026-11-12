from datetime import datetime, timedelta
from types import SimpleNamespace
from zoneinfo import ZoneInfo

from django.test import SimpleTestCase

from apps.discovery.validity import event_validity, listing_validity

PARIS = ZoneInfo("Europe/Paris")


class ValidityTests(SimpleTestCase):
    now = datetime(2026, 11, 12, 16, tzinfo=PARIS)

    def listing(self, evidence=(), **kwargs):
        return SimpleNamespace(
            raw_payload={"verified_evidence": list(evidence)},
            expires_at=kwargs.get("expires_at"),
            published_on_source_at=kwargs.get("published"),
        )

    def test_papy_mamy_contract_end_is_proven_even_without_deadline(self):
        proof = (
            "Durée du contrat : dès que possible, à compter du 2 septembre 2021 au 7 juillet 2022"
        )
        result = listing_validity(self.listing([proof]), now=self.now)
        self.assertEqual(result.state, "expired")
        self.assertEqual(result.evidence, proof)
        self.assertIn("2022-07-07", result.until)

    def test_census_deadline_is_past(self):
        result = listing_validity(
            self.listing(["Candidature avant le 15 novembre 2022."]), now=self.now
        )
        self.assertEqual(result.state, "expired")

    def test_explicit_limit_and_iso_contract_end(self):
        for proof in [
            "Date limite de candidature : le 15 novembre 2022",
            "Fin du contrat : le 2022-07-07",
        ]:
            self.assertEqual(listing_validity(self.listing([proof]), now=self.now).state, "expired")

    def test_future_deadline_and_inclusive_end_of_day(self):
        row = self.listing(["Candidature jusqu'au 12 novembre 2026."])
        self.assertEqual(listing_validity(row, now=self.now).state, "current")
        self.assertEqual(listing_validity(row, now=self.now + timedelta(days=1)).state, "expired")

    def test_before_date_excludes_that_day(self):
        row = self.listing(["Candidature avant le 12 novembre 2026."])
        self.assertEqual(listing_validity(row, now=self.now).state, "expired")

    def test_published_old_does_not_prove_expiration(self):
        row = self.listing(["Publié le 1er mars 2022"], published=self.now - timedelta(days=400))
        self.assertEqual(listing_validity(row, now=self.now).state, "needs_review")

    def test_ai_expiry_without_dated_evidence_is_not_a_fact(self):
        row = self.listing(["Un poste à pourvoir"], expires_at=self.now - timedelta(days=1))
        self.assertEqual(listing_validity(row, now=self.now).state, "needs_review")

    def test_missing_dates_and_duration_only_need_confirmation(self):
        row = self.listing(["durée : 8 mois", "1er mars 2022"])
        self.assertEqual(listing_validity(row, now=self.now).state, "needs_review")

    def test_confirmation_expires_and_cannot_override_proven_expiry(self):
        row = self.listing()
        row.raw_payload["review"] = {"validity_confirmation": {"checked_at": self.now.isoformat()}}
        self.assertEqual(listing_validity(row, now=self.now).state, "current")
        self.assertEqual(
            listing_validity(row, now=self.now + timedelta(days=31)).state, "needs_review"
        )
        row.raw_payload["verified_evidence"] = ["Candidature avant le 15 novembre 2022"]
        self.assertEqual(listing_validity(row, now=self.now).state, "expired")

    def event(self, *ends):
        return SimpleNamespace(
            occurrences=[
                {"starts_at": (end - timedelta(hours=1)).isoformat(), "ends_at": end.isoformat()}
                for end in ends
            ],
            starts_at=None,
            ends_at=None,
        )

    def test_all_occurrences_past_but_mixed_series_still_current(self):
        self.assertEqual(
            event_validity(self.event(self.now - timedelta(days=1)), now=self.now).state, "expired"
        )
        row = self.event(self.now - timedelta(days=1), self.now + timedelta(days=1))
        self.assertEqual(event_validity(row, now=self.now).state, "current")

    def test_malformed_occurrence_prevents_false_expiry(self):
        row = self.event(self.now - timedelta(days=1))
        row.occurrences.append({"starts_at": "unknown", "ends_at": None})
        self.assertEqual(event_validity(row, now=self.now).state, "needs_review")

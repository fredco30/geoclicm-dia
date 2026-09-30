"""API publique Agenda : fiche d'un événement passé, filtre de dates."""
from datetime import datetime, timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.core.models import Commune, User
from apps.events.models import Event, EventCategory, EventOccurrence


class PublicEventApiTests(TestCase):
    def setUp(self):
        self.commune = Commune.objects.create(
            name="Aigues-Mortes", slug="aigues-mortes", insee_code="30003", department="30"
        )
        self.category = EventCategory.objects.create(name="Marchés", slug="marches")
        self.author = User.objects.create_user("redac", password="x", role=User.Role.EDITOR)
        self.client = APIClient()

    def make_event(self, slug, starts):
        event = Event.objects.create(
            title=slug, slug=slug, short_description="x", description="x",
            category=self.category, commune=self.commune, venue_name="Place",
            status=Event.Status.PUBLISHED, published_at=timezone.now(),
            created_by=self.author,
        )
        for start in starts:
            EventOccurrence.objects.create(
                event=event, starts_at=start, ends_at=start + timedelta(hours=4)
            )
        return event

    def test_past_event_detail_and_ics_stay_available(self):
        self.make_event("fete-passee", [timezone.now() - timedelta(days=30)])
        self.assertEqual(self.client.get("/api/events/fete-passee/").status_code, 200)
        self.assertEqual(self.client.get("/api/events/fete-passee/calendar.ics").status_code, 200)
        slugs = [e["slug"] for e in self.client.get("/api/events/").json()["results"]]
        self.assertNotIn("fete-passee", slugs)

    def test_date_range_requires_one_occurrence_inside(self):
        tz = timezone.get_current_timezone()
        base = timezone.make_aware(datetime.combine(
            timezone.localdate() + timedelta(days=14), datetime.min.time()
        ), tz).replace(hour=8)
        # Marché : J et J+7 ; plage demandée : J+2 à J+4 (aucune occurrence).
        self.make_event("marche", [base, base + timedelta(days=7)])
        day = (base + timedelta(days=2)).date()
        to = (base + timedelta(days=4)).date()
        res = self.client.get(f"/api/events/?from={day}&to={to}").json()
        self.assertEqual(res["count"], 0)
        # Plage J+6 à J+8 : l'occurrence de J+7 est retenue et affichée.
        day, to = (base + timedelta(days=6)).date(), (base + timedelta(days=8)).date()
        res = self.client.get(f"/api/events/?from={day}&to={to}").json()
        self.assertEqual(res["count"], 1)
        shown = datetime.fromisoformat(res["results"][0]["next_occurrence"]["starts_at"])
        self.assertEqual(shown, base + timedelta(days=7))

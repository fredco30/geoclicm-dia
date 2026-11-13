"""Les listes « À valider » sont toujours bornées (sans base)."""
from types import SimpleNamespace

from django.test import SimpleTestCase

from apps.directory.views import BusinessImportCandidateAdminViewSet
from apps.discovery.views import PlaceImportCandidateAdminViewSet
from apps.events.views import EventImportCandidateAdminViewSet
from apps.listings.views import ListingImportCandidateAdminViewSet

VIEWSETS = (
    EventImportCandidateAdminViewSet,
    PlaceImportCandidateAdminViewSet,
    BusinessImportCandidateAdminViewSet,
    ListingImportCandidateAdminViewSet,
)


class BoundedImportListTests(SimpleTestCase):
    def _bounds(self, viewset, params, action="list"):
        view = viewset()
        view.action = action
        view.request = SimpleNamespace(query_params=params)
        query = view.get_queryset().query
        return query.low_mark, query.high_mark

    def test_list_without_limit_is_bounded(self):
        for viewset in VIEWSETS:
            with self.subTest(viewset=viewset.__name__):
                self.assertEqual(self._bounds(viewset, {"status": "invalid"}), (0, 50))

    def test_limit_is_capped_and_offset_kept(self):
        for viewset in VIEWSETS:
            with self.subTest(viewset=viewset.__name__):
                self.assertEqual(
                    self._bounds(viewset, {"limit": "5000", "offset": "200"}), (200, 300)
                )

    def test_detail_actions_are_not_sliced(self):
        for viewset in VIEWSETS:
            with self.subTest(viewset=viewset.__name__):
                self.assertEqual(self._bounds(viewset, {}, action="approve"), (0, None))

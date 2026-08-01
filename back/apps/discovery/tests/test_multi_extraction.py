from datetime import date
from types import SimpleNamespace
from unittest.mock import patch

from django.test import SimpleTestCase

from apps.discovery import multi_extraction as me
from apps.discovery import multi_sync as ms
from apps.discovery.multi_extraction import (
    CATEGORY_HINT_SLUGS,
    _accepted_items,
    _merge_items,
    extract_multi,
    normalize_business,
    normalize_listing,
)
from apps.discovery.multi_sync import (
    _dedup_canonical,
    _download_cover_image,
    _select_primary_places,
)


class _FakePage:
    def __init__(self, title):
        self.title = title


class SelectPrimaryPlacesTests(SimpleTestCase):
    def test_single_place_kept(self):
        places = [{"title": "Phare de l'Espiguette"}]
        self.assertEqual(_select_primary_places(_FakePage("Phare"), places), places)

    def test_aggregation_keeps_page_subject(self):
        page = _FakePage("La carte interactive")
        places = [
            {"title": "Restaurant Le Sud"},
            {"title": "La carte interactive"},
            {"title": "Hôtel des Remparts"},
        ]
        selected = _select_primary_places(page, places)
        self.assertEqual(len(selected), 1)
        self.assertEqual(selected[0]["title"], "La carte interactive")

    def test_aggregation_without_match_returns_nothing(self):
        page = _FakePage("Nos partenaires")
        places = [{"title": "Restaurant A"}, {"title": "Hôtel B"}]
        self.assertEqual(_select_primary_places(page, places), [])


class DedupCanonicalTests(SimpleTestCase):
    def test_keeps_richest_page_per_canonical(self):
        pages = [
            SimpleNamespace(
                canonical_url="https://ot.test/agenda",
                final_url="https://ot.test/evenement/concert",
                cleaned_text="court",
            ),
            SimpleNamespace(
                canonical_url="https://ot.test/agenda",
                final_url="https://ot.test/evenement/expo",
                cleaned_text="un texte beaucoup plus riche et detaille",
            ),
        ]
        kept = _dedup_canonical(pages)
        self.assertEqual(len(kept), 1)
        self.assertEqual(kept[0].final_url, "https://ot.test/evenement/expo")

    def test_distinct_canonicals_all_kept_in_order(self):
        pages = [
            SimpleNamespace(
                canonical_url="https://ot.test/a",
                final_url="https://ot.test/a",
                cleaned_text="alpha",
            ),
            SimpleNamespace(
                canonical_url="https://ot.test/b",
                final_url="https://ot.test/b",
                cleaned_text="beta",
            ),
        ]
        kept = _dedup_canonical(pages)
        self.assertEqual(len(kept), 2)
        self.assertEqual(
            [page.canonical_url for page in kept],
            ["https://ot.test/a", "https://ot.test/b"],
        )

    def test_falls_back_to_final_url_when_canonical_empty(self):
        pages = [
            SimpleNamespace(
                canonical_url="",
                final_url="https://ot.test/fiche",
                cleaned_text="texte",
            )
        ]
        kept = _dedup_canonical(pages)
        self.assertEqual(len(kept), 1)


def _result(answer: str) -> dict:
    return {"answer": answer, "provider": "ovh", "model": "Qwen3.5-9B"}


class AcceptedItemsTests(SimpleTestCase):
    def test_businesses_key_routed(self):
        answer = (
            '{"events":[],"markets":[],"places":[],'
            '"businesses":[{"source_page_url":"https://ot.fr/borne","title":"Borne"}]}'
        )
        batch = [{"url": "https://ot.fr/borne"}]
        accepted, error = _accepted_items(_result(answer), batch)
        self.assertIsNone(error)
        self.assertEqual(len(accepted["businesses"]), 1)
        self.assertEqual(accepted["businesses"][0]["title"], "Borne")

    def test_missing_businesses_key_defaults_to_empty(self):
        # Cache d'une passe anterieure (sans la cle businesses) : pas d'erreur.
        answer = '{"events":[],"markets":[],"places":[]}'
        batch = [{"url": "https://ot.fr/page"}]
        accepted, error = _accepted_items(_result(answer), batch)
        self.assertIsNone(error)
        self.assertEqual(accepted["businesses"], [])

    def test_listings_key_routed(self):
        answer = (
            '{"events":[],"markets":[],"places":[],"businesses":[],'
            '"listings":[{"source_page_url":"https://ot.fr/job","title":"Cuisinier"}]}'
        )
        batch = [{"url": "https://ot.fr/job"}]
        accepted, error = _accepted_items(_result(answer), batch)
        self.assertIsNone(error)
        self.assertEqual(len(accepted["listings"]), 1)
        self.assertEqual(accepted["listings"][0]["title"], "Cuisinier")

    def test_splits_categories_by_key(self):
        answer = (
            '{"events":[{"source_page_url":"https://ot.fr/fete","title":"Fete"}],'
            '"markets":[{"source_page_url":"https://ot.fr/marche","title":"Marche"}],'
            '"places":[{"source_page_url":"https://ot.fr/plage","title":"Plage"}]}'
        )
        batch = [
            {"url": "https://ot.fr/fete"},
            {"url": "https://ot.fr/marche"},
            {"url": "https://ot.fr/plage"},
        ]
        accepted, error = _accepted_items(_result(answer), batch)
        self.assertIsNone(error)
        self.assertEqual(len(accepted["events"]), 1)
        self.assertEqual(len(accepted["markets"]), 1)
        self.assertEqual(len(accepted["places"]), 1)
        self.assertEqual(accepted["places"][0]["source_page_url"], "https://ot.fr/plage")

    def test_rejects_unknown_provenance(self):
        answer = '{"places":[{"source_page_url":"https://autre.fr/x","title":"X"}]}'
        batch = [{"url": "https://ot.fr/plage"}]
        accepted, error = _accepted_items(_result(answer), batch)
        self.assertEqual(accepted["places"], [])
        self.assertIsNotNone(error)

    def test_empty_when_no_content(self):
        answer = '{"events":[],"markets":[],"places":[]}'
        batch = [{"url": "https://ot.fr/page"}]
        accepted, error = _accepted_items(_result(answer), batch)
        self.assertIsNone(error)
        self.assertEqual(accepted["events"], [])

    def test_invalid_json_returns_error(self):
        accepted, error = _accepted_items(_result("pas du json"), [{"url": "https://ot.fr/x"}])
        self.assertIsNotNone(error)


class MergeItemsTests(SimpleTestCase):
    def test_merges_overlap_duplicates(self):
        items = [
            {"source_page_url": "https://ot.fr/p", "title": "Plage", "evidence": ["a"]},
            {"source_page_url": "https://ot.fr/p", "title": "Plage", "evidence": ["a", "b"], "duration": "1h"},
        ]
        merged = _merge_items(items)
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0]["duration"], "1h")
        self.assertEqual(sorted(merged[0]["evidence"]), ["a", "b"])


class CategoryHintTests(SimpleTestCase):
    def test_hints_cover_seeded_categories(self):
        for slug in ("patrimoine", "nature", "plages", "balades", "points-de-vue", "savoir-faire"):
            self.assertIn(slug, CATEGORY_HINT_SLUGS.values())


class _FakeCrawlPage:
    final_url = "https://ot.fr/borne-recharge"
    canonical_url = "https://ot.fr/borne-recharge"
    cleaned_text = (
        "Une borne de recharge pour vehicules electriques est installee "
        "place de la mairie. Parking gratuit a proximite."
    )


def _business_raw(**overrides):
    raw = {
        "title": "Borne de recharge place de la mairie",
        "short_description": "Borne pour vehicules electriques",
        "description": "Borne installee place de la mairie",
        "address": "Place de la mairie",
        "postal_code": "30240",
        "locality": "Le Grau-du-Roi",
        "category_hint": "Auto",
        "evidence": ["place de la mairie", "extrait invente absent"],
        "phone": "04 66 00 00 00",
    }
    raw.update(overrides)
    return raw


class NormalizeBusinessTests(SimpleTestCase):
    def setUp(self):
        self._original_map = me._BUSINESS_CATEGORY_BY_HINT
        me._BUSINESS_CATEGORY_BY_HINT = {
            "auto": SimpleNamespace(name="Auto", slug="auto"),
        }

    def tearDown(self):
        me._BUSINESS_CATEGORY_BY_HINT = self._original_map

    def _normalize(self, raw):
        source = SimpleNamespace(commune=None, commune_id=None)
        with (
            patch.object(me, "_locality_commune", return_value=None),
            patch.object(me, "_geocode", return_value=(None, None)),
            patch.object(
                me, "select_event_image", return_value=SimpleNamespace(url="")
            ),
        ):
            return normalize_business(source, raw, crawl_page=_FakeCrawlPage())

    def test_resolves_category_and_verifies_evidence(self):
        data = self._normalize(_business_raw())
        self.assertEqual(data["name"], "Borne de recharge place de la mairie")
        self.assertEqual(data["category"].slug, "auto")
        self.assertEqual(data["postal_code"], "30240")
        self.assertEqual(data["phone"], "04 66 00 00 00")
        # Seule la preuve presente dans la page est conservee.
        self.assertEqual(data["raw_payload"]["verified_evidence"], ["place de la mairie"])
        # Commune non resolue -> candidat marque incomplet, pas attribue au hasard.
        self.assertIn("Commune non reconnue", data["validation_errors"])
        self.assertNotIn("Catégorie non déterminée", data["validation_errors"])

    def test_unknown_hint_leaves_category_empty(self):
        data = self._normalize(_business_raw(category_hint="Truc inconnu"))
        self.assertIsNone(data["category"])
        self.assertIn("Catégorie non déterminée", data["validation_errors"])

    def test_fingerprint_ignores_casing_and_accents(self):
        first = self._normalize(_business_raw())
        second = self._normalize(
            _business_raw(title="BORNE DE RECHARGE PLACE DE LA MAIRIE")
        )
        self.assertEqual(first["fingerprint"], second["fingerprint"])


class _FakeResponse:
    def __init__(self, content: bytes, content_type: str):
        self.content = content
        self.headers = {"Content-Type": content_type}

    def raise_for_status(self):
        return None

    def close(self):
        return None


class _FakeCoverField:
    """Simule un ImageFieldFile : absent tant qu'aucun fichier n'est pose."""

    def __init__(self):
        self.saved_name = None
        self.saved_content = None

    def __bool__(self):
        return self.saved_name is not None

    def save(self, name, content, save=False):
        self.saved_name = name
        self.saved_content = bytes(content.read())


class _FakeCovered:
    def __init__(self):
        self.cover_image = _FakeCoverField()
        self.saved_fields = None

    def save(self, update_fields=None):
        self.saved_fields = update_fields


class _FakeListingPage:
    final_url = "https://terredecamargue.fr/offre-emploi/cuisinier-hf/"
    canonical_url = "https://terredecamargue.fr/offre-emploi/cuisinier-hf/"
    cleaned_text = (
        "La commune recrute un cuisinier H/F pour la restauration scolaire. "
        "Poste en CDI a pourvoir des que possible."
    )
    links = [
        "https://terredecamargue.fr/offre-emploi/cuisinier-hf/",
        "https://terredecamargue.fr/contact/",
    ]


def _listing_raw(**overrides):
    raw = {
        "title": "Cuisinier H/F",
        "short_description": "Cuisinier pour la restauration scolaire",
        "description": "Poste en CDI a pourvoir des que possible",
        "locality": "Terre de Camargue",
        "employer_or_agency": "Commune",
        "contract_type": "CDI",
        "price": "",
        "category_hint": "emploi",
        "application_url": "https://terredecamargue.fr/contact/",
        "expires_at": "2026-09-30",
        "evidence": ["CDI a pourvoir", "extrait invente absent"],
    }
    raw.update(overrides)
    return raw


class NormalizeListingTests(SimpleTestCase):
    def _normalize(self, raw, category):
        source = SimpleNamespace(commune=None, commune_id=None)
        with (
            patch.object(me, "_locality_commune", return_value=None),
            patch.object(me, "_listing_category", return_value=category),
        ):
            return normalize_listing(source, raw, crawl_page=_FakeListingPage())

    def test_maps_fields_and_verifies_evidence(self):
        category = SimpleNamespace(name="Offres d'emploi", slug="offres-d-emploi")
        data = self._normalize(_listing_raw(), category)
        self.assertEqual(data["title"], "Cuisinier H/F")
        self.assertEqual(data["category"].slug, "offres-d-emploi")
        self.assertEqual(data["contract_type"], "CDI")
        self.assertEqual(data["raw_payload"]["verified_evidence"], ["CDI a pourvoir"])
        # application_url presente dans les liens de la page : conservee.
        self.assertEqual(
            data["application_url"], "https://terredecamargue.fr/contact/"
        )
        self.assertNotIn("Catégorie non déterminée", data["validation_errors"])

    def test_application_url_outside_page_links_is_dropped(self):
        category = SimpleNamespace(name="Offres d'emploi", slug="offres-d-emploi")
        data = self._normalize(
            _listing_raw(application_url="https://malin.example.com/postulez"),
            category,
        )
        self.assertEqual(data["application_url"], "")

    def test_unknown_hint_flags_invalid(self):
        data = self._normalize(_listing_raw(category_hint="autre"), None)
        self.assertIsNone(data["category"])
        self.assertIn("Catégorie non déterminée", data["validation_errors"])


class DownloadCoverImageTests(SimpleTestCase):
    def _get(self, payload: bytes, content_type: str):
        def fake_get(url, **kwargs):
            return _FakeResponse(payload, content_type)

        return fake_get

    def test_downloads_and_names_jpeg(self):
        instance = _FakeCovered()
        with patch.object(
            ms.requests, "get", self._get(b"\xff\xd8fake-jpeg", "image/jpeg")
        ):
            ok = _download_cover_image(
                instance, "https://ot.fr/img.jpg", title="Mon Commerce", label="commerce"
            )
        self.assertTrue(ok)
        self.assertTrue(instance.cover_image.saved_name.startswith("mon-commerce-"))
        self.assertTrue(instance.cover_image.saved_name.endswith(".jpg"))
        self.assertEqual(instance.cover_image.saved_content, b"\xff\xd8fake-jpeg")
        self.assertEqual(instance.saved_fields, ["cover_image", "updated_at"])

    def test_refuses_unsupported_format(self):
        instance = _FakeCovered()
        with patch.object(
            ms.requests, "get", self._get(b"<svg></svg>", "image/svg+xml")
        ):
            ok = _download_cover_image(
                instance, "https://ot.fr/logo.svg", title="X", label="commerce"
            )
        self.assertFalse(ok)
        self.assertIsNone(instance.cover_image.saved_name)

    def test_refuses_oversized_image(self):
        instance = _FakeCovered()
        big = b"x" * (ms.MAX_IMAGE_BYTES + 1)
        with patch.object(ms.requests, "get", self._get(big, "image/png")):
            ok = _download_cover_image(
                instance, "https://ot.fr/big.png", title="X", label="commerce"
            )
        self.assertFalse(ok)
        self.assertIsNone(instance.cover_image.saved_name)

    def test_skips_when_cover_already_set(self):
        instance = _FakeCovered()
        instance.cover_image.saved_name = "deja-la.jpg"
        with patch.object(
            ms.requests, "get", self._get(b"img", "image/jpeg")
        ):
            ok = _download_cover_image(
                instance, "https://ot.fr/img.jpg", title="X", label="commerce"
            )
        self.assertFalse(ok)


class ExtractMultiPromptTests(SimpleTestCase):
    def _call_capture(self, captured):
        def fake_call_ai(source, prompt, *, system_prompt=None):
            captured["prompt"] = prompt
            return {
                "answer": "{\"events\":[],\"markets\":[],\"places\":[],\"businesses\":[],\"listings\":[]}",
                "provider": "ovh",
                "model": "Qwen3.5-9B",
            }

        return fake_call_ai

    def test_prompt_includes_today_and_page_dates(self):
        captured = {}
        pages = [
            {
                "url": "https://ot.fr/terredesport",
                "title": "Terre de Sport",
                "content": "Terre de Sport reunit une dizaine de disciplines en plein air. " * 8,
                "page_dates": {"published_at": "2022-06-15", "modified_at": "2022-06-15"},
            }
        ]
        user = SimpleNamespace(pk=1, id=1)
        with (
            patch.object(me, "_provider_config", return_value=("ovh", "Qwen3.5-9B")),
            patch.object(me, "_call_ai", side_effect=self._call_capture(captured)),
        ):
            extract_multi(user, pages)
        self.assertIn("today", captured["prompt"])
        self.assertIn(date.today().isoformat(), captured["prompt"])
        self.assertIn("2022-06-15", captured["prompt"])

    def test_page_dates_not_required(self):
        captured = {}
        pages = [{"url": "https://ot.fr/x", "title": "X", "content": "contenu " * 40}]
        user = SimpleNamespace(pk=1, id=1)
        with (
            patch.object(me, "_provider_config", return_value=("ovh", "Qwen3.5-9B")),
            patch.object(me, "_call_ai", side_effect=self._call_capture(captured)),
        ):
            results, errors = extract_multi(user, pages)
        self.assertEqual(errors, [])
        self.assertIn("today", captured["prompt"])

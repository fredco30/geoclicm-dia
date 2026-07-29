"""Signaux structurels d'une page crawlee, agnostiques du contenu.

Voir docs/26-architecture-collecte-multisite.md : ces signaux mesurent chaque
page sans terme metier, pour alimenter la vue dedupliquee et le pre-filtre IA.
Ils ne retirent jamais une page de la connaissance de l'assistant.
"""

from __future__ import annotations

import re
from collections import Counter

from apps.assistant.models import CrawledPage

ISO_DATE = re.compile(r"\b\d{4}-\d{2}-\d{2}([T ][0-2]\d:[0-5]\d)?")
ICS_LINK = re.compile(r"(\.ics($|\?)|format=ics|export=ics|ical=|/ical/|/ics/)", re.I)
MIN_TEXT_LENGTH = 200

# Bloc de champs factuels (structure d'une fiche, agnostique du metier).
# Detecte une zone "label : valeur" recurrente, presente sur toute fiche
# structuree (evenement, lieu, commerce) quel que soit le CMS.
STRUCTURED_FACTS = re.compile(
    r"(date et heure|horaires?|ouverture|tarifs?|lieu|adresse|contact|"
    r"organisateur|acc[e\u00e8]s|t[e\u00e9]l[e\u00e9]phone|site web)\s*[:|]",
    re.IGNORECASE,
)
DATE_READABLE = re.compile(
    r"(\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{2,4}|"
    r"\d{1,2}\s+[A-Za-z\u00c0-\u00ff]+\s+\d{4})",
    re.IGNORECASE,
)


def jsonld_types(json_ld: object) -> list[str]:
    """Collecte les @type schema.org d'un payload JSON-LD (graphe inclus)."""
    types: set[str] = set()
    stack = list(json_ld) if isinstance(json_ld, list) else [json_ld]
    while stack:
        node = stack.pop()
        if isinstance(node, list):
            stack.extend(node)
        elif isinstance(node, dict):
            if "@graph" in node:
                stack.append(node["@graph"])
            raw = node.get("@type")
            for item in (raw if isinstance(raw, list) else [raw]):
                if item:
                    types.add(str(item))
    return sorted(types)


def compute_signals(
    page: CrawledPage | None = None,
    canonical_counts: Counter | None = None,
    *,
    cleaned_text: str = "",
    json_ld: object = None,
    links: object = None,
    depth: int = 0,
    canonical_url: str = "",
) -> dict:
    """Signaux d'une page, calcules sans LLM ni terme metier.

    Accepte soit une instance CrawledPage, soit les champs bruts (utilise par
    _save_page avant persistance).
    """
    if page is not None:
        cleaned_text = page.cleaned_text or ""
        json_ld = page.json_ld
        links = page.links
        depth = page.depth
        canonical_url = page.canonical_url
    counts = canonical_counts or Counter()
    text = cleaned_text or ""
    return {
        "jsonld_types": jsonld_types(json_ld),
        "has_ics_link": any(ICS_LINK.search(link or "") for link in (links or [])),
        "has_iso_date": bool(ISO_DATE.search(text)),
        "has_readable_date": bool(DATE_READABLE.search(text)),
        "has_structured_facts": bool(STRUCTURED_FACTS.search(text)),
        "text_length": len(text),
        "low_density": len(text) < MIN_TEXT_LENGTH,
        "canonical_shared": counts.get(canonical_url, 0) > 1,
        "depth": depth,
    }


def refresh_source_signals(source) -> int:
    """Recalcule les signaux des pages actives d'une source. Retourne le total."""
    pages = list(source.pages.filter(is_active=True))
    counts = Counter(p.canonical_url for p in pages)
    for page in pages:
        page.signals = compute_signals(page, counts)
    if pages:
        CrawledPage.objects.bulk_update(pages, ["signals"])
    return len(pages)


def distinct_stats(source) -> dict:
    """Compteurs dedupliques par canonique pour la vue admin."""
    pages = list(source.pages.filter(is_active=True))
    by_canonical: dict[str, dict] = {}
    for page in pages:
        sig = page.signals or {}
        entry = by_canonical.setdefault(
            page.canonical_url,
            {"has_jsonld": False, "has_ics": False, "has_iso_date": False},
        )
        entry["has_jsonld"] = entry["has_jsonld"] or bool(sig.get("jsonld_types"))
        entry["has_ics"] = entry["has_ics"] or bool(sig.get("has_ics_link"))
        entry["has_iso_date"] = entry["has_iso_date"] or bool(sig.get("has_iso_date"))
    return {
        "pages": len(pages),
        "distinct_canonicals": len(by_canonical),
        "with_jsonld": sum(1 for e in by_canonical.values() if e["has_jsonld"]),
        "with_ics": sum(1 for e in by_canonical.values() if e["has_ics"]),
        "with_iso_date": sum(1 for e in by_canonical.values() if e["has_iso_date"]),
    }

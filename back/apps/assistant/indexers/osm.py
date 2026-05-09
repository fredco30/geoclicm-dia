"""
Indexer OpenStreetMap (Overpass API) — POI principaux par commune.

Source : https://overpass-api.de/api/interpreter
Licence : ODbL libre.

On récupère les POI utiles pour les réponses touristiques :
restaurants, hôtels, plages, parkings, pharmacies, mairies, ports,
musées, banques, postes. Pour chaque POI on construit un chunk court
contenant le nom + type + adresse + coordonnées.

Chaque commune est query séparément via son insee_code (zone admin
limitée à la commune via `area["ref:INSEE"="<code>"]`).

Limite Overpass : ~10000 requêtes/jour gratuit. On en fait 7/semaine
(une par commune), donc on est très large.
"""
from __future__ import annotations

import logging
from typing import Any

import requests

from apps.core.models import Commune

from ..models import KnowledgeChunk
from .base import ChunkInput, save_chunks

logger = logging.getLogger(__name__)


OVERPASS_URL = "https://overpass-api.de/api/interpreter"
HTTP_TIMEOUT = 60  # Overpass peut être lent, on est patient


# Tags OSM ciblés. Chaque entrée = un type qu'on va chercher en
# (node|way|relation) au sein de la commune.
TARGET_TAGS = [
    ("amenity", "restaurant", "Restaurant"),
    ("amenity", "cafe", "Café"),
    ("amenity", "bar", "Bar"),
    ("amenity", "fast_food", "Restauration rapide"),
    ("tourism", "hotel", "Hôtel"),
    ("tourism", "guest_house", "Chambre d'hôtes / maison d'hôtes"),
    ("tourism", "campsite", "Camping"),
    ("tourism", "museum", "Musée"),
    ("tourism", "attraction", "Attraction touristique"),
    ("tourism", "viewpoint", "Point de vue"),
    ("amenity", "pharmacy", "Pharmacie"),
    ("amenity", "post_office", "Poste"),
    ("amenity", "bank", "Banque"),
    ("amenity", "atm", "Distributeur"),
    ("amenity", "townhall", "Mairie"),
    ("amenity", "parking", "Parking"),
    ("leisure", "beach_resort", "Plage aménagée"),
    ("natural", "beach", "Plage"),
    ("waterway", "dock", "Dock / port"),
    ("amenity", "marketplace", "Marché"),
]


def _build_overpass_query(insee_code: str) -> str:
    """Construit une query Overpass QL pour récupérer les POI ciblés
    dans le périmètre de la commune (par INSEE)."""
    selectors = []
    for k, v, _ in TARGET_TAGS:
        selectors.append(f'  node["{k}"="{v}"](area.commune);')
        selectors.append(f'  way["{k}"="{v}"](area.commune);')
    selector_block = "\n".join(selectors)
    return f"""
[out:json][timeout:50];
area["ref:INSEE"="{insee_code}"]->.commune;
(
{selector_block}
);
out center tags;
""".strip()


def fetch_osm_pois(insee_code: str) -> list[dict[str, Any]]:
    """Renvoie la liste des POI Overpass pour cette commune."""
    query = _build_overpass_query(insee_code)
    try:
        response = requests.post(
            OVERPASS_URL,
            data={"data": query},
            headers={
                "User-Agent": "geoclicmedia-assistant/1.0 (contact@geoclic.fr)",
            },
            timeout=HTTP_TIMEOUT,
        )
    except requests.RequestException as exc:
        logger.warning("Overpass fetch failed for INSEE %s: %s", insee_code, exc)
        return []

    if response.status_code != 200:
        logger.info("Overpass HTTP %s for INSEE %s", response.status_code, insee_code)
        return []

    data = response.json()
    return data.get("elements", []) or []


def _human_label(tags: dict) -> str:
    """Trouve un libellé humain à partir des tags du POI."""
    for k, v, label in TARGET_TAGS:
        if tags.get(k) == v:
            return label
    return "Lieu"


def _build_poi_text(element: dict, commune: Commune) -> tuple[str, str, str]:
    """Construit (title, content, source_url) depuis un élément Overpass."""
    tags = element.get("tags") or {}
    name = tags.get("name") or "Sans nom"
    label = _human_label(tags)

    parts: list[str] = []
    parts.append(f"{label} : {name}")
    parts.append(f"Commune : {commune.name}")

    addr_bits = []
    for key in ("addr:housenumber", "addr:street", "addr:postcode", "addr:city"):
        if tags.get(key):
            addr_bits.append(tags[key])
    if addr_bits:
        parts.append(f"Adresse : {' '.join(addr_bits)}")

    if tags.get("phone"):
        parts.append(f"Téléphone : {tags['phone']}")
    if tags.get("website"):
        parts.append(f"Site web : {tags['website']}")
    if tags.get("opening_hours"):
        parts.append(f"Horaires : {tags['opening_hours']}")
    if tags.get("cuisine"):
        parts.append(f"Cuisine : {tags['cuisine']}")
    if tags.get("description"):
        parts.append(f"Description : {tags['description']}")
    if tags.get("description:fr"):
        parts.append(f"Description (FR) : {tags['description:fr']}")

    # Coordonnées GPS pour Google Maps / Waze
    lat = element.get("lat") or (element.get("center") or {}).get("lat")
    lon = element.get("lon") or (element.get("center") or {}).get("lon")
    if lat and lon:
        parts.append(f"Coordonnées GPS : {lat}, {lon}")

    title = f"{label} — {name} ({commune.name})"
    content = "\n".join(parts)

    # URL OSM pour citer la source
    osm_id = element.get("id")
    osm_type = element.get("type", "node")
    source_url = f"https://www.openstreetmap.org/{osm_type}/{osm_id}" if osm_id else ""

    return title, content, source_url


def index_osm_for_commune(commune: Commune) -> dict[str, int]:
    """Indexe les POI OSM principaux d'une commune."""
    if not commune.insee_code:
        logger.warning("Commune %s sans insee_code, skip OSM", commune.slug)
        return {"created": 0, "updated": 0, "unchanged": 0, "deactivated": 0, "embedded": 0}

    elements = fetch_osm_pois(commune.insee_code)
    if not elements:
        return {"created": 0, "updated": 0, "unchanged": 0, "deactivated": 0, "embedded": 0}

    chunk_inputs: list[ChunkInput] = []
    for el in elements:
        tags = el.get("tags") or {}
        if not tags.get("name"):
            # Sans nom on n'a rien d'utile à indexer
            continue
        title, content, source_url = _build_poi_text(el, commune)
        osm_type = el.get("type", "node")
        osm_id = el.get("id")
        chunk_inputs.append(ChunkInput(
            source_kind=KnowledgeChunk.SourceKind.OSM,
            source_id=f"{commune.slug}:{osm_type}:{osm_id}",
            source_url=source_url,
            title=title,
            content=content,
            commune=commune,
            is_premium=False,
        ))

    return save_chunks(
        chunk_inputs,
        source_kind=KnowledgeChunk.SourceKind.OSM,
        deactivate_others_for_source_prefix=f"{commune.slug}:",
    )


def index_all_osm() -> dict[str, int]:
    """Indexe les POI OSM pour toutes les communes actives."""
    totals = {"created": 0, "updated": 0, "unchanged": 0, "deactivated": 0, "embedded": 0}
    for commune in Commune.objects.filter(is_active=True):
        result = index_osm_for_commune(commune)
        for k in totals:
            totals[k] += result.get(k, 0)
    return totals

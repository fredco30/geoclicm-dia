"""Fra?cheur ?ditoriale d'une page crawl?e (dates de publication / modification).

Objectif : donner ? l'IA un signal factuel pour d?sambigu?ser les contenus sans
ann?e explicite et rep?rer les fiches anciennes. R?gles :

- on ne devine rien : seules les dates explicitement expos?es par la page sont
  retenues (meta HTML puis JSON-LD) ;
- la priorit? est meta HTML (WordPress/Yoast, schema microdata) puis JSON-LD
  (datePublished / dateModified) ;
- aucune date -> cha?ne vide, l'IA devra alors s'abstenir plut?t qu'inventer.
"""

from __future__ import annotations

from datetime import date, datetime


def _iso(value: object) -> str:
    """Normalise une date/datetime brute en ISO 8601 (YYYY-MM-DD au mieux)."""
    if value in (None, ""):
        return ""
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    text = str(value).strip()
    if not text:
        return ""
    candidate = text[:10]
    try:
        return date.fromisoformat(candidate).isoformat()
    except ValueError:
        return ""


def _json_ld_dates(payloads: list) -> tuple[str, str]:
    """Extrait (datePublished, dateModified) depuis les blocs JSON-LD d'une page.

    Parcourt les objets et leurs @graph ; retient la premi?re valeur trouv?e.
    """
    published = modified = ""

    def visit(node) -> None:
        nonlocal published, modified
        if published and modified:
            return
        if isinstance(node, list):
            for item in node:
                visit(item)
            return
        if not isinstance(node, dict):
            return
        if not published:
            published = _iso(node.get("datePublished"))
        if not modified:
            modified = _iso(node.get("dateModified"))
        for key in ("@graph", "mainEntity", "mainEntityOfPage"):
            if key in node:
                visit(node[key])

    for payload in payloads or []:
        visit(payload)
        if published and modified:
            break
    return published, modified


def resolve_page_dates(metadata: dict | None, json_ld: list | None) -> dict:
    """Retourne {published_at, modified_at} ISO (ou vide) pour une page crawl?e."""
    metadata = metadata or {}
    published = _iso(metadata.get("published_at"))
    modified = _iso(metadata.get("modified_at"))
    if not (published and modified):
        ld_published, ld_modified = _json_ld_dates(json_ld or [])
        published = published or ld_published
        modified = modified or ld_modified
    return {"published_at": published, "modified_at": modified}

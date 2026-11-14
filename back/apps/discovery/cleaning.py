"""Règles de propreté des contenus importés (lieux, commerces, annonces).

Fonctions pures, partagées par la passe d'import et par la commande de
nettoyage de l'existant (`clean_imported_data`). Elles ne complètent jamais
une information : elles écartent du bruit (page traduite, suffixe de commune
répété dans un nom) ou rapprochent deux écritures d'un même nom.
"""

from __future__ import annotations

import re
import unicodedata
from urllib.parse import urlparse

# Premier segment d'URL des versions traduites des sites officiels
# (ot-aiguesmortes.com/es/…, /en/…). Le français n'a pas de préfixe ou « fr ».
_FOREIGN_LANGUAGE_SEGMENTS = frozenset(
    {"en", "es", "de", "it", "nl", "pt", "ca", "ru", "zh", "ja", "pl", "da", "sv"}
)

# Séparateur entre un nom et un suffixe : « Nom - Commune », « Nom :Commune ».
_SUFFIX_SEPARATOR = re.compile(r"\s[-–—|]\s|\s?:\s?")


def norm_text(value: object) -> str:
    """Minuscules, sans accents ni ponctuation : « Le Grau-du-Roi » → « le grau du roi »."""
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = text.encode("ascii", "ignore").decode().casefold()
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


def is_foreign_language_url(url: str) -> bool:
    """Vrai pour une page traduite (`/en/…`, `/es-es/…`) d'un site officiel."""
    segments = [segment for segment in urlparse(url or "").path.split("/") if segment]
    if not segments:
        return False
    return segments[0].casefold().split("-")[0] in _FOREIGN_LANGUAGE_SEGMENTS and (
        len(segments[0]) in (2, 5)
    )


# Pages utilitaires d'un site : aucun contenu à extraire, mais elles listent
# souvent tous les titres du site (plan du site) et l'IA en tirait des candidats
# fantômes. Les pages de liste (agenda, actualités) ne sont PAS exclues : elles
# portent de vrais évènements.
_NAVIGATION_SLUGS = frozenset({
    "plan-du-site", "plan-site", "sitemap", "site-map", "mentions-legales",
    "mentions", "cgu", "cgv", "conditions-generales", "politique-de-confidentialite",
    "confidentialite", "donnees-personnelles", "rgpd", "cookies", "gestion-des-cookies",
    "accessibilite", "credits", "recherche", "search", "connexion", "login",
    "mon-compte", "panier", "newsletter", "contact", "nous-contacter",
})
_NAVIGATION_SEGMENTS = frozenset({"tag", "tags", "author", "auteur", "feed", "wp-json"})


def is_navigation_url(url: str) -> bool:
    """Vrai pour une page utilitaire (plan du site, mentions légales, recherche…)."""
    parsed = urlparse(url or "")
    segments = [segment.casefold() for segment in parsed.path.split("/") if segment]
    if not segments:
        return False
    if any(segment in _NAVIGATION_SEGMENTS for segment in segments):
        return True
    last = re.sub(r"\.(html?|php|aspx?)$", "", segments[-1])
    return last in _NAVIGATION_SLUGS


def strip_locality_suffix(name: str, *localities: object) -> str:
    """Retire les suffixes de commune répétés en fin de nom.

    « A.C.S - SECTION YOGA - Le Grau du Roi :Le Grau du Roi » → « A.C.S - SECTION YOGA ».
    Seul un suffixe strictement égal à une des localités fournies est retiré ;
    le nom n'est jamais vidé.
    """
    wanted = {norm_text(locality) for locality in localities if norm_text(locality)}
    name = " ".join(str(name or "").split())
    while wanted:
        matches = list(_SUFFIX_SEPARATOR.finditer(name))
        if not matches:
            break
        last = matches[-1]
        head, tail = name[: last.start()].strip(), name[last.end() :]
        if not head or norm_text(tail) not in wanted:
            break
        name = head
    return name

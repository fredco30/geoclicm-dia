"""Une activité permanente ou récurrente annonce-t-elle son rythme ?

L'extraction renvoie volontairement `occurrences: []` pour « toute l'année » ou
« tous les mercredis » : ce n'est pas un événement daté. Ces candidats se
retrouvent donc sans date, mêlés aux pages qui ne sont pas des événements du
tout (un service, une ouverture de commerce, un article de presse).

Les distinguer évite de rejeter en masse un marché hebdomadaire, qui est du
contenu voulu par la rubrique Marchés. En cas de doute la détection penche vers
la conservation : un faux positif garde un candidat, il n'en détruit aucun.
"""

from __future__ import annotations

import re

from .categorize import normalize

# Cherchés sur le texte normalisé (sans accents) : « 7j/7 » devient « 7j 7 »,
# « toute l'année » devient « toute l annee ».
RECURRENCE_MARKERS = (
    "tous les",
    "toutes les",
    "chaque",
    "toute l annee",
    "a l annee",
    "hebdomadaire",
    "bihebdomadaire",
    "mensuel",
    "mensuelle",
    "quotidien",
    "quotidienne",
    "permanent",
    "permanente",
    "7j 7",
    "7 jours sur 7",
    "en continu",
    "les lundis",
    "les mardis",
    "les mercredis",
    "les jeudis",
    "les vendredis",
    "les samedis",
    "les dimanches",
    "du lundi au",
    "du mardi au",
    "du mercredi au",
    "du jeudi au",
    "du vendredi au",
)

_PATTERN = re.compile(r"\b(?:" + "|".join(re.escape(m) for m in RECURRENCE_MARKERS) + r")\b")


def announces_recurrence(*parts: object) -> bool:
    """Vrai si le texte annonce un rythme plutôt qu'une date."""
    return bool(_PATTERN.search(normalize(" ".join(str(part or "") for part in parts))))

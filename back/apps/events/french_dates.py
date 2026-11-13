"""Retrouve l'année d'une date écrite sans elle, en accordant le jour de la semaine.

Les pages annoncent « samedi 23 novembre » sans millésime, et c'est l'IA qui
devait deviner l'année. Elle la calait sur « aujourd'hui » et fabriquait des
éditions jamais annoncées : une page de 2024 produisait un événement en 2026.

Le jour de la semaine lève l'ambiguïté sans rien deviner — dans une fenêtre de
cinq ans, une seule année place le 23 novembre un samedi. La fenêtre est calée
sur la date de crawl, un fait que nous maîtrisons, et non sur les métadonnées de
la page : sur ces sites, toutes les pages portent la même date de modification.

Sans jour de la semaine ni année écrite, rien n'est renvoyé. Une date absente
vaut mieux qu'une date inventée. Un jour de la semaine qui contredit l'année
écrite ne renvoie rien non plus : la page se contredit, un humain doit lire.

La fenêtre a son propre piège : un même jour de semaine revient tous les six ans,
donc une vieille date dont l'année vraie est hors fenêtre peut trouver une
solution unique… dans le futur. « Mercredi 29 décembre » vaut 2021 et 2027 ;
fenêtre ouverte sur 2027 seulement, un marché de 2021 ressort en 2027. D'où
`latest` : l'appelant plafonne les dates renvoyées, et pour une reprise de
l'existant ce plafond est la date de crawl — si la page avait annoncé plus tard
que cela le jour où nous l'avons lue, nous l'aurions vu passer.

Le plafond vaut aussi pour une année écrite noir sur blanc. Les textes repris
ne sont pas tous de la page : les titres et résumés sortent du modèle, et
l'ancien prompt inventait des millésimes. Un « 29 décembre 2027 » recopié dans
un résumé n'est pas une preuve, c'est le bug d'hier qui ressort.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import date, time

from .categorize import normalize

WEEKDAYS = {
    "lundi": 0,
    "mardi": 1,
    "mercredi": 2,
    "jeudi": 3,
    "vendredi": 4,
    "samedi": 5,
    "dimanche": 6,
}
MONTHS = {
    "janvier": 1,
    "fevrier": 2,
    "mars": 3,
    "avril": 4,
    "mai": 5,
    "juin": 6,
    "juillet": 7,
    "aout": 8,
    "septembre": 9,
    "octobre": 10,
    "novembre": 11,
    "decembre": 12,
}
# Au-delà de six ans un même jour de semaine se répète : la fenêtre doit rester
# courte pour que la solution soit unique.
YEARS_BEFORE = 3
YEARS_AFTER = 1
TIME_SEARCH_CHARS = 40

_DATE = re.compile(
    r"\b(?:(?P<weekday>" + "|".join(WEEKDAYS) + r")\s+)?"
    r"(?P<day>\d{1,2})(?:er)?\s+"
    r"(?P<month>" + "|".join(MONTHS) + r")"
    r"(?:\s+(?P<year>20\d{2}))?"
)
_TIME = re.compile(r"\b(?P<hour>\d{1,2})\s*h\s*(?P<minute>\d{2})?\b")


@dataclass(frozen=True)
class ReadDate:
    """Date lue dans un texte, avec son heure si la page l'annonce."""

    day: date
    at: time | None


def _single_year(
    day: int,
    month: int,
    weekday: int | None,
    year: int | None,
    reference: date,
    latest: date | None,
) -> date | None:
    """La seule date compatible dans la fenêtre, sinon rien."""
    years = (
        [year] if year else range(reference.year - YEARS_BEFORE, reference.year + YEARS_AFTER + 1)
    )
    found = []
    for candidate in years:
        try:
            value = date(candidate, month, day)
        except ValueError:
            continue
        if latest is not None and value > latest:
            continue
        if weekday is None or value.weekday() == weekday:
            found.append(value)
    return found[0] if len(found) == 1 else None


def _time_after(text: str, position: int) -> time | None:
    """Heure annoncée juste après la date (« à 18h30 », « à partir de 11h00 »)."""
    match = _TIME.search(text, position, position + TIME_SEARCH_CHARS)
    if match is None:
        return None
    hour, minute = int(match.group("hour")), int(match.group("minute") or 0)
    return time(hour, minute) if hour <= 23 and minute <= 59 else None


def read_dates(*parts: object, reference: date, latest: date | None = None) -> list[ReadDate]:
    """Dates complètes lisibles dans ces textes, sans aucune invention.

    `latest` écarte toute date postérieure, année écrite comprise.
    """
    found: dict[date, time | None] = {}
    for part in parts:
        text = normalize(part)
        for match in _DATE.finditer(text):
            name = match.group("weekday")
            written_year = match.group("year")
            resolved = _single_year(
                int(match.group("day")),
                MONTHS[match.group("month")],
                WEEKDAYS[name] if name else None,
                int(written_year) if written_year else None,
                reference,
                latest,
            )
            if resolved is None:
                continue
            at = _time_after(text, match.end())
            if found.get(resolved) is None:
                found[resolved] = at
    return [ReadDate(day, found[day]) for day in sorted(found)]

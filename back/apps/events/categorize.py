"""Catégorie d'un événement devinée par mots-clés (sans IA, sans coût).

Avant, une catégorie n'était reconnue que si son nom exact figurait dans le
texte (« Marché », « Concert »…) : une « Abrivado », une « Brocante » ou des
« Aubades » restaient sans catégorie et bloquaient la validation.

Règles :
- les mots-clés sont cherchés en mots entiers, sans accents ni majuscules ;
- une correspondance dans le titre compte triple, une expression de plusieurs
  mots compte double ;
- en cas d'égalité, l'ordre de CATEGORY_RULES départage (le plus spécifique
  d'abord : « course camarguaise » l'emporte sur « course ») ;
- aucun mot-clé trouvé : pas de catégorie (la rédaction choisit).
"""
from __future__ import annotations

import re
import unicodedata

# (slug de catégorie, mots-clés). Ordre = priorité en cas d'égalité.
CATEGORY_RULES: tuple[tuple[str, tuple[str, ...]], ...] = (
    (
        "tradition-camarguaise",
        (
            "abrivado", "abrivados", "bandido", "bandidos", "encierro", "encierros",
            "course camarguaise", "courses camarguaises", "raseteur", "raseteurs",
            "taureau", "taureaux", "manade", "manades", "roussataio", "gardian",
            "gardians", "ferrade", "vaches cocardieres", "course landaise",
            "club taurin", "bouvine", "taurine", "taurines", "toro", "toros",
            "joutes", "joute",
        ),
    ),
    (
        "marche",
        (
            "brocante", "brocantes", "vide grenier", "vide greniers", "braderie",
            "marche nocturne", "marches nocturnes", "marche de noel",
            "marche traditionnel", "marches traditionnels", "marche paysan",
            "marche artisanal", "marche gourmand", "marche aux puces", "puces",
            "producteurs locaux",
        ),
    ),
    (
        "festival",
        (
            "festival", "fete", "fetes", "carnaval", "feria", "feu d artifice",
            "feux d artifice", "fete votive", "fete patronale", "defile", "defiles",
        ),
    ),
    (
        "concert",
        (
            "concert", "concerts", "aubade", "aubades", "bal", "dj", "musique",
            "musical", "musicale", "music", "jazz", "chorale", "orchestre",
            "recital", "live", "blues", "rock", "dansant", "dansants",
        ),
    ),
    (
        "exposition",
        ("exposition", "expositions", "expo", "exhibition", "vernissage", "aquarelle", "salon"),
    ),
    (
        "gastronomie",
        (
            "degustation", "degustations", "beaujolais", "brunch", "diner", "dejeuner",
            "repas", "chocolat", "gourmand", "gourmande", "gastronomie", "gastronomique",
            "vin", "vins", "oenologie", "oenolitteraire", "apero", "aperitif", "tapas",
            "huitres", "culinaire", "cuisine",
        ),
    ),
    (
        "sport",
        (
            "tournoi", "tournois", "petanque", "competition", "regate", "regates",
            "aviron", "rame", "char a voile", "chars a voile", "boxe", "yoga",
            "course", "courses", "trail", "marathon", "randonnee", "triathlon",
            "kayak", "paddle", "surf", "peche", "challenge", "match", "sportive",
            "sportif", "velo",
        ),
    ),
    (
        "famille",
        (
            "enfant", "enfants", "famille", "familles", "familial", "parents",
            "bebes", "vacances de", "vacances scolaires", "chasse au tresor", "chasses au tresor",
            "jeune public", "atelier creatif", "ateliers creatifs", "maquillage",
        ),
    ),
    (
        "culture",
        (
            "conference", "conferences", "debat", "rencontre", "visite guidee",
            "visites guidees", "cinema", "cine", "projection", "film", "theatre",
            "spectacle", "spectacles", "conte", "contes", "lecture", "lectures",
            "mediatheque", "atelier du regard", "humour", "cabaret", "art performance",
            "mapping", "patrimoine", "ecrivains", "auteurs", "science", "danse",
            "atelier", "ateliers", "balade", "balades", "histoire", "histoires",
        ),
    ),
)

TITLE_WEIGHT = 3
_AGE_PATTERN = re.compile(r"\ba partir de \d+ ans\b|\bde \d+ a \d+ ans\b")


def normalize(text: object) -> str:
    """« Fête d'hiver — Arènes » → « fete d hiver arenes »."""
    value = unicodedata.normalize("NFKD", str(text or ""))
    value = value.encode("ascii", "ignore").decode().casefold()
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


_PATTERNS = {
    slug: re.compile(r"\b(?:" + "|".join(re.escape(k) for k in keywords) + r")\b")
    for slug, keywords in CATEGORY_RULES
}
_PRIORITY = {slug: index for index, (slug, _) in enumerate(CATEGORY_RULES)}


def _weight(matches: list[str]) -> int:
    # Une expression (« feu d artifice », « course camarguaise ») est plus
    # parlante qu'un mot isolé (« bal », « course ») : elle compte double.
    return sum(2 if " " in match else 1 for match in matches)


def guess_category_slug(title: object, description: object = "", kind: str | None = None) -> str | None:
    """Slug de la catégorie la plus probable, ou None si rien n'est reconnu."""
    if kind == "market":
        return "marche"
    title_text = normalize(title)
    body_text = normalize(description)
    scores: dict[str, int] = {}
    for slug, pattern in _PATTERNS.items():
        score = TITLE_WEIGHT * _weight(pattern.findall(title_text)) + _weight(
            pattern.findall(body_text)
        )
        if score:
            scores[slug] = score
    if _AGE_PATTERN.search(f"{title_text} {body_text}"):
        scores["famille"] = scores.get("famille", 0) + 1
    if not scores:
        return None
    return min(scores, key=lambda slug: (-scores[slug], _PRIORITY[slug]))

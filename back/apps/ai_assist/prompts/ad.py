"""Prompt pour la génération de variantes de headline + CTA d'encart pub."""
from __future__ import annotations

from typing import Any

from .common import EDITORIAL_LINE_FR


PLACEMENT_HINTS = {
    "home_hero": "Bandeau principal de la page d'accueil — accroche forte, "
                 "visible avant tout. Headline ≤ 50 caractères.",
    "home_sidebar": "Encart latéral page d'accueil — court et lisible "
                    "rapidement. Headline ≤ 40 caractères.",
    "article_inline": "Encart au milieu d'un article — doit s'intégrer "
                      "sans interrompre la lecture. Ton calme.",
    "article_sidebar": "Encart sidebar article — concis. Headline ≤ 40 chars.",
    "directory_top": "Top de la page annuaire — ciblé professionnel "
                     "(visiteur cherche un commerce). Promesse claire.",
    "directory_inline": "Inline annuaire — discret. Headline ≤ 40 chars.",
    "agenda_top": "Top page agenda — événementiel ou saisonnier. Verbe "
                  "d'action.",
    "weather_top": "Top page météo — visiteur souvent touriste. Lien "
                   "logique avec l'extérieur (terrasse, plage, abri).",
    "weather_sidebar": "Sidebar météo — court. Headline ≤ 40 chars.",
    "newsletter": "Newsletter — peut être un peu plus long, ton éditorial.",
}

GOAL_HINTS = {
    "click": "Objectif principal : faire cliquer. CTA orienté action "
             "directe ('Voir la carte', 'Réserver', 'Découvrir').",
    "awareness": "Objectif principal : se faire connaître. Le CTA peut "
                 "être plus doux ('En savoir plus', 'Visiter le site').",
    "promo": "Objectif principal : promo / offre limitée. Mentionner "
             "l'avantage concret. CTA pressant ('Profiter de l'offre').",
}


def build_ad_headline_prompts(
    *,
    business_data: dict[str, Any],
    placement: str,
    goal: str = "click",
    n_variants: int = 5,
) -> tuple[str, str]:
    """
    Construit (system_prompt, user_prompt) pour générer N variantes de
    (headline + cta_text) pour un encart pub.

    Renvoie un JSON :
        { "variants": [ {"headline": "...", "cta": "..."}, ... ] }

    Contraintes Mistral :
    - headline ≤ 80 caractères (limite stricte du modèle Django)
    - cta ≤ 30 caractères (limite stricte du modèle Django)
    - Pas de superlatifs creux, pas d'emojis, pas de hashtags.
    """
    placement_text = PLACEMENT_HINTS.get(
        placement,
        "Emplacement générique — encart court et clair.",
    )
    goal_text = GOAL_HINTS.get(goal, GOAL_HINTS["click"])

    system = f"""{EDITORIAL_LINE_FR}

Ta mission : générer {n_variants} variantes (headline + CTA) pour un
encart publicitaire de geoclicMédia, qui met en avant un commerce
local.

Emplacement : {placement_text}
{goal_text}

Tu dois retourner un objet JSON STRICT avec cette structure :
{{
  "variants": [
    {{"headline": "<≤ 80 caractères>", "cta": "<≤ 30 caractères>"}},
    ... ({n_variants} entrées au total)
  ]
}}

Contraintes ABSOLUES :
- headline ≤ 80 caractères. cta ≤ 30 caractères. Si tu dépasses, on
  rejettera et il faudra refaire.
- Pas de superlatifs creux ("le meilleur", "incontournable", "magique").
- Pas d'emojis, pas d'hashtags, pas de markdown.
- Pas de jeu de mots forcé. Préférer une promesse concrète.
- Reste sobre, en cohérence avec la voix éditoriale Camargue.
- Variantes vraiment DIFFÉRENTES entre elles : varier l'angle (le
  produit, l'expérience, le lieu, l'instant, la promesse). Pas de
  paraphrase superficielle.
- Ne jamais inventer un fait précis (prix, date, distance, label) qui
  ne soit pas dans les données fournies.
- Le JSON doit être PARFAITEMENT valide.
"""

    parts: list[str] = []
    parts.append(f"Commerce : {business_data.get('name', '?')}")
    parts.append(f"Catégorie : {business_data.get('category', '?')}")
    if business_data.get("commune"):
        parts.append(f"Commune : {business_data['commune']}")
    if business_data.get("short_description"):
        parts.append(
            f"Description courte : {business_data['short_description']}"
        )
    if business_data.get("specialties"):
        parts.append(
            f"Spécialités : {', '.join(business_data['specialties'])}"
        )

    user = "\n".join(parts) + (
        f"\n\nGénère {n_variants} variantes en JSON strict, conformes "
        "aux contraintes ci-dessus."
    )
    return system, user

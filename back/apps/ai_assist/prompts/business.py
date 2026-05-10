"""Prompts pour la génération de fiche commerçant assistée."""
from __future__ import annotations

from typing import Any

from .common import EDITORIAL_LINE_FR, TONE_INSTRUCTIONS


def build_describe_prompts(
    *,
    business_data: dict[str, Any],
    tone: str = "pro",
) -> tuple[str, str]:
    """
    Construit (system_prompt, user_prompt) pour la génération de fiche
    commerçant.

    Args:
        business_data: dict contenant `name`, `category`, `commune`,
            `keywords`. En mode complétion, peut aussi contenir
            `existing_short_description`, `existing_description`,
            `existing_specialties` pour ne pas écraser bêtement.
        tone: 'pro' | 'friendly' | 'concise'. Voir TONE_INSTRUCTIONS.

    Returns:
        (system_prompt, user_prompt) prêts à passer à mistral.generate().
    """
    tone_text = TONE_INSTRUCTIONS.get(tone, TONE_INSTRUCTIONS["pro"])

    system = f"""{EDITORIAL_LINE_FR}

Ta mission : générer un brouillon de fiche commerçant pour
geoclicMédia, à partir des informations fournies. {tone_text}

Tu dois retourner un objet JSON STRICT avec exactement ces clés :
- "short_description" : phrase courte d'accroche (60 à 200 caractères max).
- "description" : description complète de la fiche (400 à 1500
  caractères, 2 à 4 paragraphes courts séparés par \\n\\n).
- "specialties" : liste de 3 à 8 spécialités courtes (chacune ≤ 50
  caractères, format mots-clés ou expression courte). Pas de phrases.
- "faq" : liste de 3 à 5 questions/réponses utiles à un visiteur (chaque
  élément est un objet {{"q": "...", "a": "..."}}). Questions concrètes
  qu'un client se poserait avant de venir : horaires/saisonnalité,
  réservation, accessibilité, paiement, parking, public cible, etc.
  Réponses courtes (1-3 phrases). Ne PAS inventer de faits non fournis ;
  formuler des réponses générales si nécessaire.

Contraintes :
- Texte en français. Pas d'emojis, pas de hashtags, pas de markdown
  (sauf les sauts de ligne dans description).
- Si une information manque dans les données, ne l'invente pas. Reste
  général ("ouvert toute la saison", pas "ouvert de 9h à 19h").
- Le JSON doit être PARFAITEMENT valide (clés entre guillemets, pas de
  virgule traînante, pas de commentaire).
"""

    # Construction du prompt utilisateur structuré
    parts: list[str] = []
    parts.append(f"Nom du commerce : {business_data.get('name', '?')}")
    parts.append(f"Catégorie : {business_data.get('category', '?')}")
    if business_data.get("commune"):
        parts.append(f"Commune : {business_data['commune']}")

    keywords = business_data.get("keywords") or []
    if keywords:
        parts.append("Mots-clés fournis par le commerçant :")
        for kw in keywords:
            parts.append(f"  - {kw}")

    if business_data.get("existing_short_description"):
        parts.append(
            f"\nDescription courte existante : "
            f"{business_data['existing_short_description']}"
        )
    if business_data.get("existing_description"):
        parts.append(
            f"\nDescription longue existante :\n"
            f"{business_data['existing_description']}"
        )
    if business_data.get("existing_specialties"):
        parts.append(
            f"\nSpécialités existantes : "
            f"{', '.join(business_data['existing_specialties'])}"
        )

    parts.append(
        "\nGénère le brouillon en JSON strict. Si des champs existants "
        "sont fournis ci-dessus, améliore-les sans changer leur sens "
        "fondamental — l'objectif est d'aider, pas de réécrire à neuf."
    )

    user = "\n".join(parts)
    return system, user

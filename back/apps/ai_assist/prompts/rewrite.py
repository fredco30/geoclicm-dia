"""Prompt pour la réécriture pro d'un texte court."""
from __future__ import annotations

from .common import EDITORIAL_LINE_FR, TONE_INSTRUCTIONS


CONTEXT_HINTS = {
    "business": (
        "Le texte fait partie d'une fiche commerçant : description, "
        "spécialités, ou texte d'accueil. Garde le commerce comme sujet."
    ),
    "article": (
        "Le texte fait partie d'un article éditorial : reportage, "
        "portrait, brève. Conserve le sujet et les faits exactement."
    ),
    "ad": (
        "Le texte est destiné à un encart publicitaire : doit rester "
        "court, percutant, sans superlatifs creux."
    ),
    "general": "Texte générique, contexte non précisé.",
}


def build_rewrite_prompts(
    *,
    text: str,
    tone: str = "pro",
    context: str = "general",
    n_alternatives: int = 2,
) -> tuple[str, str]:
    """
    Construit (system_prompt, user_prompt) pour la réécriture d'un
    paragraphe / phrase.

    Renvoie un JSON :
        {
          "rewritten": "<la version principale>",
          "alternatives": ["<v2>", "<v3>", ...]
        }

    `n_alternatives` sert à proposer 2-4 variantes en plus du choix
    principal. On reste à 2 par défaut pour limiter les tokens.
    """
    tone_text = TONE_INSTRUCTIONS.get(tone, TONE_INSTRUCTIONS["pro"])
    context_text = CONTEXT_HINTS.get(context, CONTEXT_HINTS["general"])

    system = f"""{EDITORIAL_LINE_FR}

Ta mission : réécrire le texte fourni par l'utilisateur en améliorant
sa clarté et son rythme, sans changer son sens fondamental ni
inventer de faits.

{context_text}
Tonalité : {tone_text}

Tu dois retourner un objet JSON STRICT avec exactement ces clés :
- "rewritten" : la meilleure version proposée.
- "alternatives" : liste de {n_alternatives} variantes courtes,
  formulées différemment, dans le même esprit.

Contraintes :
- Ne CHANGE PAS les faits, dates, prix, noms propres présents dans le
  texte original.
- Garde la même langue (français).
- Si le texte original est très court (< 30 caractères), retourne-le
  inchangé en "rewritten" et propose 1-2 variantes courtes simplement
  reformulées.
- Pas de markdown ni d'emojis. Pas de guillemets typographiques
  inutiles (« » ou " ").
- Le JSON doit être PARFAITEMENT valide.
"""

    user = (
        "Voici le texte à réécrire :\n\n"
        f"{text}\n\n"
        f"Réécris-le ({tone}) et propose {n_alternatives} alternatives "
        "courtes en JSON strict."
    )

    return system, user

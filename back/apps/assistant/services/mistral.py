"""
Client Mistral AI — appels HTTP minimalistes via `requests`, pas de SDK.

Mistral expose 2 endpoints qu'on utilise :
- POST /v1/embeddings : convertir un texte en vecteur 1024 dims
- POST /v1/chat/completions : générer une réponse à partir d'un prompt

On reste sur des appels REST plutôt que d'ajouter le SDK `mistralai` —
moins de deps à maintenir, comportement plus prévisible. Le contrat de
l'API est stable.

Coûts approximatifs au 2026-05 (source console.mistral.ai/billing) :
- mistral-small-latest : ~0,20 €/1M tokens entrée, ~0,60 €/1M sortie
- mistral-embed       : ~0,10 €/1M tokens entrée

Pour une utilisation média local (~500 questions/mois × 2k tokens), le
coût mensuel se situe entre 5 et 15 €.
"""
from __future__ import annotations

import logging
from typing import Any

import requests
from django.conf import settings

logger = logging.getLogger(__name__)

MISTRAL_API_BASE = "https://api.mistral.ai/v1"
HTTP_TIMEOUT = 30  # secondes — laisse de la marge pour les longues réponses


class MistralError(Exception):
    """Erreur générique remontée à l'appelant pour qu'il retourne un 503."""


class MistralNotConfigured(MistralError):
    """Levée si MISTRAL_API_KEY n'est pas dans .env. L'endpoint /ask
    renvoie 503 avec un message clair."""


def _check_configured() -> str:
    api_key = getattr(settings, "MISTRAL_API_KEY", "") or ""
    if not api_key.strip():
        raise MistralNotConfigured(
            "MISTRAL_API_KEY non configurée. "
            "Voir docs/20-assistant-ia-deploiement.md."
        )
    return api_key


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {_check_configured()}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }


# ---------------------------------------------------------------------------
# Embeddings
# ---------------------------------------------------------------------------

def embed_one(text: str) -> list[float]:
    """Convertit un texte (typiquement <= 2k tokens) en vecteur 1024 dims."""
    if not text or not text.strip():
        raise ValueError("text vide")
    return embed_batch([text])[0]


def embed_batch(texts: list[str]) -> list[list[float]]:
    """Embeds plusieurs textes en un seul appel. Plus économe que 1 call/texte."""
    if not texts:
        return []

    model = getattr(settings, "MISTRAL_EMBED_MODEL", "mistral-embed")
    payload = {"model": model, "input": texts}

    try:
        response = requests.post(
            f"{MISTRAL_API_BASE}/embeddings",
            headers=_headers(),
            json=payload,
            timeout=HTTP_TIMEOUT,
        )
    except requests.RequestException as exc:
        logger.error("Mistral embeddings: erreur réseau %s", exc)
        raise MistralError(f"Erreur réseau Mistral: {exc}") from exc

    if response.status_code != 200:
        logger.error(
            "Mistral embeddings: HTTP %s — %s",
            response.status_code,
            response.text[:500],
        )
        raise MistralError(
            f"Mistral embeddings HTTP {response.status_code}"
        )

    data = response.json()
    items = data.get("data") or []
    if len(items) != len(texts):
        raise MistralError(
            f"Mistral embeddings: nb retours ({len(items)}) != nb textes ({len(texts)})"
        )
    return [item["embedding"] for item in items]


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------

def chat(
    *,
    system_prompt: str,
    user_question: str,
    history: list[dict[str, str]] | None = None,
    temperature: float = 0.3,
) -> dict[str, Any]:
    """
    Appel chat completions Mistral. Renvoie un dict :
        {
            "answer": str,
            "tokens_in": int,
            "tokens_out": int,
            "raw": <réponse Mistral complète>,
        }

    `history` est une liste optionnelle de tours précédents au format Mistral
    [{"role": "user"|"assistant", "content": "..."}, …]. Les messages sont
    insérés entre le system_prompt et la nouvelle question utilisateur.
    """
    model = getattr(settings, "MISTRAL_MODEL", "mistral-small-latest")

    messages: list[dict[str, str]] = [{"role": "system", "content": system_prompt}]
    if history:
        messages.extend(history)
    messages.append({"role": "user", "content": user_question})

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": 1024,
    }

    try:
        response = requests.post(
            f"{MISTRAL_API_BASE}/chat/completions",
            headers=_headers(),
            json=payload,
            timeout=HTTP_TIMEOUT,
        )
    except requests.RequestException as exc:
        logger.error("Mistral chat: erreur réseau %s", exc)
        raise MistralError(f"Erreur réseau Mistral: {exc}") from exc

    if response.status_code != 200:
        logger.error(
            "Mistral chat: HTTP %s — %s",
            response.status_code,
            response.text[:500],
        )
        raise MistralError(f"Mistral chat HTTP {response.status_code}")

    data = response.json()
    try:
        answer = data["choices"][0]["message"]["content"]
        usage = data.get("usage") or {}
        tokens_in = int(usage.get("prompt_tokens", 0))
        tokens_out = int(usage.get("completion_tokens", 0))
    except (KeyError, IndexError, TypeError) as exc:
        logger.error("Mistral chat: réponse malformée %s — %s", exc, data)
        raise MistralError("Réponse Mistral malformée") from exc

    return {
        "answer": answer,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "raw": data,
    }

"""Génération auditée via un fournisseur compatible OpenAI."""

from __future__ import annotations

import logging
import time
from typing import Any

import requests

from ..models import AIGeneration
from .mistral import BudgetExceeded, _check_budget, _compose_prompt_for_log
from .pricing import MODEL_PRICING, estimate_cost_eur

logger = logging.getLogger(__name__)


class LLMProviderError(RuntimeError):
    """Erreur réseau, HTTP ou de format remontée par le fournisseur."""


class LLMProviderNotConfigured(LLMProviderError):
    """Le fournisseur sélectionné ne dispose pas de jeton d'accès."""


def generate_openai_compatible(
    *,
    user,
    endpoint: str,
    provider: str,
    base_url: str,
    api_key: str,
    model: str,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.0,
    max_tokens: int = 2048,
    response_format: dict | None = None,
    reasoning_effort: str | None = None,
    timeout: int = 120,
    max_attempts: int = 3,
) -> dict[str, Any]:
    """Appelle ``/chat/completions`` avec budget, reprises et journal d'audit."""
    token = str(api_key or "").strip()
    if not token:
        raise LLMProviderNotConfigured(
            f"Jeton {provider} non configuré pour cette génération."
        )

    if model not in MODEL_PRICING:
        logger.warning(
            "Fournisseur %s : tarif inconnu pour %s, coût journalisé à 0 €.",
            provider,
            model,
        )

    try:
        _check_budget(user_id=user.id)
    except BudgetExceeded as exc:
        AIGeneration.objects.create(
            user=user,
            endpoint=endpoint,
            model=model,
            status=AIGeneration.Status.BUDGET_EXCEEDED,
            prompt=_compose_prompt_for_log(system_prompt, user_prompt),
            error_message=str(exc),
        )
        raise

    payload: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if response_format is not None:
        payload["response_format"] = response_format
    if reasoning_effort:
        payload["reasoning_effort"] = reasoning_effort

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    attempts = max(1, int(max_attempts))
    started = time.time()
    response = None
    last_error: Exception | None = None

    for attempt in range(1, attempts + 1):
        try:
            response = requests.post(
                f"{base_url.rstrip('/')}/chat/completions",
                headers=headers,
                json=payload,
                timeout=(10, max(10, int(timeout))),
            )
            if response.status_code != 429 and response.status_code < 500:
                break
            last_error = LLMProviderError(
                f"HTTP {response.status_code}: {response.text[:300]}"
            )
        except requests.RequestException as exc:
            last_error = exc

        if attempt < attempts:
            time.sleep(min(2 ** (attempt - 1), 4))

    duration_ms = int((time.time() - started) * 1000)
    if response is None or response.status_code != 200:
        detail = (
            f"HTTP {response.status_code}: {response.text[:500]}"
            if response is not None
            else f"Erreur réseau: {last_error}"
        )
        AIGeneration.objects.create(
            user=user,
            endpoint=endpoint,
            model=model,
            status=AIGeneration.Status.ERROR,
            prompt=_compose_prompt_for_log(system_prompt, user_prompt),
            error_message=detail,
            duration_ms=duration_ms,
        )
        logger.error("%s[%s] : %s", provider, endpoint, detail)
        raise LLMProviderError(f"{provider}: {detail}") from last_error

    try:
        data = response.json()
        answer = data["choices"][0]["message"]["content"]
        if not isinstance(answer, str) or not answer.strip():
            raise ValueError("contenu final absent")
        usage = data.get("usage") or {}
        tokens_in = int(usage.get("prompt_tokens", 0))
        tokens_out = int(usage.get("completion_tokens", 0))
    except (ValueError, KeyError, IndexError, TypeError) as exc:
        AIGeneration.objects.create(
            user=user,
            endpoint=endpoint,
            model=model,
            status=AIGeneration.Status.ERROR,
            prompt=_compose_prompt_for_log(system_prompt, user_prompt),
            response=response.text[:500],
            error_message=f"Réponse malformée: {exc}",
            duration_ms=duration_ms,
        )
        raise LLMProviderError(f"{provider}: réponse malformée") from exc

    cost_eur = estimate_cost_eur(model, tokens_in, tokens_out)
    generation = AIGeneration.objects.create(
        user=user,
        endpoint=endpoint,
        model=model,
        status=AIGeneration.Status.SUCCESS,
        prompt=_compose_prompt_for_log(system_prompt, user_prompt),
        response=answer,
        tokens_in=tokens_in,
        tokens_out=tokens_out,
        cost_eur=cost_eur,
        duration_ms=duration_ms,
    )
    return {
        "answer": answer,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "cost_eur": cost_eur,
        "model": data.get("model") or model,
        "provider": provider,
        "generation_id": generation.id,
        "duration_ms": duration_ms,
    }


__all__ = [
    "LLMProviderError",
    "LLMProviderNotConfigured",
    "generate_openai_compatible",
]

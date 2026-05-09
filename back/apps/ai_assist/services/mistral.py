"""
Service de génération IA pour le back-office et l'espace annonceur.

À ne pas confondre avec `apps.assistant.services.mistral` qui sert le
RAG visiteur public. Ici on est en mode authentifié, audit log
obligatoire, budgets par utilisateur et global.

Workflow d'un appel `generate(...)` :
1. Vérification du budget journalier (utilisateur + global).
2. Appel Mistral chat completions (réutilise la couche HTTP de
   `apps.assistant.services.mistral`).
3. Calcul du coût via `pricing.estimate_cost_eur`.
4. Création d'une ligne `AIGeneration` (succès ou erreur).
5. Renvoie un dict structuré au caller.

Toutes les erreurs sont loggées dans `AIGeneration` avant d'être
remontées — ça garantit qu'on garde toujours une trace des tentatives,
même quand la chaîne échoue.
"""
from __future__ import annotations

import logging
import time
from decimal import Decimal
from typing import Any

import requests
from django.conf import settings
from django.db.models import Sum
from django.utils import timezone

from apps.assistant.services.mistral import (
    MISTRAL_API_BASE,
    HTTP_TIMEOUT,
    MistralError,
    MistralNotConfigured,
    _headers,
)

from ..models import AIGeneration
from .pricing import estimate_cost_eur, MODEL_PRICING

logger = logging.getLogger(__name__)


class BudgetExceeded(MistralError):
    """Levée si le cap journalier (user ou global) est atteint."""


def _today_cost_eur(user_id: int | None = None) -> Decimal:
    """Somme des coûts IA depuis 00h00 aujourd'hui (TZ Django).

    Si `user_id` est fourni, restreint au scope de cet utilisateur.
    Sinon retourne le total global.
    """
    today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
    qs = AIGeneration.objects.filter(created_at__gte=today_start)
    if user_id is not None:
        qs = qs.filter(user_id=user_id)
    total = qs.aggregate(s=Sum("cost_eur")).get("s") or Decimal("0")
    return Decimal(total)


def _check_budget(user_id: int) -> None:
    """Lève BudgetExceeded si l'un des caps est atteint avant l'appel.

    Le check est best-effort : un appel concurrent pourrait passer juste
    sous la limite — on tolère ce dépassement marginal pour ne pas
    introduire de verrou pessimiste qui ralentirait toutes les requêtes.
    """
    user_cap = Decimal(str(getattr(settings, "AI_ASSIST_BUDGET_USER_DAILY_EUR", 5)))
    global_cap = Decimal(str(getattr(settings, "AI_ASSIST_BUDGET_GLOBAL_DAILY_EUR", 30)))

    user_cost = _today_cost_eur(user_id=user_id)
    if user_cost >= user_cap:
        raise BudgetExceeded(
            f"Cap journalier utilisateur atteint ({user_cost}€ / {user_cap}€). "
            "Réessaie demain ou demande à l'admin d'augmenter le quota."
        )

    global_cost = _today_cost_eur()
    if global_cost >= global_cap:
        raise BudgetExceeded(
            f"Cap journalier global atteint ({global_cost}€ / {global_cap}€). "
            "Le service IA est temporairement saturé, réessaie dans quelques heures."
        )


def generate(
    *,
    user,
    endpoint: str,
    system_prompt: str,
    user_prompt: str,
    model: str | None = None,
    use_large: bool = False,
    temperature: float = 0.4,
    max_tokens: int = 1024,
    response_format: dict | None = None,
) -> dict[str, Any]:
    """
    Appelle Mistral chat avec audit log, budget check et retour structuré.

    Args:
        user: User Django authentifié (FK obligatoire pour audit).
        endpoint: identifiant logique de la feature appelante. Ex:
            'business.describe', 'article.draft'. Stocké pour les stats
            d'adoption.
        system_prompt: prompt système (rôle, contraintes, ton).
        user_prompt: prompt utilisateur (la requête concrète).
        model: nom de modèle Mistral à utiliser. Si None, on prend
            `AI_ASSIST_LARGE_MODEL` si `use_large=True`, sinon
            `AI_ASSIST_DEFAULT_MODEL`.
        use_large: raccourci ergonomique — préfère utiliser ce flag
            plutôt que de hardcoder le nom du modèle dans les callers.
        temperature: 0.0 = déterministe, 1.0 = créatif. Pour de la
            génération éditoriale on reste autour de 0.4-0.6.
        max_tokens: limite stricte de la réponse Mistral. Économise les
            coûts si le caller sait que la sortie attendue est courte.

    Returns:
        {
            "answer": str,           # texte généré par Mistral
            "tokens_in": int,
            "tokens_out": int,
            "cost_eur": Decimal,
            "model": str,            # modèle effectivement utilisé
            "generation_id": int,    # PK de l'AIGeneration créée
            "duration_ms": int,
        }

    Raises:
        MistralNotConfigured: si MISTRAL_API_KEY absente.
        BudgetExceeded: si cap user ou global atteint.
        MistralError: erreur réseau/HTTP côté Mistral.
    """
    # 1. Résolution du modèle
    if model is None:
        if use_large:
            model = getattr(
                settings, "AI_ASSIST_LARGE_MODEL", "mistral-large-latest",
            )
        else:
            model = getattr(
                settings, "AI_ASSIST_DEFAULT_MODEL", "mistral-small-latest",
            )

    if model not in MODEL_PRICING:
        logger.warning(
            "ai_assist.generate: modèle '%s' inconnu côté pricing — "
            "le coût sera reporté à 0€. Mettre à jour pricing.MODEL_PRICING.",
            model,
        )

    # 2. Budget check (lève BudgetExceeded → log + 429 côté view)
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

    # 3. Appel Mistral
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
        # Ex: {"type": "json_object"} pour forcer Mistral à retourner du
        # JSON parseable. Supporté sur mistral-small-latest et au-delà.
        payload["response_format"] = response_format

    started = time.time()
    try:
        response = requests.post(
            f"{MISTRAL_API_BASE}/chat/completions",
            headers=_headers(),  # vérifie aussi MISTRAL_API_KEY → MistralNotConfigured
            json=payload,
            timeout=HTTP_TIMEOUT,
        )
    except requests.RequestException as exc:
        duration_ms = int((time.time() - started) * 1000)
        AIGeneration.objects.create(
            user=user,
            endpoint=endpoint,
            model=model,
            status=AIGeneration.Status.ERROR,
            prompt=_compose_prompt_for_log(system_prompt, user_prompt),
            error_message=f"Erreur réseau: {exc}",
            duration_ms=duration_ms,
        )
        logger.error("ai_assist[%s]: erreur réseau Mistral %s", endpoint, exc)
        raise MistralError(f"Erreur réseau Mistral: {exc}") from exc

    duration_ms = int((time.time() - started) * 1000)

    if response.status_code != 200:
        body = response.text[:500]
        AIGeneration.objects.create(
            user=user,
            endpoint=endpoint,
            model=model,
            status=AIGeneration.Status.ERROR,
            prompt=_compose_prompt_for_log(system_prompt, user_prompt),
            error_message=f"HTTP {response.status_code}: {body}",
            duration_ms=duration_ms,
        )
        logger.error(
            "ai_assist[%s]: Mistral HTTP %s — %s",
            endpoint, response.status_code, body,
        )
        raise MistralError(f"Mistral HTTP {response.status_code}")

    # 4. Parse + calcul coût
    data = response.json()
    try:
        answer = data["choices"][0]["message"]["content"]
        usage = data.get("usage") or {}
        tokens_in = int(usage.get("prompt_tokens", 0))
        tokens_out = int(usage.get("completion_tokens", 0))
    except (KeyError, IndexError, TypeError) as exc:
        AIGeneration.objects.create(
            user=user,
            endpoint=endpoint,
            model=model,
            status=AIGeneration.Status.ERROR,
            prompt=_compose_prompt_for_log(system_prompt, user_prompt),
            response=str(data)[:500],
            error_message=f"Réponse malformée: {exc}",
            duration_ms=duration_ms,
        )
        logger.error("ai_assist[%s]: réponse Mistral malformée %s", endpoint, exc)
        raise MistralError("Réponse Mistral malformée") from exc

    cost_eur = estimate_cost_eur(model, tokens_in, tokens_out)

    # 5. Log succès
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
        "model": model,
        "generation_id": generation.id,
        "duration_ms": duration_ms,
    }


def _compose_prompt_for_log(system_prompt: str, user_prompt: str) -> str:
    """Concatène les deux prompts pour le stockage en BDD.

    On limite la longueur stockée pour éviter de gonfler la table : 8000
    caractères couvrent largement les cas réels (un draft d'article =
    ~2000 chars de prompt système + ~500 chars de brief utilisateur).
    """
    combined = f"[SYSTEM]\n{system_prompt}\n\n[USER]\n{user_prompt}"
    return combined[:8000]


# Re-export pour faciliter l'import côté views/serializers
__all__ = [
    "generate",
    "BudgetExceeded",
    "MistralError",
    "MistralNotConfigured",
]

"""
Tarification Mistral et calcul de coût d'une génération.

Tarifs source : https://mistral.ai/pricing — au 2026-05.

On stocke ces valeurs côté code (pas en BDD) parce qu'elles évoluent
rarement et qu'on a besoin de les utiliser dans des aggrégats budget
sans round-trip BDD.

Pour ajouter un nouveau modèle, étendre `MODEL_PRICING`. Si Mistral
change ses tarifs, mettre à jour les valeurs et déployer — les coûts
historiques stockés dans `AIGeneration.cost_eur` restent figés (ils
représentent le coût au moment de la génération).
"""
from __future__ import annotations

from decimal import Decimal


# Tarifs en euros par 1 million de tokens.
# {model_name: (input_eur_per_million, output_eur_per_million)}
MODEL_PRICING: dict[str, tuple[Decimal, Decimal]] = {
    "mistral-small-latest": (Decimal("0.20"), Decimal("0.60")),
    "mistral-large-latest": (Decimal("2.00"), Decimal("6.00")),
    "mistral-tiny": (Decimal("0.14"), Decimal("0.42")),
    # Embeddings — input only, pas d'output
    "mistral-embed": (Decimal("0.10"), Decimal("0.00")),
}


def estimate_cost_eur(
    model: str,
    tokens_in: int,
    tokens_out: int,
) -> Decimal:
    """
    Calcule le coût d'un appel Mistral à partir des tokens consommés.

    Si le modèle est inconnu (nouveau modèle non listé), on retourne 0
    plutôt que de planter — le tracking des coûts est best-effort, pas
    bloquant. Une alerte log est émise dans `mistral.generate` dans ce
    cas.
    """
    pricing = MODEL_PRICING.get(model)
    if pricing is None:
        return Decimal("0")
    in_price, out_price = pricing
    cost = (
        (Decimal(tokens_in) / Decimal("1000000")) * in_price
        + (Decimal(tokens_out) / Decimal("1000000")) * out_price
    )
    # Quantize à 6 décimales (cohérent avec AIGeneration.cost_eur)
    return cost.quantize(Decimal("0.000001"))

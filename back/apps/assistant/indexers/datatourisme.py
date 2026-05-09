"""
Indexer DataTourisme — données touristiques officielles France.

Source : https://www.datatourisme.fr/ (API REST)
Licence : Open data Etalab.

Cet indexer est OPTIONNEL en V1 — il fonctionne uniquement si une clé
API est renseignée dans .env (DATATOURISME_API_KEY). DataTourisme
nécessite une inscription développeur, ce qui n'est pas un blocage mais
peut être différé après le lancement initial.

Si pas de clé : l'indexer log un warning et retourne 0. Pas de plantage,
le RAG continue à fonctionner avec les autres sources (Wikipedia, OSM,
Business, Article).

Doc API : https://www.datatourisme.fr/documentation
"""
from __future__ import annotations

import logging

from django.conf import settings

from apps.core.models import Commune

logger = logging.getLogger(__name__)


def index_all_datatourisme() -> dict[str, int]:
    """Indexe les données DataTourisme pour les 7 communes.

    No-op pour l'instant tant que DATATOURISME_API_KEY n'est pas
    configuré. Implementation complète à faire en V2 quand on aura les
    credentials et qu'on aura mesuré l'apport vs les autres sources.
    """
    api_key = getattr(settings, "DATATOURISME_API_KEY", "") or ""
    if not api_key.strip():
        logger.info(
            "DATATOURISME_API_KEY non configurée — indexer DataTourisme désactivé. "
            "S'inscrire sur https://www.datatourisme.fr/ pour activer."
        )
        return {"created": 0, "updated": 0, "unchanged": 0, "deactivated": 0, "embedded": 0}

    # TODO V2 : implémenter l'appel API et le mapping vers ChunkInput.
    # Pour l'instant on retourne 0 même avec une clé pour ne pas
    # introduire un chemin de code non testé.
    logger.warning(
        "DATATOURISME_API_KEY configurée mais l'indexer n'est pas encore "
        "implémenté. Pull request bienvenue."
    )
    _ = list(Commune.objects.filter(is_active=True))  # placeholder
    return {"created": 0, "updated": 0, "unchanged": 0, "deactivated": 0, "embedded": 0}

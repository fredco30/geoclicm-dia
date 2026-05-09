"""
Rate limit anti-abus — par IP hashée (RGPD compliant).

Pattern emprunté à city : on hash l'IP en SHA-256 avant de la stocker
en cache, jamais l'IP brute. Permet de compter les requêtes par client
sans tomber sous le coup du RGPD (l'IP brute est une donnée personnelle).

Stocké dans le cache Django (Redis) avec TTL d'1h. Compteur sliding
window simple : on garde la liste des timestamps des requêtes récentes,
on filtre à chaque check.
"""
from __future__ import annotations

import hashlib
import time

from django.conf import settings
from django.core.cache import cache


CACHE_PREFIX = "assistant:ratelimit:"
WINDOW_SECONDS = 3600  # 1 heure
SALT = "geoclicmedia-assistant"


def _hash_ip(ip: str) -> str:
    """SHA-256 anonymisé de l'IP. RGPD compliant."""
    return hashlib.sha256(f"{SALT}:{ip}".encode()).hexdigest()[:32]


def get_client_ip(request) -> str:
    """Extrait l'IP client depuis X-Forwarded-For ou request.client.

    Avec Nginx en reverse proxy, l'IP réelle est dans X-Forwarded-For.
    """
    xff = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if xff:
        return xff.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown") or "unknown"


def check_rate_limit(ip: str) -> tuple[bool, int]:
    """
    Renvoie (allowed, remaining_after_use). Si allowed=False, l'IP a
    dépassé sa quota dans la fenêtre courante.

    Le compteur est incrémenté seulement si allowed=True (le caller
    n'a pas à gérer ça).
    """
    limit = int(getattr(settings, "ASSISTANT_RATE_LIMIT_PER_HOUR", 20))
    key = f"{CACHE_PREFIX}{_hash_ip(ip)}"
    now = time.time()
    cutoff = now - WINDOW_SECONDS

    timestamps: list[float] = cache.get(key) or []
    # Sliding window : on jette ce qui a expiré
    timestamps = [t for t in timestamps if t > cutoff]

    if len(timestamps) >= limit:
        return False, 0

    timestamps.append(now)
    cache.set(key, timestamps, WINDOW_SECONDS)
    remaining = limit - len(timestamps)
    return True, remaining

"""Anti force brute sur la connexion : échecs comptés par IP hashée (Redis)."""
from __future__ import annotations

import hashlib

from django.conf import settings
from django.core.cache import cache

from apps.assistant.rate_limit import get_client_ip

CACHE_PREFIX = "auth:login-failures:"


def _key(request) -> str:
    digest = hashlib.sha256(f"geoclicmedia-login:{get_client_ip(request)}".encode())
    return CACHE_PREFIX + digest.hexdigest()[:32]


def is_blocked(request) -> bool:
    return (cache.get(_key(request)) or 0) >= settings.LOGIN_MAX_FAILURES


def record_failure(request) -> None:
    key = _key(request)
    window = settings.LOGIN_FAILURE_WINDOW_SECONDS
    cache.add(key, 0, window)
    try:
        cache.incr(key)
    except ValueError:  # clé expirée entre add et incr
        cache.set(key, 1, window)


def reset(request) -> None:
    cache.delete(_key(request))

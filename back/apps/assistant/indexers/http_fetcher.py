"""
HTTP fetcher poli : respect robots.txt + rate limit par domaine.

Utilisé par les crawlers de mairies, offices de tourisme, sites de
commerçants. On ne veut pas se faire bloquer par les sites scrapés.

Politeness :
- 1 requête par seconde par domaine (variable de classe partagée)
- User-Agent identifiable (contact email dans le UA)
- Respect robots.txt (cache 24h par domaine)
- Timeout 15s par requête
"""
from __future__ import annotations

import logging
import threading
import time
import urllib.robotparser
from typing import Optional
from urllib.parse import urlparse

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


DEFAULT_USER_AGENT = (
    "geoclicmedia-assistant-bot/1.0 (+https://media.geoclic.fr/about; "
    "contact: contact@geoclic.fr)"
)
HTTP_TIMEOUT = 15
RATE_LIMIT_PER_DOMAIN_SECONDS = 1.0


class PoliteFetcher:
    """
    Fetcher partagé entre tâches Celery (instance unique au niveau du
    module). Stocke en mémoire :
    - Le timestamp du dernier hit par domaine (pour rate limit)
    - Le robots.txt parsé par domaine (cache 24h)
    """

    def __init__(self):
        self._last_hit: dict[str, float] = {}
        self._robots: dict[str, tuple[urllib.robotparser.RobotFileParser, float]] = {}
        self._lock = threading.Lock()

    @property
    def user_agent(self) -> str:
        return getattr(settings, "ASSISTANT_CRAWL_USER_AGENT", DEFAULT_USER_AGENT)

    def _wait_rate_limit(self, domain: str) -> None:
        """Attend si on a hit ce domaine il y a moins de RATE_LIMIT_PER_DOMAIN
        secondes."""
        with self._lock:
            last = self._last_hit.get(domain)
            now = time.time()
            if last is not None:
                elapsed = now - last
                if elapsed < RATE_LIMIT_PER_DOMAIN_SECONDS:
                    sleep_for = RATE_LIMIT_PER_DOMAIN_SECONDS - elapsed
                    time.sleep(sleep_for)
            self._last_hit[domain] = time.time()

    def _can_fetch(self, url: str) -> bool:
        """True si robots.txt autorise le crawl de cette URL."""
        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                return False
            domain_key = f"{parsed.scheme}://{parsed.netloc}"

            with self._lock:
                cached = self._robots.get(domain_key)
                now = time.time()
                if cached is None or (now - cached[1]) > 86400:
                    rp = urllib.robotparser.RobotFileParser()
                    rp.set_url(f"{domain_key}/robots.txt")
                    try:
                        rp.read()
                    except Exception as exc:  # noqa: BLE001
                        # robots.txt absent ou malformé → on autorise par défaut.
                        # C'est ce que fait Google Bot.
                        logger.debug(
                            "robots.txt absent ou erreur sur %s: %s — autorisé par défaut",
                            domain_key, exc,
                        )
                        rp = None
                    self._robots[domain_key] = (rp, now)
                else:
                    rp = cached[0]

            if rp is None:
                return True
            return rp.can_fetch(self.user_agent, url)
        except Exception as exc:  # noqa: BLE001
            logger.warning("Erreur _can_fetch(%s): %s — autorisé par défaut", url, exc)
            return True

    def fetch(self, url: str, *, accept: str = "text/html") -> Optional[requests.Response]:
        """
        Récupère une URL en respectant robots.txt + rate limit.

        Renvoie la Response sur succès, None sur :
        - URL bloquée par robots.txt
        - HTTP error (404, 500, etc.)
        - timeout / erreur réseau
        - content-type non text (binaire indésirable)
        """
        if not self._can_fetch(url):
            logger.info("robots.txt interdit le crawl de %s", url)
            return None

        domain = urlparse(url).netloc
        self._wait_rate_limit(domain)

        headers = {
            "User-Agent": self.user_agent,
            "Accept": accept,
            "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.5",
        }

        try:
            response = requests.get(
                url,
                headers=headers,
                timeout=HTTP_TIMEOUT,
                allow_redirects=True,
            )
        except requests.RequestException as exc:
            logger.warning("Erreur réseau sur %s: %s", url, exc)
            return None

        if response.status_code != 200:
            logger.info("HTTP %s sur %s", response.status_code, url)
            return None

        # Sécurité content-type : on ne traite que le texte
        ctype = response.headers.get("Content-Type", "").lower()
        if "html" not in ctype and "text" not in ctype and "json" not in ctype:
            logger.debug("Content-Type non text sur %s: %s — skip", url, ctype)
            return None

        return response


# Instance partagée au niveau du module — partagée entre toutes les tâches
# Celery du même worker (rate limit cohérent au sein d'un worker).
fetcher = PoliteFetcher()

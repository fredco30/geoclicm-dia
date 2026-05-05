"""
Service météo Open-Meteo — appels HTTP, cache Redis, fallback stale.

Open-Meteo est gratuit, sans clé API ni quota. On combine deux endpoints :
- /v1/forecast (météo classique : T°, vent, précip, UV, prévisions 7j)
- /v1/marine    (vagues, houle, T° eau) — uniquement pour les communes côtières

Cache : 15 min sur la clé fraîche, 24 h sur une copie "last_known" qui sert
de fallback si Open-Meteo tombe ou ralentit.
"""
from __future__ import annotations

import logging
from datetime import UTC, datetime
from typing import Any

import requests
from django.core.cache import cache

from apps.core.models import Commune

logger = logging.getLogger(__name__)

FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
MARINE_URL = "https://marine-api.open-meteo.com/v1/marine"

CACHE_TTL_FRESH = 60 * 15           # 15 min
CACHE_TTL_STALE = 60 * 60 * 24      # 24 h
HTTP_TIMEOUT = 8                    # secondes

SWIMMING_DISCLAIMER = (
    "Indication informative basée sur la météo et l'état de la mer. "
    "La décision officielle de baignade revient au poste de secours et au drapeau de plage."
)


# ---------------------------------------------------------------------------
# HTTP fetchers
# ---------------------------------------------------------------------------

def fetch_forecast(latitude: float, longitude: float) -> dict[str, Any]:
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "timezone": "Europe/Paris",
        "forecast_days": 7,
        "current": ",".join([
            "temperature_2m",
            "apparent_temperature",
            "relative_humidity_2m",
            "precipitation",
            "weather_code",
            "wind_speed_10m",
            "wind_direction_10m",
            "wind_gusts_10m",
            "is_day",
            "uv_index",
        ]),
        "hourly": ",".join([
            "temperature_2m",
            "precipitation_probability",
            "precipitation",
            "weather_code",
            "wind_speed_10m",
        ]),
        "daily": ",".join([
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "sunrise",
            "sunset",
            "uv_index_max",
            "precipitation_sum",
            "precipitation_probability_max",
            "wind_speed_10m_max",
            "wind_gusts_10m_max",
            "wind_direction_10m_dominant",
        ]),
    }
    response = requests.get(FORECAST_URL, params=params, timeout=HTTP_TIMEOUT)
    response.raise_for_status()
    return response.json()


def fetch_marine(latitude: float, longitude: float) -> dict[str, Any]:
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "timezone": "Europe/Paris",
        "forecast_days": 7,
        "current": ",".join([
            "wave_height",
            "wave_direction",
            "wave_period",
            "wind_wave_height",
            "swell_wave_height",
            "swell_wave_period",
        ]),
        "hourly": ",".join([
            "wave_height",
            "wave_direction",
            "wave_period",
            "sea_surface_temperature",
        ]),
        "daily": ",".join([
            "wave_height_max",
            "wave_direction_dominant",
            "wave_period_max",
        ]),
    }
    response = requests.get(MARINE_URL, params=params, timeout=HTTP_TIMEOUT)
    response.raise_for_status()
    return response.json()


# ---------------------------------------------------------------------------
# Normalization
# ---------------------------------------------------------------------------

def _safe(values: list, idx: int) -> Any:
    return values[idx] if values and idx < len(values) else None


def normalize_forecast(raw: dict[str, Any]) -> dict[str, Any]:
    current = raw.get("current") or {}
    hourly = raw.get("hourly") or {}
    daily = raw.get("daily") or {}

    hourly_times = hourly.get("time") or []
    hourly_serialized = [
        {
            "time": hourly_times[i],
            "temperature": _safe(hourly.get("temperature_2m") or [], i),
            "precipitation_probability": _safe(hourly.get("precipitation_probability") or [], i),
            "precipitation": _safe(hourly.get("precipitation") or [], i),
            "weather_code": _safe(hourly.get("weather_code") or [], i),
            "wind_speed": _safe(hourly.get("wind_speed_10m") or [], i),
        }
        for i in range(min(len(hourly_times), 48))
    ]

    daily_dates = daily.get("time") or []
    daily_serialized = [
        {
            "date": daily_dates[i],
            "weather_code": _safe(daily.get("weather_code") or [], i),
            "temperature_min": _safe(daily.get("temperature_2m_min") or [], i),
            "temperature_max": _safe(daily.get("temperature_2m_max") or [], i),
            "sunrise": _safe(daily.get("sunrise") or [], i),
            "sunset": _safe(daily.get("sunset") or [], i),
            "uv_index_max": _safe(daily.get("uv_index_max") or [], i),
            "precipitation_sum": _safe(daily.get("precipitation_sum") or [], i),
            "precipitation_probability_max": _safe(
                daily.get("precipitation_probability_max") or [], i
            ),
            "wind_speed_max": _safe(daily.get("wind_speed_10m_max") or [], i),
            "wind_gusts_max": _safe(daily.get("wind_gusts_10m_max") or [], i),
            "wind_direction_dominant": _safe(
                daily.get("wind_direction_10m_dominant") or [], i
            ),
        }
        for i in range(len(daily_dates))
    ]

    return {
        "current": {
            "temperature": current.get("temperature_2m"),
            "apparent_temperature": current.get("apparent_temperature"),
            "humidity": current.get("relative_humidity_2m"),
            "precipitation": current.get("precipitation"),
            "weather_code": current.get("weather_code"),
            "wind_speed": current.get("wind_speed_10m"),
            "wind_direction": current.get("wind_direction_10m"),
            "wind_gusts": current.get("wind_gusts_10m"),
            "is_day": bool(current.get("is_day")),
            "uv_index": current.get("uv_index"),
        },
        "hourly": hourly_serialized,
        "daily": daily_serialized,
    }


def normalize_marine(raw: dict[str, Any]) -> dict[str, Any]:
    current = raw.get("current") or {}
    hourly = raw.get("hourly") or {}
    daily = raw.get("daily") or {}

    sst_values = hourly.get("sea_surface_temperature") or []
    sst_now = next((v for v in sst_values if v is not None), None)

    daily_dates = daily.get("time") or []
    daily_serialized = [
        {
            "date": daily_dates[i],
            "wave_height_max": _safe(daily.get("wave_height_max") or [], i),
            "wave_direction_dominant": _safe(daily.get("wave_direction_dominant") or [], i),
            "wave_period_max": _safe(daily.get("wave_period_max") or [], i),
        }
        for i in range(len(daily_dates))
    ]

    return {
        "current": {
            "wave_height": current.get("wave_height"),
            "wave_direction": current.get("wave_direction"),
            "wave_period": current.get("wave_period"),
            "wind_wave_height": current.get("wind_wave_height"),
            "swell_wave_height": current.get("swell_wave_height"),
            "swell_wave_period": current.get("swell_wave_period"),
        },
        "sea_surface_temperature": sst_now,
        "daily": daily_serialized,
    }


# ---------------------------------------------------------------------------
# Indicateur baignade (informatif, pas un drapeau officiel)
# ---------------------------------------------------------------------------

def compute_swimming_indicator(
    forecast_current: dict[str, Any],
    marine_current: dict[str, Any],
    sea_surface_temperature: float | None,
) -> str | None:
    """Vert / orange / rouge selon T° eau, vagues et vent.

    Renvoie None si données insuffisantes (la veille du retour de l'API par ex.).
    """
    sst = sea_surface_temperature
    wave_h = (marine_current or {}).get("wave_height")
    wind = (forecast_current or {}).get("wind_speed")

    if sst is None or wave_h is None or wind is None:
        return None

    if sst < 15 or wave_h > 1.5 or wind > 50:
        return "red"
    if sst < 18 or wave_h > 0.8 or wind > 30:
        return "orange"
    return "green"


# ---------------------------------------------------------------------------
# Builder + cache
# ---------------------------------------------------------------------------

def _build_payload(commune: Commune) -> dict[str, Any]:
    if commune.location is None:
        raise ValueError(f"Commune {commune.slug} sans coordonnées (location=NULL)")

    lng, lat = commune.location.x, commune.location.y

    forecast_raw = fetch_forecast(lat, lng)
    forecast = normalize_forecast(forecast_raw)

    marine: dict[str, Any] | None = None
    if commune.is_coastal:
        try:
            marine_raw = fetch_marine(lat, lng)
            marine = normalize_marine(marine_raw)
            marine["swimming_indicator"] = compute_swimming_indicator(
                forecast["current"],
                marine["current"],
                marine["sea_surface_temperature"],
            )
            marine["swimming_disclaimer"] = SWIMMING_DISCLAIMER
        except requests.RequestException as exc:
            logger.warning("Marine API failed for %s: %s", commune.slug, exc)
            marine = None

    return {
        "commune": {
            "slug": commune.slug,
            "name": commune.name,
            "is_coastal": commune.is_coastal,
            "latitude": lat,
            "longitude": lng,
        },
        "fetched_at": datetime.now(UTC).isoformat(),
        "forecast": forecast,
        "marine": marine,
    }


def _cache_keys(slug: str) -> tuple[str, str]:
    return f"weather:{slug}", f"weather:{slug}:stale"


def get_or_fetch_weather(commune: Commune) -> tuple[dict[str, Any], str]:
    """Renvoie (payload, source) avec source ∈ {"cache", "fresh", "stale"}.

    - "cache" : moins de 15 min, servi depuis Redis
    - "fresh" : appel Open-Meteo réussi, mis en cache
    - "stale" : Open-Meteo a échoué, on sert la dernière copie connue (< 24 h)
    """
    fresh_key, stale_key = _cache_keys(commune.slug)

    cached = cache.get(fresh_key)
    if cached is not None:
        return cached, "cache"

    try:
        payload = _build_payload(commune)
    except requests.RequestException as exc:
        logger.error("Open-Meteo forecast failed for %s: %s", commune.slug, exc)
        stale = cache.get(stale_key)
        if stale is not None:
            return stale, "stale"
        raise

    cache.set(fresh_key, payload, CACHE_TTL_FRESH)
    cache.set(stale_key, payload, CACHE_TTL_STALE)
    return payload, "fresh"


def prefetch_commune(commune: Commune) -> dict[str, Any] | None:
    """Force-refresh utilisé par la tâche Celery beat — bypass le cache fresh."""
    fresh_key, stale_key = _cache_keys(commune.slug)
    try:
        payload = _build_payload(commune)
    except requests.RequestException as exc:
        logger.warning("Prefetch failed for %s: %s", commune.slug, exc)
        return None
    cache.set(fresh_key, payload, CACHE_TTL_FRESH)
    cache.set(stale_key, payload, CACHE_TTL_STALE)
    return payload

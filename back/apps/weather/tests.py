"""Tests unitaires de la logique météo (sans DB ni HTTP réel)."""
from __future__ import annotations

from apps.weather.services import (
    compute_swimming_indicator,
    normalize_forecast,
    normalize_marine,
)

# ---------------------------------------------------------------------------
# compute_swimming_indicator
# ---------------------------------------------------------------------------

class TestSwimmingIndicator:
    def test_green_calm_summer(self):
        forecast = {"wind_speed": 15}
        marine = {"wave_height": 0.4}
        assert compute_swimming_indicator(forecast, marine, sea_surface_temperature=22.0) == "green"

    def test_orange_chilly_water(self):
        forecast = {"wind_speed": 15}
        marine = {"wave_height": 0.4}
        assert compute_swimming_indicator(forecast, marine, sea_surface_temperature=16.5) == "orange"

    def test_orange_choppy_waves(self):
        forecast = {"wind_speed": 15}
        marine = {"wave_height": 1.0}
        assert compute_swimming_indicator(forecast, marine, sea_surface_temperature=22.0) == "orange"

    def test_orange_strong_wind(self):
        forecast = {"wind_speed": 35}
        marine = {"wave_height": 0.4}
        assert compute_swimming_indicator(forecast, marine, sea_surface_temperature=22.0) == "orange"

    def test_red_storm_conditions(self):
        forecast = {"wind_speed": 60}
        marine = {"wave_height": 2.0}
        assert compute_swimming_indicator(forecast, marine, sea_surface_temperature=14.0) == "red"

    def test_red_only_wave_threshold(self):
        forecast = {"wind_speed": 15}
        marine = {"wave_height": 1.8}
        assert compute_swimming_indicator(forecast, marine, sea_surface_temperature=22.0) == "red"

    def test_none_when_data_missing(self):
        assert compute_swimming_indicator({"wind_speed": None}, {"wave_height": 0.5}, 22.0) is None
        assert compute_swimming_indicator({"wind_speed": 15}, {"wave_height": None}, 22.0) is None
        assert compute_swimming_indicator({"wind_speed": 15}, {"wave_height": 0.5}, None) is None


# ---------------------------------------------------------------------------
# normalize_forecast
# ---------------------------------------------------------------------------

def test_normalize_forecast_basic():
    raw = {
        "current": {
            "temperature_2m": 18.5,
            "apparent_temperature": 17.2,
            "relative_humidity_2m": 65,
            "precipitation": 0,
            "weather_code": 1,
            "wind_speed_10m": 22.3,
            "wind_direction_10m": 180,
            "wind_gusts_10m": 35.1,
            "is_day": 1,
            "uv_index": 4.2,
        },
        "hourly": {
            "time": ["2026-05-05T14:00", "2026-05-05T15:00"],
            "temperature_2m": [18.5, 19.0],
            "precipitation_probability": [10, 15],
            "precipitation": [0, 0.2],
            "weather_code": [1, 2],
            "wind_speed_10m": [22.3, 24.0],
        },
        "daily": {
            "time": ["2026-05-05", "2026-05-06"],
            "weather_code": [1, 3],
            "temperature_2m_max": [22.0, 24.0],
            "temperature_2m_min": [14.0, 15.0],
            "sunrise": ["2026-05-05T06:30", "2026-05-06T06:29"],
            "sunset": ["2026-05-05T20:50", "2026-05-06T20:51"],
            "uv_index_max": [6.0, 7.0],
            "precipitation_sum": [0, 1.2],
            "precipitation_probability_max": [20, 50],
            "wind_speed_10m_max": [30.0, 35.0],
            "wind_gusts_10m_max": [50.0, 55.0],
            "wind_direction_10m_dominant": [180, 200],
        },
    }
    result = normalize_forecast(raw)

    assert result["current"]["temperature"] == 18.5
    assert result["current"]["is_day"] is True
    assert result["current"]["wind_gusts"] == 35.1

    assert len(result["hourly"]) == 2
    assert result["hourly"][0]["time"] == "2026-05-05T14:00"
    assert result["hourly"][1]["temperature"] == 19.0

    assert len(result["daily"]) == 2
    assert result["daily"][0]["temperature_min"] == 14.0
    assert result["daily"][1]["wind_direction_dominant"] == 200


def test_normalize_forecast_handles_missing_keys():
    """Si Open-Meteo renvoie un payload partiel, on ne crash pas."""
    result = normalize_forecast({})
    assert result["current"]["temperature"] is None
    assert result["hourly"] == []
    assert result["daily"] == []


# ---------------------------------------------------------------------------
# normalize_marine
# ---------------------------------------------------------------------------

def test_normalize_marine_basic():
    raw = {
        "current": {
            "wave_height": 0.6,
            "wave_direction": 180,
            "wave_period": 4.5,
            "wind_wave_height": 0.4,
            "swell_wave_height": 0.3,
            "swell_wave_period": 8.0,
        },
        "hourly": {
            "time": ["2026-05-05T14:00", "2026-05-05T15:00"],
            "wave_height": [0.6, 0.7],
            "wave_direction": [180, 185],
            "wave_period": [4.5, 4.6],
            "sea_surface_temperature": [19.5, 19.6],
        },
        "daily": {
            "time": ["2026-05-05", "2026-05-06"],
            "wave_height_max": [0.8, 1.0],
            "wave_direction_dominant": [180, 200],
            "wave_period_max": [4.8, 5.0],
        },
    }
    result = normalize_marine(raw)

    assert result["current"]["wave_height"] == 0.6
    assert result["sea_surface_temperature"] == 19.5
    assert len(result["daily"]) == 2
    assert result["daily"][1]["wave_height_max"] == 1.0


def test_normalize_marine_picks_first_non_null_sst():
    raw = {
        "current": {},
        "hourly": {
            "time": ["2026-05-05T14:00", "2026-05-05T15:00", "2026-05-05T16:00"],
            "sea_surface_temperature": [None, None, 18.4],
        },
        "daily": {},
    }
    result = normalize_marine(raw)
    assert result["sea_surface_temperature"] == 18.4

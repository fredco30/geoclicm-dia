from django.urls import path

from .views import WeatherView

app_name = "weather"

urlpatterns = [
    path("weather/<slug:commune_slug>/", WeatherView.as_view(), name="commune-weather"),
]

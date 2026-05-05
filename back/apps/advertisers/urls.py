from django.urls import path

from . import views

app_name = "advertisers"

urlpatterns = [
    path("advertiser/checkout/", views.checkout_create, name="checkout-create"),
    path("advertiser/portal/", views.portal_create, name="portal-create"),
]

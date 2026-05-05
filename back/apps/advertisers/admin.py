"""Admin Django pour advertisers — visualisation des abonnements et factures."""
from django.contrib import admin

from .models import Invoice, Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = (
        "business", "plan", "status",
        "started_at", "current_period_end",
        "amount",
    )
    list_filter = ("status", "plan")
    search_fields = ("business__name", "stripe_subscription_id")
    raw_id_fields = ("business",)
    readonly_fields = (
        "stripe_subscription_id", "started_at",
        "current_period_start", "current_period_end",
        "cancelled_at", "created_at", "updated_at",
    )
    date_hierarchy = "started_at"


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = (
        "invoice_number", "business",
        "amount_ttc", "issued_at", "paid_at",
    )
    list_filter = ("issued_at", "paid_at")
    search_fields = ("invoice_number", "business__name", "stripe_invoice_id")
    raw_id_fields = ("business",)
    readonly_fields = (
        "stripe_invoice_id", "amount_ht", "tva_amount", "amount_ttc",
        "issued_at", "paid_at", "pdf_file",
        "created_at", "updated_at",
    )
    date_hierarchy = "issued_at"

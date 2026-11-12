from django.urls import path

from .recovery import RecoveryCompleteView, RecoveryConfirmView, RecoverySentView, RecoveryView

urlpatterns = [
    path("recovery/", RecoveryView.as_view(), name="recovery-request"),
    path("recovery/sent/", RecoverySentView.as_view(), name="recovery-sent"),
    path("reset/<uidb64>/<token>/", RecoveryConfirmView.as_view(), name="recovery-confirm"),
    path("reset/complete/", RecoveryCompleteView.as_view(), name="recovery-complete"),
]

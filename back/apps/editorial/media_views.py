"""
ViewSet pour le back-office : upload de médias (images).

POST /api/media/  (multipart, auth requise + role editor/admin)
GET  /api/media/  (listing pour réutilisation gallery)
"""
from __future__ import annotations

from rest_framework import serializers, viewsets
from rest_framework.parsers import FormParser, MultiPartParser

from apps.core.models import Media

from .permissions import IsEditorOrAdmin
from .serializers import ImageVariantsField


class MediaWriteSerializer(serializers.ModelSerializer):
    """Serializer pour upload et liste back-office."""

    file_url = ImageVariantsField(source="file", read_only=True)

    class Meta:
        model = Media
        fields = (
            "id", "file", "file_url", "title", "alt_text", "caption", "credit",
            "taken_at", "uploaded_by", "created_at",
        )
        read_only_fields = ("id", "file_url", "uploaded_by", "created_at")
        extra_kwargs = {
            "file": {"write_only": True, "required": True},
        }


class MediaViewSet(viewsets.ModelViewSet):
    """
    /api/media/        — list/create (auth editor/admin)
    /api/media/<id>/   — retrieve/update/delete

    Le signal post_save sur Media génère automatiquement les 3 versions WebP.
    """

    queryset = Media.objects.select_related("uploaded_by").order_by("-created_at")
    serializer_class = MediaWriteSerializer
    permission_classes = (IsEditorOrAdmin,)
    parser_classes = (MultiPartParser, FormParser)

    def perform_create(self, serializer):
        serializer.save(uploaded_by=self.request.user)

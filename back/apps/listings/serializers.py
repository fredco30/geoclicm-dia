from rest_framework import serializers

from .models import Listing, ListingCategory, ListingImportCandidate


class ListingCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingCategory
        fields = ("id", "name", "slug", "description", "icon", "sort_order", "is_active")
        read_only_fields = ("id",)
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}


class ListingListSerializer(serializers.ModelSerializer):
    category = ListingCategorySerializer(read_only=True)
    commune_name = serializers.CharField(source="commune.name", read_only=True, default=None)

    class Meta:
        model = Listing
        fields = (
            "id", "title", "slug", "short_description",
            "category", "commune", "commune_name", "locality",
            "employer_or_agency", "contract_type", "price",
            "published_at", "expires_at", "status",
        )


class ListingDetailSerializer(ListingListSerializer):
    class Meta(ListingListSerializer.Meta):
        fields = ListingListSerializer.Meta.fields + (
            "description", "address",
            "contact_email", "contact_phone", "application_url", "source_url",
            "created_at", "updated_at",
        )


class ListingWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Listing
        fields = (
            "id", "title", "slug", "short_description", "description",
            "category", "commune", "locality", "address",
            "employer_or_agency", "contract_type", "price",
            "contact_email", "contact_phone", "application_url", "source_url",
            "status", "published_at", "expires_at",
        )
        read_only_fields = ("id",)
        extra_kwargs = {"slug": {"required": False, "allow_blank": True}}


class ListingImportCandidateSerializer(serializers.ModelSerializer):
    crawl_source_label = serializers.CharField(source="crawl_source.label", read_only=True)
    commune_name = serializers.CharField(source="commune.name", read_only=True, default=None)
    category_name = serializers.CharField(source="category.name", read_only=True, default=None)
    matched_listing_slug = serializers.CharField(
        source="matched_listing.slug",
        read_only=True,
        default=None,
    )
    extraction_evidence = serializers.SerializerMethodField()

    class Meta:
        model = ListingImportCandidate
        fields = (
            "id", "crawl_source", "crawl_source_label", "source_uid",
            "extraction_method", "source_url",
            "title", "short_description", "description",
            "address", "locality",
            "employer_or_agency", "contract_type", "price",
            "contact_email", "contact_phone", "application_url",
            "published_on_source_at", "expires_at",
            "commune", "commune_name", "category", "category_name",
            "status", "validation_errors", "extraction_evidence",
            "matched_listing_slug", "first_seen_at", "last_seen_at",
        )
        read_only_fields = (
            "id", "crawl_source", "source_uid", "extraction_method", "source_url",
            "status", "validation_errors", "extraction_evidence",
            "matched_listing_slug", "first_seen_at", "last_seen_at",
        )

    def get_extraction_evidence(self, obj):
        payload = obj.raw_payload or {}
        evidence = payload.get("verified_evidence") or []
        return [str(item) for item in evidence if item]

# Data migration : corrige le slug genere par slugify("Offres d'emploi")
# ("offres-demploi", apostrophe retiree) vers le slug fige attendu par le front
# et les hints IA ("offres-d-emploi").
from django.db import migrations


def fix_slug(apps, schema_editor):
    ListingCategory = apps.get_model("listings", "ListingCategory")
    ListingCategory.objects.filter(slug="offres-demploi").update(
        slug="offres-d-emploi"
    )


def revert_slug(apps, schema_editor):
    ListingCategory = apps.get_model("listings", "ListingCategory")
    ListingCategory.objects.filter(slug="offres-d-emploi").update(
        slug="offres-demploi"
    )


class Migration(migrations.Migration):

    dependencies = [
        ("listings", "0002_alter_listing_application_url_and_more"),
    ]

    operations = [
        migrations.RunPython(fix_slug, revert_slug),
    ]

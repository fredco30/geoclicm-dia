from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("listings", "0004_fix_french_labels")]
    operations = [migrations.AlterField(
        model_name="listingimportcandidate", name="status",
        field=models.CharField(max_length=20, db_index=True, default="pending", choices=[
            ("pending", "À vérifier"), ("imported", "Importée"),
            ("rejected", "Rejetée"), ("duplicate", "Doublon"),
            ("invalid", "Incomplète"), ("expired", "Expirée"),
            ("needs_review", "Actualité à confirmer"),
        ]),
    )]

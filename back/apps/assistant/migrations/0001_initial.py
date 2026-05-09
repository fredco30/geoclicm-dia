"""
Migration initiale assistant — active l'extension pgvector côté Postgres
puis crée les 4 tables KnowledgeChunk, AssistantConversation,
AssistantMessage, CrawlSource.

Prérequis côté serveur : extension pgvector installée sur le PostgreSQL.
Sur Ubuntu : `sudo apt install postgresql-17-pgvector` puis
`CREATE EXTENSION vector;` dans la base. La migration ci-dessous fait
le CREATE EXTENSION mais ne peut pas installer le paquet système.
"""
from django.db import migrations, models
import django.db.models.deletion
import pgvector.django


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("core", "0003_commune_is_coastal_and_seed"),
    ]

    operations = [
        # Active l'extension pgvector dans la base. Idempotent grâce au
        # IF NOT EXISTS de Postgres.
        pgvector.django.VectorExtension(),

        migrations.CreateModel(
            name="KnowledgeChunk",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "source_kind",
                    models.CharField(
                        choices=[
                            ("business", "Fiche commerçant"),
                            ("article", "Article éditorial"),
                            ("mairie", "Site mairie"),
                            ("ot", "Office de tourisme"),
                            ("wikipedia", "Wikipedia"),
                            ("datatourisme", "DataTourisme"),
                            ("osm", "OpenStreetMap (POI)"),
                            ("tile", "Tuile (orientation)"),
                        ],
                        db_index=True,
                        max_length=20,
                    ),
                ),
                (
                    "source_id",
                    models.CharField(
                        db_index=True,
                        help_text=(
                            "Identifiant unique au sein de source_kind. Ex: slug d'article, "
                            "slug de business, hash d'URL crawlée."
                        ),
                        max_length=200,
                    ),
                ),
                (
                    "source_url",
                    models.URLField(
                        blank=True,
                        help_text="URL d'origine pour citer la source dans la réponse.",
                    ),
                ),
                (
                    "title",
                    models.CharField(
                        help_text="Titre court affiché dans la liste des sources citées.",
                        max_length=300,
                    ),
                ),
                ("content", models.TextField(help_text="Texte indexé.")),
                (
                    "embedding",
                    pgvector.django.VectorField(
                        blank=True,
                        dimensions=1024,
                        help_text=(
                            "Vecteur Mistral 1024 dims. NULL tant que "
                            "l'indexation n'a pas eu lieu (race condition possible)."
                        ),
                        null=True,
                    ),
                ),
                (
                    "is_premium",
                    models.BooleanField(
                        db_index=True,
                        default=False,
                        help_text=(
                            "True si le chunk vient d'une fiche Business avec plan basic/"
                            "premium — déclenche le boost dans le retrieval et la mention "
                            "« ⭐ Partenaire » dans la réponse de l'assistant."
                        ),
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(
                        db_index=True,
                        default=True,
                        help_text="Désactivable pour exclure temporairement de la recherche.",
                    ),
                ),
                ("indexed_at", models.DateTimeField(auto_now=True)),
                (
                    "commune",
                    models.ForeignKey(
                        blank=True,
                        help_text=(
                            "Commune attachée si le chunk est territorialement délimité. "
                            "Permet de filtrer la recherche sémantique par commune."
                        ),
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="knowledge_chunks",
                        to="core.commune",
                    ),
                ),
            ],
            options={
                "verbose_name": "Chunk indexé",
                "verbose_name_plural": "Chunks indexés",
                "ordering": ["-indexed_at"],
            },
        ),
        migrations.AddIndex(
            model_name="knowledgechunk",
            index=models.Index(
                fields=["source_kind", "is_active"],
                name="kc_kind_active_idx",
            ),
        ),
        migrations.AddIndex(
            model_name="knowledgechunk",
            index=models.Index(
                fields=["commune", "is_active"],
                name="kc_commune_active_idx",
            ),
        ),
        migrations.AddConstraint(
            model_name="knowledgechunk",
            constraint=models.UniqueConstraint(
                fields=("source_kind", "source_id"),
                name="kc_unique_source",
            ),
        ),

        migrations.CreateModel(
            name="AssistantConversation",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("session_id", models.CharField(db_index=True, max_length=64)),
                (
                    "language",
                    models.CharField(
                        default="fr",
                        help_text="Code ISO 639-1 (fr, en, de, it, es, nl).",
                        max_length=5,
                    ),
                ),
                ("started_at", models.DateTimeField(auto_now_add=True)),
                ("last_message_at", models.DateTimeField(auto_now=True)),
                ("message_count", models.PositiveIntegerField(default=0)),
            ],
            options={
                "verbose_name": "Conversation assistant",
                "verbose_name_plural": "Conversations assistant",
                "ordering": ["-last_message_at"],
            },
        ),
        migrations.AddIndex(
            model_name="assistantconversation",
            index=models.Index(
                fields=["session_id", "-last_message_at"],
                name="ac_session_last_idx",
            ),
        ),

        migrations.CreateModel(
            name="AssistantMessage",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "role",
                    models.CharField(
                        choices=[("user", "Utilisateur"), ("assistant", "Assistant")],
                        max_length=20,
                    ),
                ),
                ("content", models.TextField()),
                (
                    "citations",
                    models.JSONField(
                        blank=True,
                        default=list,
                        help_text=(
                            "Liste de {chunk_id, title, source_url, source_kind, "
                            "is_premium} pour les sources utilisées dans la réponse "
                            "(uniquement pour les messages assistant)."
                        ),
                    ),
                ),
                ("cost_tokens_in", models.PositiveIntegerField(default=0)),
                ("cost_tokens_out", models.PositiveIntegerField(default=0)),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, db_index=True),
                ),
                (
                    "conversation",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="messages",
                        to="assistant.assistantconversation",
                    ),
                ),
            ],
            options={
                "verbose_name": "Message assistant",
                "verbose_name_plural": "Messages assistant",
                "ordering": ["created_at"],
            },
        ),

        migrations.CreateModel(
            name="CrawlSource",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "label",
                    models.CharField(
                        help_text="Nom lisible, ex: « Mairie Le Grau-du-Roi ».",
                        max_length=120,
                    ),
                ),
                (
                    "kind",
                    models.CharField(
                        choices=[
                            ("business", "Fiche commerçant"),
                            ("article", "Article éditorial"),
                            ("mairie", "Site mairie"),
                            ("ot", "Office de tourisme"),
                            ("wikipedia", "Wikipedia"),
                            ("datatourisme", "DataTourisme"),
                            ("osm", "OpenStreetMap (POI)"),
                            ("tile", "Tuile (orientation)"),
                        ],
                        help_text="Type qui sera assigné aux KnowledgeChunk produits.",
                        max_length=20,
                    ),
                ),
                ("seed_url", models.URLField(help_text="URL racine à crawler.")),
                (
                    "max_depth",
                    models.PositiveSmallIntegerField(
                        default=2,
                        help_text="Profondeur maximum du crawl en partant de seed_url.",
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(db_index=True, default=True),
                ),
                ("last_crawled_at", models.DateTimeField(blank=True, null=True)),
                (
                    "last_status",
                    models.CharField(
                        blank=True,
                        help_text="ok / error / partial — sortie du dernier crawl.",
                        max_length=20,
                    ),
                ),
                (
                    "last_error",
                    models.TextField(
                        blank=True,
                        help_text="Détail de l'erreur si last_status=error/partial.",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "commune",
                    models.ForeignKey(
                        blank=True,
                        help_text="Commune attachée aux chunks produits (si applicable).",
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="crawl_sources",
                        to="core.commune",
                    ),
                ),
            ],
            options={
                "verbose_name": "Source à crawler",
                "verbose_name_plural": "Sources à crawler",
                "ordering": ["kind", "label"],
            },
        ),
    ]

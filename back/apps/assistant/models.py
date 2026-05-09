"""
Modèles de l'assistant IA — RAG (Retrieval Augmented Generation) avec
Mistral AI et pgvector.

Vue d'ensemble :
- KnowledgeChunk : un fragment de contenu indexé (article, fiche commerce,
  page mairie crawlée, page Wikipedia, POI OSM…). Stocke le texte et son
  embedding vectoriel pour la recherche sémantique.
- AssistantConversation : une session de chat (anonyme, identifiée par
  cookie session_id). Permet de garder le fil sur quelques messages.
- AssistantMessage : un message dans une conversation (user ou assistant).
  Trace les tokens consommés pour suivre les coûts.
- CrawlSource : configuration des sources externes à crawler
  périodiquement (mairies, OT, Wikipedia, etc.) — utilisée par les
  indexers Celery (PR 6).

Embeddings : Mistral `mistral-embed` produit des vecteurs de 1024 dims.
Si on change de provider plus tard (ex: OpenAI text-embedding-3-small =
1536 dims), il faudra réindexer.
"""
from __future__ import annotations

from django.db import models
from pgvector.django import VectorField

from apps.core.models import Commune


# Dimensions de l'embedding Mistral. Si on change de modèle plus tard,
# ajuster cette constante ET réindexer toute la base.
EMBEDDING_DIMENSIONS = 1024


class KnowledgeChunk(models.Model):
    """
    Fragment de contenu indexé pour le RAG.

    Un même article ou une même page mairie peut générer plusieurs chunks
    (typiquement un par section). source_id et source_url permettent de
    citer la source dans la réponse de l'assistant.
    """

    class SourceKind(models.TextChoices):
        BUSINESS = "business", "Fiche commerçant"
        ARTICLE = "article", "Article éditorial"
        MAIRIE = "mairie", "Site mairie"
        OFFICE_TOURISME = "ot", "Office de tourisme"
        WIKIPEDIA = "wikipedia", "Wikipedia"
        DATATOURISME = "datatourisme", "DataTourisme"
        OSM = "osm", "OpenStreetMap (POI)"
        TILE = "tile", "Tuile (orientation)"

    source_kind = models.CharField(
        max_length=20,
        choices=SourceKind.choices,
        db_index=True,
    )
    source_id = models.CharField(
        max_length=200,
        db_index=True,
        help_text=(
            "Identifiant unique au sein de source_kind. Ex: slug d'article, "
            "slug de business, hash d'URL crawlée."
        ),
    )
    source_url = models.URLField(
        blank=True,
        help_text="URL d'origine pour citer la source dans la réponse.",
    )
    title = models.CharField(
        max_length=300,
        help_text="Titre court affiché dans la liste des sources citées.",
    )
    content = models.TextField(help_text="Texte indexé.")

    embedding = VectorField(
        dimensions=EMBEDDING_DIMENSIONS,
        null=True,
        blank=True,
        help_text=(
            f"Vecteur Mistral {EMBEDDING_DIMENSIONS} dims. NULL tant que "
            "l'indexation n'a pas eu lieu (race condition possible)."
        ),
    )

    commune = models.ForeignKey(
        Commune,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="knowledge_chunks",
        help_text=(
            "Commune attachée si le chunk est territorialement délimité. "
            "Permet de filtrer la recherche sémantique par commune."
        ),
    )
    is_premium = models.BooleanField(
        default=False,
        db_index=True,
        help_text=(
            "True si le chunk vient d'une fiche Business avec plan basic/"
            "premium — déclenche le boost dans le retrieval et la mention "
            "« ⭐ Partenaire » dans la réponse de l'assistant."
        ),
    )
    # Coordonnées GPS pour générer des deep-links Google Maps / Waze côté
    # widget d'assistant. Renseignées par les indexers OSM (Overpass renvoie
    # lat/lng) et Business (PointField). NULL pour les chunks textuels
    # (mairies/OT crawlés, articles sans location, Wikipedia générique).
    latitude = models.DecimalField(
        max_digits=10, decimal_places=7, null=True, blank=True,
        help_text="Latitude WGS84. Active les boutons Maps/Waze côté widget.",
    )
    longitude = models.DecimalField(
        max_digits=10, decimal_places=7, null=True, blank=True,
        help_text="Longitude WGS84. Active les boutons Maps/Waze côté widget.",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Désactivable pour exclure temporairement de la recherche.",
    )
    indexed_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Chunk indexé"
        verbose_name_plural = "Chunks indexés"
        ordering = ["-indexed_at"]
        indexes = [
            models.Index(
                fields=["source_kind", "is_active"],
                name="kc_kind_active_idx",
            ),
            models.Index(
                fields=["commune", "is_active"],
                name="kc_commune_active_idx",
            ),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["source_kind", "source_id"],
                name="kc_unique_source",
            ),
        ]

    def __str__(self) -> str:
        return f"[{self.source_kind}] {self.title[:60]}"


class AssistantConversation(models.Model):
    """Une session de chat anonyme, identifiée par un session_id côté client.

    Le session_id est généré côté front (UUID) et stocké en localStorage.
    Pas d'authentification utilisateur — l'assistant est public.
    """

    session_id = models.CharField(max_length=64, db_index=True)
    language = models.CharField(
        max_length=5,
        default="fr",
        help_text="Code ISO 639-1 (fr, en, de, it, es, nl).",
    )
    started_at = models.DateTimeField(auto_now_add=True)
    last_message_at = models.DateTimeField(auto_now=True)
    message_count = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Conversation assistant"
        verbose_name_plural = "Conversations assistant"
        ordering = ["-last_message_at"]
        indexes = [
            models.Index(
                fields=["session_id", "-last_message_at"],
                name="ac_session_last_idx",
            ),
        ]

    def __str__(self) -> str:
        return f"Conv {self.session_id[:8]} ({self.message_count} msg)"


class AssistantMessage(models.Model):
    """Un message dans une conversation."""

    class Role(models.TextChoices):
        USER = "user", "Utilisateur"
        ASSISTANT = "assistant", "Assistant"

    conversation = models.ForeignKey(
        AssistantConversation,
        on_delete=models.CASCADE,
        related_name="messages",
    )
    role = models.CharField(max_length=20, choices=Role.choices)
    content = models.TextField()
    citations = models.JSONField(
        default=list,
        blank=True,
        help_text=(
            "Liste de {chunk_id, title, source_url, source_kind, "
            "is_premium} pour les sources utilisées dans la réponse "
            "(uniquement pour les messages assistant)."
        ),
    )
    cost_tokens_in = models.PositiveIntegerField(default=0)
    cost_tokens_out = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = "Message assistant"
        verbose_name_plural = "Messages assistant"
        ordering = ["created_at"]

    def __str__(self) -> str:
        prefix = "👤" if self.role == self.Role.USER else "🤖"
        return f"{prefix} {self.content[:80]}"


class CrawlSource(models.Model):
    """
    Source externe à crawler périodiquement pour enrichir l'index.

    Configurée par l'admin. Les indexers Celery (PR 6) lisent cette table
    au démarrage de chaque cycle.
    """

    label = models.CharField(
        max_length=120,
        help_text="Nom lisible, ex: « Mairie Le Grau-du-Roi ».",
    )
    kind = models.CharField(
        max_length=20,
        choices=KnowledgeChunk.SourceKind.choices,
        help_text="Type qui sera assigné aux KnowledgeChunk produits.",
    )
    seed_url = models.URLField(help_text="URL racine à crawler.")
    commune = models.ForeignKey(
        Commune,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="crawl_sources",
        help_text="Commune attachée aux chunks produits (si applicable).",
    )
    max_depth = models.PositiveSmallIntegerField(
        default=2,
        help_text="Profondeur maximum du crawl en partant de seed_url.",
    )
    is_active = models.BooleanField(default=True, db_index=True)
    last_crawled_at = models.DateTimeField(null=True, blank=True)
    last_status = models.CharField(
        max_length=20,
        blank=True,
        help_text="ok / error / partial — sortie du dernier crawl.",
    )
    last_error = models.TextField(
        blank=True,
        help_text="Détail de l'erreur si last_status=error/partial.",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Source à crawler"
        verbose_name_plural = "Sources à crawler"
        ordering = ["kind", "label"]

    def __str__(self) -> str:
        return f"{self.label} [{self.kind}]"

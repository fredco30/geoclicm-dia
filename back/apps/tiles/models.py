"""
Modèle Tile — tuile thématique de la grille d'accueil.

Une tuile peut être :
- une racine (parent=null) affichée directement sur la home / page commune
- ou une sous-tuile (parent=tuile racine) affichée quand on clique sur la
  racine

Le `kind` détermine l'action au clic :
- internal_route : redirige vers une route Next.js du site (ex: /agenda)
- external_url   : ouvre une URL externe dans un nouvel onglet (ex: site
                   officiel d'une mairie)
- module         : route câblée en dur sur un écran existant (Actualités,
                   Météo, Commerçants) — module_key détermine lequel

`visible_on_communes` filtre la tuile : si vide, elle apparaît partout ;
sinon elle n'apparaît que sur les pages des communes listées.
"""
from __future__ import annotations

from django.db import models

from apps.core.models import Commune


class Tile(models.Model):
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="children",
        help_text="Tuile parente (null = tuile racine sur la home).",
    )

    label = models.CharField(
        max_length=120,
        help_text="Texte affiché sur la tuile (FR uniquement en V1).",
    )
    icon = models.CharField(
        max_length=60,
        blank=True,
        help_text="Nom d'icône Lucide (ex: 'Newspaper', 'Calendar', 'Store').",
    )

    class ColorPreset(models.TextChoices):
        CAMARGUE = "camargue", "Bleu camargue"
        SEL = "sel", "Sel (sable clair)"
        TERRE = "terre", "Terre cuite"
        MER = "mer", "Mer (cyan)"
        AGRUME = "agrume", "Agrume (orange)"
        OLIVE = "olive", "Olive (vert)"
        NEUTRE = "neutre", "Neutre (gris)"

    color = models.CharField(
        max_length=20,
        choices=ColorPreset.choices,
        default=ColorPreset.CAMARGUE,
        help_text="Couleur de fond de la tuile (preset).",
    )
    cover_image = models.ImageField(
        upload_to="tiles/",
        null=True,
        blank=True,
        help_text=(
            "Image de fond de la tuile (optionnelle). Si renseignée, "
            "remplace la couleur preset."
        ),
    )

    class Kind(models.TextChoices):
        INTERNAL_ROUTE = "internal_route", "Lien interne"
        EXTERNAL_URL = "external_url", "Lien externe"
        MODULE = "module", "Module spécial"

    kind = models.CharField(
        max_length=20,
        choices=Kind.choices,
        default=Kind.INTERNAL_ROUTE,
        help_text="Type d'action au clic.",
    )

    internal_path = models.CharField(
        max_length=200,
        blank=True,
        help_text="Chemin interne, ex: '/agenda' (utilisé si kind=internal_route).",
    )
    external_url = models.URLField(
        blank=True,
        help_text="URL externe (utilisé si kind=external_url).",
    )

    class ModuleKey(models.TextChoices):
        NEWS = "news", "Actualités (articles)"
        WEATHER = "weather", "Météo & mer"
        BUSINESSES = "businesses", "Commerçants"

    module_key = models.CharField(
        max_length=20,
        choices=ModuleKey.choices,
        blank=True,
        help_text="Module câblé (utilisé si kind=module).",
    )

    sort_order = models.PositiveIntegerField(
        default=0,
        db_index=True,
        help_text="Ordre d'affichage croissant (0 = premier).",
    )
    is_active = models.BooleanField(
        default=True,
        db_index=True,
        help_text="Si décoché, la tuile est masquée du site.",
    )
    show_on_home = models.BooleanField(
        default=True,
        help_text=(
            "Si coché, la tuile apparaît sur la home globale "
            "(sinon uniquement sur les pages commune si renseignées)."
        ),
    )
    visible_on_communes = models.ManyToManyField(
        Commune,
        related_name="tiles",
        blank=True,
        help_text=(
            "Communes où la tuile est visible. Vide = toutes (page home + "
            "toutes les pages commune)."
        ),
    )

    span_2x = models.BooleanField(
        default=False,
        help_text="Tuile large (occupe 2 colonnes dans la grille).",
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Tuile"
        verbose_name_plural = "Tuiles"
        ordering = ["sort_order", "label"]
        indexes = [
            models.Index(
                fields=["parent", "sort_order"],
                name="tiles_parent_sort_idx",
            ),
            models.Index(
                fields=["is_active", "show_on_home"],
                name="tiles_active_home_idx",
            ),
        ]

    def __str__(self) -> str:
        if self.parent_id:
            return f"{self.parent.label} > {self.label}"
        return self.label

    @property
    def is_root(self) -> bool:
        """True si tuile racine (sans parent)."""
        return self.parent_id is None

    @property
    def has_children(self) -> bool:
        """True si la tuile a des sous-tuiles actives."""
        if not self.pk:
            return False
        return self.children.filter(is_active=True).exists()

    @property
    def target_url(self) -> str:
        """URL de destination selon le kind. Vide pour les tuiles racine
        avec sous-tuiles (clic = ouvre la grille de sous-tuiles)."""
        if self.kind == self.Kind.INTERNAL_ROUTE:
            return self.internal_path or ""
        if self.kind == self.Kind.EXTERNAL_URL:
            return self.external_url or ""
        if self.kind == self.Kind.MODULE:
            module_paths = {
                self.ModuleKey.NEWS: "/articles",
                self.ModuleKey.WEATHER: "/meteo",
                self.ModuleKey.BUSINESSES: "/commerces",
            }
            return module_paths.get(self.module_key, "")
        return ""

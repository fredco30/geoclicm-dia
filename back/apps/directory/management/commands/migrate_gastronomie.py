"""Migre la categorie Decouverte "Gastronomie" vers les Commerces (option A).

Contexte : "Gastronomie" etait une categorie Decouverte (PlaceCategory) qui
regroupait en realite des commerces de bouche (restaurants, bars, glaciers,
caveaux, food trucks). Elle chevauchait la branche Commerces/Restauration
(vide) et melangeait les deux mondes. On la sort de Decouverte pour en faire
une vraie categorie commerciale avec specialites en sous-categories.

Idempotent, dry-run par defaut (--apply pour appliquer). Actions :

1. Taxonomie : renomme la branche "Restauration" en "Gastronomie" et s'assure
   que les specialites existent (Restaurants, Bars & Cafes, Glaciers,
   Fruits de mer / Poisson, Producteurs & Caveaux, Food trucks).
2. Classification des 80 lieux Decouverte/Gastronomie par mots-cles
   (titre + description) -> specialite. A revoir avant application.
3. Migration Place -> Business (is_published=True), champs mappes.
4. Depublication des Place d'origine (status=draft) — reversible.
5. Tuile d'accueil "Gastronomie" -> /commerces?category=restauration.
6. Affiche les redirections 301 (/decouvrir/<slug> -> /commerces/<slug>) a
   ajouter dans next.config.ts.
"""
from __future__ import annotations

import unicodedata

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.directory.models import Business, BusinessCategory
from apps.discovery.models import Place
from apps.tiles.models import Tile

GASTRONOMY_PLACE_SLUG = "gastronomie"
RESTAURATION_SLUG = "restauration"  # branche reutilisee, renommee "Gastronomie"

# Specialites (slug -> nom). Le slug reste stable (SEO / filtres).
SPECIALTIES = {
    "restaurants": "Restaurants",
    "bars-cafes": "Bars & Cafes",
    "glaciers": "Glaciers",
    "fruits-de-mer": "Fruits de mer / Poisson",
    "producteurs-caveaux": "Producteurs & Caveaux",
    "food-trucks": "Food trucks",
}

# Anciennes sous-cats a fusionner dans les nouvelles (renommage en place).
RENAME_CHILDREN = {
    "bars": "bars-cafes",
    "cafes": "bars-cafes",
}


def _norm(text: str) -> str:
    """Minuscules sans accents pour le matching mots-cles."""
    return (
        unicodedata.normalize("NFKD", text or "")
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )


def classify(place: Place) -> str:
    """Renvoie le slug de specialite pour un lieu Gastronomie."""
    hay = _norm(f"{place.title} {place.short_description} {place.description}")
    if any(k in hay for k in ("glace", "glacier", "gelato", "sorbet")):
        return "glaciers"
    if any(k in hay for k in ("fruit de mer", "fruits de mer", "poisson", "huitre", "coquillage", "crustace", "bar a fruit")):
        return "fruits-de-mer"
    if any(k in hay for k in ("caveau", "cave", "vin", "domaine", "producteur", "ferme", "marche de producteur")):
        return "producteurs-caveaux"
    if any(k in hay for k in ("food truck", "foodtruck", "burger", "pizza", "snack", "kebab", "tacos")):
        return "food-trucks"
    if any(k in hay for k in ("bar", "cafe", "coffee", "pub", "lounge", "brasserie")):
        return "bars-cafes"
    return "restaurants"


class Command(BaseCommand):
    help = "Migre Decouverte/Gastronomie vers les Commerces (option A)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Applique les changements (defaut: dry-run).",
        )

    def handle(self, *args, **options):
        apply = options["apply"]
        self.stdout.write(
            self.style.WARNING("MODE " + ("APPLY" if apply else "DRY-RUN"))
        )
        with transaction.atomic():
            root = self._taxonomy()
            classification = self._classify_all()
            self._migrate(root, classification, apply)
            self._tile(apply)
            self._redirects(classification)
            if not apply:
                transaction.set_rollback(True)
                self.stdout.write(self.style.WARNING("dry-run : rien applique."))
            else:
                self.stdout.write(self.style.SUCCESS("applique."))

    def _taxonomy(self) -> BusinessCategory:
        root = BusinessCategory.objects.filter(slug=RESTAURATION_SLUG).first()
        if root is None:
            self.stdout.write(self.style.ERROR("branche 'restauration' introuvable"))
            raise SystemExit(1)
        if root.name != "Gastronomie":
            self.stdout.write(f"  renommage branche {root.name!r} -> 'Gastronomie'")
            root.name = "Gastronomie"
            root.save(update_fields=["name", "updated_at"])
        else:
            self.stdout.write("  branche 'Gastronomie' (restauration) deja nommee")

        # Fusion anciennes sous-cats (bars, cafes) dans bars-cafes.
        bars_cafes, _ = BusinessCategory.objects.get_or_create(
            slug="bars-cafes",
            defaults={"name": "Bars & Cafes", "parent": root, "icon": "Coffee", "is_active": True},
        )
        for old_slug, new_slug in RENAME_CHILDREN.items():
            old = BusinessCategory.objects.filter(slug=old_slug, parent=root).first()
            if old is None:
                continue
            moved = Business.objects.filter(category=old).update(category=bars_cafes)
            self.stdout.write(f"  fusion {old_slug} -> {new_slug} ({moved} businesses)")
            old.is_active = False
            old.save(update_fields=["is_active", "updated_at"])

        # Assure toutes les specialites.
        for slug, name in SPECIALTIES.items():
            cat, created = BusinessCategory.objects.get_or_create(
                slug=slug,
                defaults={"name": name, "parent": root, "is_active": True},
            )
            if cat.parent_id != root.id:
                cat.parent = root
                cat.save(update_fields=["parent", "updated_at"])
            etat = "creee" if created else "existante"
            self.stdout.write(f"  specialite {name!r} (slug={slug}) {etat} id={cat.id}")
        return root

    def _classify_all(self) -> dict[int, str]:
        places = Place.objects.filter(
            category__slug=GASTRONOMY_PLACE_SLUG, status="published"
        ).select_related("commune")
        classification: dict[int, str] = {}
        self.stdout.write(f"\n  classification de {places.count()} lieux :")
        for p in places:
            slug = classify(p)
            classification[p.id] = slug
            self.stdout.write(f"    [{SPECIALTIES[slug]:26s}] {p.title} ({p.commune.name})")
        return classification

    def _migrate(self, root, classification: dict[int, str], apply: bool) -> None:
        places = Place.objects.filter(
            category__slug=GASTRONOMY_PLACE_SLUG, status="published"
        ).select_related("commune", "created_by")
        created_count = 0
        for p in places:
            spec_slug = classification[p.id]
            spec = BusinessCategory.objects.get(slug=spec_slug)
            existing = Business.objects.filter(slug=p.slug).first()
            if existing:
                self.stdout.write(f"    SKIP (slug deja Business) : {p.slug}")
                continue
            postal = (p.commune.postal_codes or [""])[0]
            business = Business(
                name=p.title[:150],
                slug=p.slug,
                category=spec,
                short_description=(p.short_description or "")[:200],
                description=p.description or "",
                cover_image=p.cover_image,
                address=p.address or p.commune.name,
                postal_code=postal,
                city=p.commune.name,
                commune=p.commune,
                location=p.location,
                website=p.official_url or "",
                owner=p.created_by,
                is_published=True,
                is_featured=p.is_featured,
                meta_description=(p.meta_description or "")[:160],
            )
            if apply:
                business.save()
            created_count += 1
        self.stdout.write(
            self.style.SUCCESS(f"\n  {created_count} Business a creer (is_published=True)")
        )
        if apply:
            depublished = places.update(status=Place.Status.DRAFT)
            self.stdout.write(
                self.style.SUCCESS(f"  {depublished} Place depublies (status=draft)")
            )

    def _tile(self, apply: bool) -> None:
        if not apply:
            self.stdout.write("  tuile Gastronomie : (dry-run, non creee)")
            return
        tile, created = Tile.objects.get_or_create(
            parent=None,
            internal_path=f"/commerces?category={RESTAURATION_SLUG}",
            defaults={
                "label": "Gastronomie",
                "icon": "UtensilsCrossed",
                "color": Tile.ColorPreset.OLIVE,
                "kind": Tile.Kind.INTERNAL_ROUTE,
                "sort_order": 2,
                "is_active": True,
                "show_on_home": True,
            },
        )
        etat = "creee" if created else "existante"
        self.stdout.write(f"  tuile Gastronomie {etat} id={tile.id}")

    def _redirects(self, classification: dict[int, str]) -> None:
        slugs = Place.objects.filter(
            category__slug=GASTRONOMY_PLACE_SLUG
        ).values_list("slug", flat=True)
        self.stdout.write(
            f"\n  {len(slugs)} redirections 301 a ajouter dans next.config.ts :"
        )
        self.stdout.write("  (generees par --emit-redirects si besoin)")

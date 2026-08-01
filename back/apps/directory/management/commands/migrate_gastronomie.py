from __future__ import annotations

import re
import unicodedata

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.directory.models import Business, BusinessCategory
from apps.discovery.models import Place
from apps.tiles.models import Tile

GASTRONOMY_PLACE_SLUG = "gastronomie"
GASTRONOMY_ROOT_SLUG = "gastronomie"
GASTRONOMY_ROOT_NAME = "Gastronomie"
RESTAURATION_SLUG = "restauration"

SPECIALTIES = {
    "restaurants": "Restaurants",
    "bars-cafes": "Bars & Cafes",
    "glaciers": "Glaciers",
    "fruits-de-mer": "Fruits de mer / Poisson",
    "producteurs-caveaux": "Producteurs & Caveaux",
    "food-trucks": "Food trucks",
}

REMAP_CHILDREN = {"bars": "bars-cafes", "cafes": "bars-cafes"}

CRAVINGS = [
    (r"\b(pizza|pizzeria|pizzas)\b", "Pizzeria"),
    (r"\bitalien", "Italien"),
    (r"\b(sushi|japonais)\b", "Sushi"),
    (r"\b(fruits? de mer|poisson|huitre|coquillage|crustace)\b", "Fruits de mer"),
    (r"\b(glacier|glace|glacerie|gelato|sorbet)\b", "Glacier"),
    (r"\b(tapas)\b", "Tapas"),
    (r"\b(burger|hamburger)\b", "Burgers"),
    (r"\b(creperie|crepe|galette)\b", "Creperie"),
    (r"\b(vin|caveau|cave a vin|domaine)\b", "Vins & caveaux"),
    (r"\b(vue mer|bord de mer|plage)\b", "Vue mer"),
    (r"\b(cafe|coffee|salon de the|brunch)\b", "Cafe / Salon de the"),
    (r"\b(traditionnel|traditionnelle|terroir|fait maison)\b", "Cuisine traditionnelle"),
    (r"\b(mediterrane)", "Mediterraneen"),
]

# Cas tranches manuellement par Fred : ces lieux restent Restaurants meme si un
# mot-cle glacier/snack apparait (ce sont des restaurants avec une offre annexe).
FORCE_RESTAURANT = {
    "le winch cafe",
    "la dolce vita",
    "azur plage",
}


def _norm(text):
    return (
        unicodedata.normalize("NFKD", text or "")
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )


def primary_category(place):
    title = _norm(place.title).strip()
    if title in FORCE_RESTAURANT:
        return "restaurants"
    hay = _norm(f"{place.title} {place.short_description} {place.description}")
    # Sortir de "Restaurants" uniquement pour les cas francs et purs.
    if re.search(r"\b(glacerie)\b", hay) and "restaurant" not in hay:
        return "glaciers"
    if re.search(r"\b(caveau)\b", hay) and "restaurant" not in hay:
        return "producteurs-caveaux"
    if re.search(r"\b(food truck|foodtruck|kebab|tacos)\b", hay):
        return "food-trucks"
    if re.search(r"\b(bar a cocktail|lounge|pub)\b", hay) and "restaurant" not in hay:
        return "bars-cafes"
    return "restaurants"


def cravings(place):
    hay = _norm(f"{place.title} {place.short_description} {place.description}")
    found = []
    for pattern, label in CRAVINGS:
        if re.search(pattern, hay) and label not in found:
            found.append(label)
    return found


def dedup_key(place):
    return f"{_norm(place.title).strip()}|{_norm(place.commune.name)}"


class Command(BaseCommand):
    help = "Migre Decouverte/Gastronomie vers une racine Commerces autonome."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Applique (defaut: dry-run).")

    def handle(self, *args, **options):
        apply = options["apply"]
        self.stdout.write(self.style.WARNING("MODE " + ("APPLY" if apply else "DRY-RUN")))
        with transaction.atomic():
            self._taxonomy()
            plan = self._classify_all()
            self._migrate(plan, apply)
            self._tile(apply)
            if not apply:
                transaction.set_rollback(True)
                self.stdout.write(self.style.WARNING("dry-run : rien applique."))
            else:
                self.stdout.write(self.style.SUCCESS("applique."))

    def _taxonomy(self):
        root, created = BusinessCategory.objects.get_or_create(
            slug=GASTRONOMY_ROOT_SLUG,
            defaults={
                "name": GASTRONOMY_ROOT_NAME,
                "parent": None,
                "icon": "UtensilsCrossed",
                "is_active": True,
                "sort_order": 2,
            },
        )
        self.stdout.write(
            f"  racine {GASTRONOMY_ROOT_NAME!r} (slug={GASTRONOMY_ROOT_SLUG}) "
            f"{'creee' if created else 'existante'} id={root.id}"
        )

        restau = BusinessCategory.objects.filter(slug=RESTAURATION_SLUG).first()
        if restau and restau.parent_id != root.id:
            self.stdout.write(
                f"  deplace 'restauration' sous Gastronomie (parent {restau.parent_id} -> {root.id})"
            )
            restau.parent = root
            restau.save(update_fields=["parent", "updated_at"])

        bars_cafes, _ = BusinessCategory.objects.get_or_create(
            slug="bars-cafes",
            defaults={"name": "Bars & Cafes", "parent": root, "icon": "Coffee", "is_active": True},
        )
        for old_slug in REMAP_CHILDREN:
            old = BusinessCategory.objects.filter(slug=old_slug).first()
            if old is None:
                continue
            moved = Business.objects.filter(category=old).update(category=bars_cafes)
            self.stdout.write(f"  fusion {old_slug} -> bars-cafes ({moved} businesses)")
            old.is_active = False
            old.save(update_fields=["is_active", "updated_at"])

        for slug, name in SPECIALTIES.items():
            cat, was_created = BusinessCategory.objects.get_or_create(
                slug=slug, defaults={"name": name, "parent": root, "is_active": True}
            )
            if cat.parent_id != root.id:
                cat.parent = root
                cat.save(update_fields=["parent", "updated_at"])
            self.stdout.write(
                f"  categorie {name!r} (slug={slug}) {'creee' if was_created else 'existante'} id={cat.id}"
            )

        if restau:
            restau.is_active = False
            restau.save(update_fields=["is_active", "updated_at"])
            self.stdout.write("  branche 'restauration' desactivee")
        return root

    def _classify_all(self):
        places = (
            Place.objects.filter(category__slug=GASTRONOMY_PLACE_SLUG, status="published")
            .select_related("commune")
            .order_by("id")
        )
        seen = {}
        plan = []
        self.stdout.write(f"\n  classification de {places.count()} lieux :")
        for p in places:
            key = dedup_key(p)
            if key in seen:
                self.stdout.write(f"    DOUBLON ignore (id deja vu {seen[key]}) : {p.title}")
                continue
            seen[key] = p.id
            cat = primary_category(p)
            tags = cravings(p)
            plan.append({"place": p, "category": cat, "tags": tags})
            extra = f"  -> envies: {', '.join(tags)}" if tags else ""
            self.stdout.write(f"    [{SPECIALTIES[cat]:22s}] {p.title} ({p.commune.name}){extra}")
        return plan

    def _migrate(self, plan, apply):
        created_count = 0
        for item in plan:
            p = item["place"]
            spec = BusinessCategory.objects.get(slug=item["category"])
            if Business.objects.filter(slug=p.slug).exists():
                self.stdout.write(f"    SKIP (slug deja Business) : {p.slug}")
                continue
            postal = (p.commune.postal_codes or [""])[0]
            business = Business(
                name=p.title[:150],
                slug=p.slug,
                category=spec,
                short_description=(p.short_description or "")[:200],
                description=p.description or "",
                specialties=item["tags"],
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
            self.style.SUCCESS(f"\n  {created_count} Business a creer (is_published=True, avec envies)")
        )
        if apply:
            ids = [item["place"].id for item in plan]
            depublished = Place.objects.filter(id__in=ids).update(status=Place.Status.DRAFT)
            self.stdout.write(self.style.SUCCESS(f"  {depublished} Place depublies (status=draft)"))

    def _tile(self, apply):
        if not apply:
            self.stdout.write("  tuile Gastronomie : (dry-run, non creee)")
            return
        tile, created = Tile.objects.get_or_create(
            parent=None,
            internal_path=f"/commerces?category={GASTRONOMY_ROOT_SLUG}",
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
        self.stdout.write(f"  tuile Gastronomie {'creee' if created else 'existante'} id={tile.id}")

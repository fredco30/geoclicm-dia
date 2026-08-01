"""Separe Associations de Commerces & services (option B, separation stricte).

Idempotent, dry-run par defaut. Ne touche ni aux Business (leur FK category
pointe vers les enfants, qui restent valides) ni au code. Trois actions :

1. Cree la categorie racine Commerces & services si absente et y rattache les
   branches commerciales (Restauration, Commerces alimentaires, Artisanat,
   Bien-etre, Mode et deco, Loisirs, Hebergement, Services).
2. Repointe la tuile racine Commercants du module cable vers la route interne
   /commerces?category=commerces-services (module businesses = tout l annuaire,
   y compris les associations).
3. Cree la tuile racine Associations (icone Users, preset olive) vers
   /commerces?category=associations, juste apres Commercants.
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.directory.models import BusinessCategory
from apps.tiles.models import Tile

COMMERCES_ROOT_SLUG = "commerces-services"
COMMERCES_ROOT_NAME = "Commerces & services"
ASSOCIATIONS_SLUG = "associations"

COMMERCE_BRANCH_SLUGS = [
    "restauration",
    "commerces-alimentaires",
    "artisanat",
    "bien-etre",
    "mode-et-deco",
    "loisirs",
    "hebergement",
    "services",
]


class Command(BaseCommand):
    help = "Separe Associations de Commerces & services (categories + tuiles)."

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Applique les changements (defaut : dry-run).",
        )

    def handle(self, *args, **options):
        apply = options["apply"]
        mode = "APPLY" if apply else "DRY-RUN"
        self.stdout.write(f"[{mode}] separation Associations / Commerces & services")

        with transaction.atomic():
            commercants = self._reparent_commerces()
            self._retile(commercants)
            if not apply:
                transaction.set_rollback(True)
                self.stdout.write(self.style.WARNING("dry-run : rien n a ete ecrit."))
            else:
                self.stdout.write(self.style.SUCCESS("applique."))

    def _reparent_commerces(self):
        root, created = BusinessCategory.objects.get_or_create(
            slug=COMMERCES_ROOT_SLUG,
            defaults={
                "name": COMMERCES_ROOT_NAME,
                "parent": None,
                "icon": "Store",
                "is_active": True,
                "sort_order": 1,
            },
        )
        etat = "creee" if created else "existante"
        self.stdout.write(
            f"  categorie racine {COMMERCES_ROOT_NAME!r} "
            f"(slug={COMMERCES_ROOT_SLUG}) {etat} id={root.id}"
        )
        for slug in COMMERCE_BRANCH_SLUGS:
            branch = BusinessCategory.objects.filter(slug=slug).first()
            if branch is None:
                self.stdout.write(self.style.WARNING(f"    branche absente : {slug}"))
                continue
            if branch.parent_id == root.id:
                self.stdout.write(f"    {slug}: deja sous la racine")
                continue
            self.stdout.write(
                f"    {slug}: parent {branch.parent_id} -> {root.id} ({branch.name})"
            )
            branch.parent = root
            branch.save(update_fields=["parent", "updated_at"])
        return root

    def _retile(self, root) -> None:
        commercants = Tile.objects.filter(
            parent__isnull=True, module_key=Tile.ModuleKey.BUSINESSES
        ).first()
        base_order = 0
        if commercants is None:
            self.stdout.write(self.style.WARNING("  tuile Commercants (module businesses) introuvable"))
        else:
            base_order = commercants.sort_order
            self.stdout.write(
                f"  tuile Commercants id={commercants.id}: module businesses -> "
                f"internal_route /commerces?category={COMMERCES_ROOT_SLUG}"
            )
            commercants.kind = Tile.Kind.INTERNAL_ROUTE
            commercants.module_key = ""
            commercants.internal_path = f"/commerces?category={COMMERCES_ROOT_SLUG}"
            commercants.save(update_fields=["kind", "module_key", "internal_path", "updated_at"])

        assoc, created = Tile.objects.get_or_create(
            parent=None,
            internal_path=f"/commerces?category={ASSOCIATIONS_SLUG}",
            defaults={
                "label": "Associations",
                "icon": "Users",
                "color": Tile.ColorPreset.OLIVE,
                "kind": Tile.Kind.INTERNAL_ROUTE,
                "sort_order": base_order + 1,
                "is_active": True,
                "show_on_home": True,
            },
        )
        etat = "creee" if created else "existante"
        self.stdout.write(
            f"  tuile Associations {etat} id={assoc.id} "
            f"-> /commerces?category={ASSOCIATIONS_SLUG} (icone Users, preset olive)"
        )

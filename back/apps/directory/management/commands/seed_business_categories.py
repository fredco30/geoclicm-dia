"""
Seed des BusinessCategory : 8 catégories racines + sous-catégories.

Usage : python manage.py seed_business_categories

Idempotent : utilise update_or_create sur le slug, peut être lancé plusieurs fois.
"""
from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.directory.models import BusinessCategory


# Hiérarchie : (name, icon Lucide, schema.org type)
# Référence schema.org : https://schema.org/LocalBusiness
ROOTS = [
    {
        "name": "Restauration",
        "icon": "UtensilsCrossed",
        "schema_type": "Restaurant",
        "children": [
            ("Restaurants", "UtensilsCrossed", "Restaurant"),
            ("Bars", "Beer", "BarOrPub"),
            ("Cafés", "Coffee", "CafeOrCoffeeShop"),
            ("Glaciers", "IceCream", "IceCreamShop"),
            ("Food trucks", "Truck", "FoodEstablishment"),
        ],
    },
    {
        "name": "Commerces alimentaires",
        "icon": "ShoppingBasket",
        "schema_type": "FoodEstablishment",
        "children": [
            ("Boulangeries", "Croissant", "Bakery"),
            ("Poissonneries", "Fish", "Store"),
            ("Primeurs", "Apple", "GroceryStore"),
            ("Caves", "Wine", "Store"),
            ("Fromagers", "ShoppingBag", "Store"),
        ],
    },
    {
        "name": "Artisanat",
        "icon": "Hammer",
        "schema_type": "HomeAndConstructionBusiness",
        "children": [
            ("Maçonnerie", "Wrench", "HomeAndConstructionBusiness"),
            ("Plomberie", "Pipette", "Plumber"),
            ("Électricité", "Zap", "Electrician"),
            ("Peinture", "PaintRoller", "HousePainter"),
            ("Menuiserie", "Hammer", "HomeAndConstructionBusiness"),
        ],
    },
    {
        "name": "Bien-être",
        "icon": "Sparkles",
        "schema_type": "HealthAndBeautyBusiness",
        "children": [
            ("Coiffure", "Scissors", "HairSalon"),
            ("Esthétique", "Sparkles", "BeautySalon"),
            ("Massage", "Hand", "DaySpa"),
            ("Sport", "Dumbbell", "SportsActivityLocation"),
        ],
    },
    {
        "name": "Mode et déco",
        "icon": "Shirt",
        "schema_type": "Store",
        "children": [
            ("Vêtements", "Shirt", "ClothingStore"),
            ("Bijoux", "Gem", "JewelryStore"),
            ("Décoration", "Lamp", "HomeGoodsStore"),
            ("Antiquités", "Crown", "Store"),
        ],
    },
    {
        "name": "Loisirs",
        "icon": "Sailboat",
        "schema_type": "EntertainmentBusiness",
        "children": [
            ("Locations bateaux", "Sailboat", "EntertainmentBusiness"),
            ("École voile", "Anchor", "SportsActivityLocation"),
            ("Manèges", "PartyPopper", "AmusementPark"),
            ("Excursions", "Map", "TouristInformationCenter"),
        ],
    },
    {
        "name": "Hébergement",
        "icon": "BedDouble",
        "schema_type": "LodgingBusiness",
        "children": [
            ("Hôtels", "Hotel", "Hotel"),
            ("Campings", "Tent", "Campground"),
            ("Locations saisonnières", "House", "LodgingBusiness"),
            ("Chambres d'hôtes", "BedDouble", "BedAndBreakfast"),
        ],
    },
    {
        "name": "Services",
        "icon": "Briefcase",
        "schema_type": "ProfessionalService",
        "children": [
            ("Auto", "Car", "AutoRepair"),
            ("Banque", "Landmark", "BankOrCreditUnion"),
            ("Assurance", "ShieldCheck", "InsuranceAgency"),
            ("Immobilier", "Home", "RealEstateAgent"),
            ("Santé", "HeartPulse", "MedicalBusiness"),
        ],
    },
]


class Command(BaseCommand):
    help = "Seed des BusinessCategory : 8 catégories racines + sous-catégories de la doc 04."

    def handle(self, *args, **options) -> None:
        created, updated = 0, 0

        for root_idx, root_data in enumerate(ROOTS):
            root_name = root_data["name"]
            root_slug = slugify(root_name)

            root, was_created = BusinessCategory.objects.update_or_create(
                slug=root_slug,
                defaults={
                    "name": root_name,
                    "icon": root_data["icon"],
                    "schema_type": root_data["schema_type"],
                    "parent": None,
                    "sort_order": root_idx * 10,
                    "is_active": True,
                },
            )
            if was_created:
                created += 1
                self.stdout.write(self.style.SUCCESS(f"+ {root.name}"))
            else:
                updated += 1
                self.stdout.write(f"~ {root.name} (déjà existante, mise à jour)")

            for child_idx, (child_name, child_icon, child_schema) in enumerate(root_data["children"]):
                child_slug = slugify(child_name)
                _, was_created = BusinessCategory.objects.update_or_create(
                    slug=child_slug,
                    defaults={
                        "name": child_name,
                        "icon": child_icon,
                        "schema_type": child_schema,
                        "parent": root,
                        "sort_order": child_idx * 10,
                        "is_active": True,
                    },
                )
                if was_created:
                    created += 1
                    self.stdout.write(self.style.SUCCESS(f"  + {child_name}"))
                else:
                    updated += 1
                    self.stdout.write(f"  ~ {child_name}")

        self.stdout.write(self.style.SUCCESS(
            f"\nTerminé : {created} créées, {updated} mises à jour."
        ))

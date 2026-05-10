"""
Seed des BusinessCategory.

Structure : 16 catégories racines + ~120 sous-catégories, calibrée pour
l'annuaire commerçant du littoral camarguais (7 communes, services aux
pros, métiers identitaires Camargue inclus).

Idempotent : `update_or_create` sur le slug, peut être lancé plusieurs
fois. Préserve scrupuleusement les slugs existants (notamment
`plomberie` qui est utilisé par une fiche en prod).

Stratégie de migration des sous-cat existantes vers les nouvelles
racines (les slugs ne changent pas, seul le `parent` est mis à jour) :
- `sport` : bien-etre → sport-forme (renommé "Salles de sport")
- `decoration`, `antiquites` : mode-et-deco → maison-deco
- `auto` : services → auto-mobilite (renommé "Garage auto")
- `banque`, `assurance`, `immobilier` : services → banque-assurance-immo
- `sante` : sous-cat de services → racine indépendante (parent=None)

Ces migrations sont sans casse pour les fiches Business existantes : la
FK Business→BusinessCategory pointe sur l'ID, qui ne change pas.

Usage : python manage.py seed_business_categories
"""
from __future__ import annotations

from django.core.management.base import BaseCommand
from django.utils.text import slugify

from apps.directory.models import BusinessCategory


# Type alias pour la lisibilité :
# (display_name, icon Lucide, schema.org type, slug optionnel pour override)
Child = tuple[str, str, str] | tuple[str, str, str, str]


def _resolve_slug(item: Child) -> str:
    """Renvoie le slug fourni en 4e position, ou slugify(name) sinon."""
    if len(item) == 4:
        return item[3]
    return slugify(item[0])


# ============================================================================
# Hiérarchie complète
# ============================================================================
# Racines avec leur slug fixé (préservation de l'existant + nouveaux slugs
# explicites pour les nouvelles racines).
ROOTS: list[dict] = [
    # ------------------------------------------------------------------------
    # 1. Restauration
    # ------------------------------------------------------------------------
    {
        "name": "Restauration",
        "slug": "restauration",
        "icon": "UtensilsCrossed",
        "schema_type": "Restaurant",
        "children": [
            ("Restaurants", "UtensilsCrossed", "Restaurant"),
            ("Restaurants gastronomiques", "ChefHat", "Restaurant",
             "restaurants-gastronomiques"),
            ("Spécialités camarguaises", "Beef", "Restaurant",
             "specialites-camarguaises"),
            ("Pizzerias", "Pizza", "Restaurant"),
            ("Crêperies", "Cookie", "Restaurant"),
            ("Brasseries", "Beer", "Restaurant"),
            ("Bars", "Beer", "BarOrPub"),
            ("Cafés", "Coffee", "CafeOrCoffeeShop"),
            ("Glaciers", "IceCream", "IceCreamShop"),
            ("Food trucks", "Truck", "FoodEstablishment"),
        ],
    },
    # ------------------------------------------------------------------------
    # 2. Commerces alimentaires (avec producteurs Camargue identitaires)
    # ------------------------------------------------------------------------
    {
        "name": "Commerces alimentaires",
        "slug": "commerces-alimentaires",
        "icon": "ShoppingBasket",
        "schema_type": "FoodEstablishment",
        "children": [
            ("Boulangeries", "Croissant", "Bakery"),
            ("Pâtisseries & chocolatiers", "Cake", "Store",
             "patisseries-chocolatiers"),
            ("Boucherie & charcuterie", "Beef", "Store",
             "boucherie-charcuterie"),
            ("Poissonneries", "Fish", "Store"),
            ("Primeurs", "Apple", "GroceryStore"),
            ("Fromagers", "ShoppingBag", "Store"),
            ("Caves", "Wine", "Store"),
            ("Épiceries fines & bio", "ShoppingBasket", "GroceryStore",
             "epiceries-fines-bio"),
            ("Traiteurs", "ChefHat", "FoodEstablishment"),
            # Identité Camargue : sauniers, riziculteurs, manadiers,
            # vins de sable, taureau de Camargue
            ("Producteurs Camargue", "Wheat", "FoodEstablishment",
             "producteurs-camargue"),
            ("Marchés ambulants", "ShoppingCart", "GroceryStore",
             "marches-ambulants"),
        ],
    },
    # ------------------------------------------------------------------------
    # 3. Artisanat & bâtiment
    # ------------------------------------------------------------------------
    {
        "name": "Artisanat & bâtiment",
        "slug": "artisanat",
        "icon": "Hammer",
        "schema_type": "HomeAndConstructionBusiness",
        "children": [
            ("Maçonnerie", "Wrench", "HomeAndConstructionBusiness"),
            ("Plomberie", "Pipette", "Plumber"),  # ⚠️ slug=plomberie utilisé en prod
            ("Électricité", "Zap", "Electrician"),
            ("Peinture", "PaintRoller", "HousePainter"),
            ("Menuiserie", "Hammer", "HomeAndConstructionBusiness"),
            ("Ébénisterie", "TreeDeciduous", "HomeAndConstructionBusiness"),
            ("Carrelage", "Square", "HomeAndConstructionBusiness"),
            ("Couverture", "Home", "RoofingContractor"),
            ("Vitrerie", "PanelTop", "HomeAndConstructionBusiness",
             "vitrerie"),
            ("Serrurerie", "Lock", "Locksmith"),
            ("Paysagiste & jardinage", "Trees", "HomeAndConstructionBusiness",
             "paysagistes-jardinage"),
            ("Climatisation", "Wind", "HVACBusiness"),
            ("Énergies renouvelables", "Sun",
             "HomeAndConstructionBusiness", "energies-renouvelables"),
        ],
    },
    # ------------------------------------------------------------------------
    # 4. Santé (PROMUE depuis sous-cat de Services — parent change à NULL)
    # ------------------------------------------------------------------------
    {
        "name": "Santé",
        "slug": "sante",  # Slug existant — promotion en racine
        "icon": "HeartPulse",
        "schema_type": "MedicalBusiness",
        "children": [
            ("Médecin", "Stethoscope", "Physician"),
            ("Dentiste", "Smile", "Dentist"),
            ("Kinésithérapeute", "Activity", "Physiotherapy", "kine"),
            ("Ostéopathe", "Hand", "Physician", "osteopathe"),
            ("Pharmacie", "Pill", "Pharmacy"),
            ("Opticien", "Glasses", "Optician"),
            ("Infirmier", "Syringe", "MedicalBusiness"),
            ("Vétérinaire", "Dog", "VeterinaryCare", "veterinaire"),
            ("Orthophoniste", "MessageCircle", "MedicalBusiness"),
        ],
    },
    # ------------------------------------------------------------------------
    # 5. Bien-être & beauté (Sport SORT vers nouvelle racine sport-forme)
    # ------------------------------------------------------------------------
    {
        "name": "Bien-être & beauté",
        "slug": "bien-etre",
        "icon": "Sparkles",
        "schema_type": "HealthAndBeautyBusiness",
        "children": [
            ("Coiffure", "Scissors", "HairSalon"),
            ("Esthétique", "Sparkles", "BeautySalon"),
            ("Onglerie", "Star", "NailSalon"),
            ("Massage", "Hand", "DaySpa"),
            ("Spa", "Droplet", "DaySpa"),
            ("Yoga", "Flower2", "HealthAndBeautyBusiness"),
            ("Naturopathie", "Leaf", "HealthAndBeautyBusiness"),
            ("Tatouage", "Pen", "HealthAndBeautyBusiness"),
        ],
    },
    # ------------------------------------------------------------------------
    # 6. Sport & forme (NOUVELLE — slug=sport déménage depuis bien-etre,
    # renommé "Salles de sport")
    # ------------------------------------------------------------------------
    {
        "name": "Sport & forme",
        "slug": "sport-forme",
        "icon": "Dumbbell",
        "schema_type": "SportsActivityLocation",
        "children": [
            # Renommage de l'ancien "Sport" en "Salles de sport" (slug=sport
            # préservé → la fiche éventuellement attachée suit)
            ("Salles de sport", "Dumbbell", "ExerciseGym", "sport"),
            ("Cours collectifs", "Users", "SportsActivityLocation",
             "cours-collectifs"),
            ("Boutiques de sport", "ShoppingBag", "SportingGoodsStore",
             "boutiques-sport"),
            ("Sports nautiques", "Waves", "SportsActivityLocation",
             "sports-nautiques"),
            ("Sports équestres", "Award", "SportsActivityLocation",
             "sports-equestres"),
        ],
    },
    # ------------------------------------------------------------------------
    # 7. Mode & accessoires (anciennement "Mode et déco" — Décoration et
    # Antiquités sortent vers maison-deco. Slug `mode-et-deco` préservé.)
    # ------------------------------------------------------------------------
    {
        "name": "Mode & accessoires",
        "slug": "mode-et-deco",
        "icon": "Shirt",
        "schema_type": "Store",
        "children": [
            ("Vêtements", "Shirt", "ClothingStore"),
            ("Chaussures", "Footprints", "ShoeStore"),
            ("Maroquinerie", "Briefcase", "Store"),
            ("Bijoux", "Gem", "JewelryStore"),
            ("Parfumerie", "FlaskConical", "Store"),
        ],
    },
    # ------------------------------------------------------------------------
    # 8. Maison & déco (NOUVELLE — décoration et antiquités migrent ici)
    # ------------------------------------------------------------------------
    {
        "name": "Maison & déco",
        "slug": "maison-deco",
        "icon": "Sofa",
        "schema_type": "HomeGoodsStore",
        "children": [
            ("Mobilier", "Sofa", "FurnitureStore"),
            ("Décoration", "Lamp", "HomeGoodsStore"),  # slug=decoration migré
            ("Antiquités", "Crown", "Store"),  # slug=antiquites migré
            ("Cuisine & électroménager", "ChefHat", "HomeGoodsStore",
             "cuisine-electromenager"),
            ("Bricolage", "Wrench", "HardwareStore"),
            ("Linge de maison", "Bed", "HomeGoodsStore", "linge-maison"),
        ],
    },
    # ------------------------------------------------------------------------
    # 9. Loisirs & culture (enrichi)
    # ------------------------------------------------------------------------
    {
        "name": "Loisirs & culture",
        "slug": "loisirs",
        "icon": "Sailboat",
        "schema_type": "EntertainmentBusiness",
        "children": [
            ("Locations de bateaux", "Sailboat", "EntertainmentBusiness",
             "locations-bateaux"),
            ("École de voile", "Anchor", "SportsActivityLocation",
             "ecole-voile"),
            ("Excursions", "Map", "TouristInformationCenter"),
            ("Pêche & excursion mer", "Fish", "EntertainmentBusiness",
             "peche-excursion-mer"),
            ("Centres équestres & manades", "Award",
             "SportsActivityLocation", "centres-equestres-manades"),
            # Slug `maneges` (Django slugify retire les accents avant le seed
            # initial). On préserve.
            ("Manèges & parcs", "PartyPopper", "AmusementPark", "maneges"),
            ("Galeries d'art", "Palette", "ArtGallery", "galeries-art"),
            ("Cinéma", "Film", "MovieTheater"),
            ("Musique & instruments", "Music", "Store",
             "musique-instruments"),
            ("Librairie & papeterie", "BookOpen", "BookStore",
             "librairie-papeterie"),
        ],
    },
    # ------------------------------------------------------------------------
    # 10. Tourisme & hébergement
    # ------------------------------------------------------------------------
    {
        "name": "Tourisme & hébergement",
        "slug": "hebergement",
        "icon": "BedDouble",
        "schema_type": "LodgingBusiness",
        "children": [
            ("Hôtels", "Hotel", "Hotel"),
            ("Campings", "Tent", "Campground"),
            ("Locations saisonnières", "House", "LodgingBusiness",
             "locations-saisonnieres"),
            ("Chambres d'hôtes", "BedDouble", "BedAndBreakfast"),
            ("Gîtes ruraux", "TreePine", "LodgingBusiness", "gites-ruraux"),
            ("Mas & domaines", "Castle", "LodgingBusiness", "mas"),
            ("Camping-car", "Caravan", "Campground", "camping-car"),
            ("Office de tourisme", "Compass", "TouristInformationCenter",
             "office-tourisme"),
            ("Guides touristiques", "MapPin", "TouristInformationCenter",
             "guides-touristiques"),
        ],
    },
    # ------------------------------------------------------------------------
    # 11. Communication & web (NOUVELLE)
    # ------------------------------------------------------------------------
    {
        "name": "Communication & web",
        "slug": "communication-web",
        "icon": "Megaphone",
        "schema_type": "ProfessionalService",
        "children": [
            ("Agence de communication", "Megaphone", "ProfessionalService",
             "agence-comm"),
            ("Imprimerie", "Printer", "ProfessionalService"),
            ("Photographe", "Camera", "ProfessionalService"),
            ("Vidéaste", "Video", "ProfessionalService", "videaste"),
            ("Graphiste & design", "Palette", "ProfessionalService",
             "graphiste"),
            ("Web & développement", "Code", "ProfessionalService",
             "web-dev"),
            ("Référencement SEO", "Search", "ProfessionalService", "seo"),
            ("Réseaux sociaux & marketing", "Share2",
             "ProfessionalService", "reseaux-sociaux"),
        ],
    },
    # ------------------------------------------------------------------------
    # 12. Services pros & conseil (anciennement "Services" — Auto/Banque/
    # Assurance/Immobilier/Santé sortent vers leurs propres familles.
    # Slug `services` préservé.)
    # ------------------------------------------------------------------------
    {
        "name": "Services pros & conseil",
        "slug": "services",
        "icon": "Briefcase",
        "schema_type": "ProfessionalService",
        "children": [
            ("Avocats", "Scale", "Attorney"),
            ("Notaires", "FileSignature", "Notary"),
            ("Experts-comptables", "Calculator", "AccountingService",
             "experts-comptables"),
            ("Conseil RH", "Users", "ProfessionalService", "conseil-rh"),
            ("Formation pro", "GraduationCap", "EducationalOrganization",
             "formation-pro"),
            ("Coaching", "Target", "ProfessionalService"),
            ("Traduction", "Languages", "ProfessionalService"),
        ],
    },
    # ------------------------------------------------------------------------
    # 13. Banque, assurance & immobilier (NOUVELLE — banque/assurance/
    # immobilier migrent depuis services)
    # ------------------------------------------------------------------------
    {
        "name": "Banque, assurance & immobilier",
        "slug": "banque-assurance-immo",
        "icon": "Landmark",
        "schema_type": "FinancialService",
        "children": [
            ("Banque", "Landmark", "BankOrCreditUnion"),
            ("Assurance", "ShieldCheck", "InsuranceAgency"),
            ("Courtier prêt", "Receipt", "FinancialService", "courtier-pret"),
            ("Immobilier", "Home", "RealEstateAgent"),
        ],
    },
    # ------------------------------------------------------------------------
    # 14. Auto & mobilité (NOUVELLE — auto migre depuis services et est
    # renommé "Garage auto")
    # ------------------------------------------------------------------------
    {
        "name": "Auto & mobilité",
        "slug": "auto-mobilite",
        "icon": "Car",
        "schema_type": "AutomotiveBusiness",
        "children": [
            # Renommage de l'ancien "Auto" en "Garage auto"
            ("Garage auto", "Car", "AutoRepair", "auto"),
            ("Carrosserie", "Wrench", "AutoBodyShop"),
            ("Lavage auto", "Droplets", "AutoWash", "lavage-auto"),
            ("Location de véhicules", "Key", "AutoRental",
             "location-vehicules"),
            ("Vélo & réparation", "Bike", "BicycleStore", "velo"),
            ("Scooter & moto", "Bike", "MotorcycleDealer", "scooter"),
            ("Taxi & VTC", "Car", "TaxiService", "taxi"),
            ("Stations essence", "Fuel", "GasStation", "stations-essence"),
        ],
    },
    # ------------------------------------------------------------------------
    # 15. Animaux (NOUVELLE)
    # ------------------------------------------------------------------------
    {
        "name": "Animaux",
        "slug": "animaux",
        "icon": "Dog",
        "schema_type": "Store",
        "children": [
            ("Toilettage", "Scissors", "AnimalShelter"),
            ("Pension", "Home", "AnimalShelter", "pension-animaux"),
            ("Animalerie", "ShoppingBag", "PetStore"),
            ("Élevage", "Fence", "AnimalShelter", "elevage"),
        ],
    },
    # ------------------------------------------------------------------------
    # 16. Éducation & enfance (NOUVELLE)
    # ------------------------------------------------------------------------
    {
        "name": "Éducation & enfance",
        "slug": "education-enfance",
        "icon": "GraduationCap",
        "schema_type": "EducationalOrganization",
        "children": [
            ("Crèche", "Baby", "ChildCare", "creche"),
            ("École privée", "School", "School", "ecole-privee"),
            ("Soutien scolaire", "BookOpen", "EducationalOrganization",
             "soutien-scolaire"),
            ("Conservatoire", "Music", "EducationalOrganization"),
            ("Activités extrascolaires", "Activity",
             "EducationalOrganization", "activites-extrascolaires"),
        ],
    },
]


class Command(BaseCommand):
    help = (
        "Seed des BusinessCategory : 16 racines + ~120 sous-catégories. "
        "Idempotent — préserve les slugs existants (notamment plomberie). "
        "Migre automatiquement les sous-cat déplacées (sport, decoration, "
        "auto, banque, etc.) en mettant à jour leur parent."
    )

    def handle(self, *args, **options) -> None:
        created_count, updated_count = 0, 0

        for root_idx, root_data in enumerate(ROOTS):
            root, was_created = BusinessCategory.objects.update_or_create(
                slug=root_data["slug"],
                defaults={
                    "name": root_data["name"],
                    "icon": root_data["icon"],
                    "schema_type": root_data["schema_type"],
                    "parent": None,  # garantit la promotion à racine
                    "sort_order": root_idx * 10,
                    "is_active": True,
                },
            )
            if was_created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f"+ {root.name}"))
            else:
                updated_count += 1
                self.stdout.write(f"~ {root.name}")

            for child_idx, child in enumerate(root_data["children"]):
                child_name = child[0]
                child_icon = child[1]
                child_schema = child[2]
                child_slug = _resolve_slug(child)

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
                    created_count += 1
                    self.stdout.write(
                        self.style.SUCCESS(f"  + {child_name}")
                    )
                else:
                    updated_count += 1
                    self.stdout.write(f"  ~ {child_name}")

        self.stdout.write(self.style.SUCCESS(
            f"\nTerminé : {created_count} créées, "
            f"{updated_count} mises à jour."
        ))
        self.stdout.write(
            "\nNote : ce seed n'efface jamais les catégories existantes. "
            "Si tu vois une racine fantôme dans l'admin (ex: ancienne "
            "version d'arborescence), désactive-la manuellement via "
            "/admin/directory/categories ou supprime-la si elle n'a "
            "aucune fiche associée."
        )

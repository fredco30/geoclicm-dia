# 22 — Architecture Agenda, Marchés & producteurs, Découvrir

**Décision produit confirmée le 26 juillet 2026** : les trois tuiles doivent
devenir des fonctionnalités complètes et administrables. Elles ne sont ni à
masquer durablement, ni à supprimer.

## Principe directeur

On ne crée pas trois bases indépendantes contenant plusieurs fois les mêmes
dates, lieux et professionnels :

```text
Agenda (Event + Occurrence)
   └── Marchés récurrents

Annuaire (Business + BusinessCategory)
   └── Producteurs locaux

Découvrir (Place + PlaceCategory)
   ├── liens vers Articles
   ├── liens vers Businesses
   └── liens vers Events
```

La page `/marches` compose les marchés provenant de l'Agenda et les producteurs
provenant de l'Annuaire. Découvrir référence les contenus existants au lieu de
les recopier.

## 1. Agenda : source temporelle unique

### Modèles

#### `EventCategory`

- nom, slug, icône, couleur, ordre, actif ;
- gérée depuis le portail admin ;
- catégories initiales : Marché, Festival, Culture, Concert, Sport,
  Tradition, Famille, Gastronomie, Exposition.

#### `Event`

- contenu : titre, slug, résumé, description Markdown, image ;
- classement : catégorie et type `event` ou `market` ;
- lieu : commune, nom du lieu, adresse, point géographique ;
- pratique : tarif libre, réservation, téléphone, email, organisateur ;
- relations optionnelles : commerce organisateur et articles liés ;
- workflow : brouillon, publié, annulé, archivé ;
- SEO : titre et description personnalisables.

#### `EventOccurrence`

- événement parent ;
- début et fin en UTC, affichage Europe/Paris ;
- journée entière ou horaires ;
- état occurrence : prévue, annulée, reportée ;
- contrainte d'unicité événement + date de début.

Une occurrence séparée est préférable à une simple chaîne RRULE : elle permet
d'annuler un seul marché, déplacer une date ou corriger un horaire sans casser
toute la série. Le portail peut proposer un générateur hebdomadaire/mensuel qui
crée les occurrences, mais la base conserve des dates explicites et auditables.

### Portail admin

- `/admin/agenda` : liste filtrable par statut, type, commune, catégorie et
  période ;
- `/admin/agenda/new` et `/admin/agenda/[slug]/edit` ;
- éditeur de dates avec ajout manuel et générateur de répétitions ;
- possibilité d'annuler ou déplacer une occurrence isolée ;
- `/admin/agenda/categories` pour gérer les catégories ;
- aperçu public avant publication ;
- suppression destructive remplacée par archivage, sauf brouillon sans usage.

### Public

- `/agenda` : liste chronologique mobile-first, filtres date/commune/catégorie ;
- `/agenda/[slug]` : détail, prochaines dates, carte, itinéraire et fichier ICS ;
- vue calendrier et carte ajoutées après validation de la liste, sur la même
  API — sans changer le modèle.

## 2. Marchés & producteurs : une vue composée

### Marchés

Un marché est un `Event` avec `kind=market`. Ses jours d'ouverture sont des
`EventOccurrence`. Il apparaît à la fois dans `/agenda` et `/marches`.

### Producteurs

Les producteurs restent des `Business` : coordonnées, horaires, photos,
contacts et abonnement sont déjà gérés par l'Annuaire. Un booléen
`Business.is_local_producer` permet de qualifier chaque fiche sans confondre
le métier et le mode de production : une poissonnerie ou un primeur peut être
producteur ou revendeur.

### Portail admin

- les marchés se gèrent dans Agenda avec un filtre « Marchés » ;
- les producteurs se gèrent dans Commerçants ;
- la fiche commerçant reçoit la case « Producteur local » ;
- aucun écran ne demande de saisir deux fois le même professionnel.

### Public `/marches`

- prochains marchés, groupés par commune et jour ;
- producteurs locaux avec accès à leur fiche `/commerces/[slug]` ;
- filtres commune et date ;
- carte commune aux deux sources quand les coordonnées sont disponibles.

## 3. Découvrir : catalogue éditorial géographique

### Modèles

#### `PlaceCategory`

- nom, slug, description, icône, couleur, ordre, actif ;
- exemples : Patrimoine, Nature, Plages, Balades, Points de vue, Savoir-faire.

#### `Place`

- titre, slug, résumé, description Markdown, image et galerie ;
- catégorie, commune, adresse et point géographique ;
- informations pratiques : durée, difficulté, accessibilité, saison conseillée,
  URL officielle ;
- relations vers articles, commerces et événements ;
- workflow brouillon/publié/archivé, mise en avant et ordre ;
- champs SEO.

### Portail admin

- `/admin/decouvrir` : liste et filtres ;
- `/admin/decouvrir/new` et `/admin/decouvrir/[slug]/edit` ;
- `/admin/decouvrir/categories` ;
- géocodage et prévisualisation de la carte ;
- sélection des contenus reliés sans duplication.

### Public

- `/decouvrir` : hub filtrable avec cartes éditoriales ;
- `/decouvrir/[slug]` : page riche, carte, itinéraire, contenus et acteurs liés ;
- les sous-tuiles existantes peuvent devenir des raccourcis vers les catégories
  Découvrir, mais elles ne constituent pas la base de données du module.

## 4. Ordre de réalisation

1. Modèles, migrations et API Agenda/Occurrences, avec tests de dates.
2. CRUD Agenda dans le portail admin.
3. Pages publiques Agenda et fichier ICS.
4. Marquage producteurs + page composée `/marches`.
5. Modèles et CRUD Découvrir.
6. Pages publiques Découvrir et relations croisées.
7. Calendrier mensuel et carte globale après validation des workflows simples.

## 5. Critères de livraison

- aucune tuile ne mène vers un 404 ;
- création, modification, publication, archivage et filtre fonctionnent depuis
  le portail admin ;
- un marché récurrent accepte une exception sans dupliquer toute sa fiche ;
- un producteur n'est jamais ressaisi hors de l'Annuaire ;
- les dates sont stockées avec fuseau et testées autour des changements
  heure d'été/hiver ;
- pages publiques, sitemap et JSON-LD sont validés ;
- migrations et smoke tests passent avant activation du seed.

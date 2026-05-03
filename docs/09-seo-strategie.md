# 09 — Stratégie SEO local

Stratégie complète pour capter le trafic touristique camarguais et devenir une référence locale en 12-18 mois.

## Analyse concurrentielle

Sur les requêtes touristiques typiques ("visiter Le Grau-du-Roi", "que faire en Camargue"), Google retourne :

1. **Blogs voyage généralistes** (generationvoyage.fr, bouger-voyager.com, okvoyage.com, toploc.com, routard.com) — bien positionnés mais **génériques, sans connaissance locale réelle**
2. **Office de tourisme officiel** (letsgrau.com) — bien structuré mais **institutionnel, axé promotion administrative**
3. **TripAdvisor** — agrégateur peu différenciant
4. **Prestataires individuels** — SEO de leur business sans vision éditoriale globale

**Trou marché identifié** : aucun acteur ne tient le créneau "média local authentique avec connaissance fine du territoire".

Notre angle gagnant :
- Contenu patrimoine + histoire vivante (créneau Facebook actuel)
- Vue de l'intérieur par des locaux
- Profondeur éditoriale (concurrence très superficielle)
- Actualité événementielle riche
- Récits autour des commerces et artisans

Google adore ce type de contenu depuis Helpful Content (2023-2024).

## Les 4 piliers SEO

### Pilier 1 — La géographie (pages "ville/quartier")

Une page profonde et travaillée pour chaque commune et lieu emblématique du territoire couvert. Pas une fiche Wikipedia bis : une vraie page avec narration, histoire, photos, recommandations locales croisées.

```
/territoire/
├── /le-grau-du-roi/
│   ├── /port-camargue/
│   ├── /espiguette/
│   ├── /boucanet/
│   └── /rive-droite-rive-gauche/
├── /aigues-mortes/
│   ├── /remparts/
│   └── /salins-du-midi/
├── /la-grande-motte/
│   ├── /pyramides/
│   └── /point-zero/
├── /lunel/
├── /vauvert/
├── /saint-laurent-d-aigouze/
├── /marsillargues/
└── /la-camargue-gardoise/
```

**Format d'une page commune** (1500-2500 mots) :
- Histoire et origines
- Identité et atmosphère
- À voir, à faire (renvois vers articles détaillés)
- Événements à venir (widget dynamique)
- Commerces emblématiques (renvois annuaire)
- Articles récents sur la commune (auto-feed)
- Carte interactive
- Comment s'y rendre

### Pilier 2 — Les guides thématiques

Pages longues répondant aux requêtes touristiques avec ton ton et ta connaissance locale.

**Calendrier de production sur 12 mois** :

```
Avant saison 2026 (mai-juin)
- Que faire au Grau-du-Roi en juillet
- Que faire au Grau-du-Roi en août
- Plages du littoral camarguais : guide complet
- Marchés provençaux du littoral camarguais
- Restaurants typiques de Camargue : notre sélection

Hors saison (septembre-décembre)
- Que faire en Camargue en automne
- Camargue en hiver : 10 idées
- Visiter la Camargue hors saison
- Manades et taureaux : comprendre la tradition
- Pêche au Grau-du-Roi : tradition vivante
- Guide des courses camarguaises pour novices

Avant saison 2027 (janvier-mars)
- Camargue en famille avec enfants : itinéraires
- Camargue à vélo : 5 itinéraires testés
- Photographier les flamants roses : où et quand
- Cuisine camarguaise : 10 plats à connaître
- Festivals et fêtes votives 2027
- Pâques en Camargue : programme et traditions
```

**Format guide thématique** (2000-3500 mots) :
- Photos originales (pas de banque d'image)
- Anecdotes et témoignages locaux
- Cartes interactives intégrées
- FAQ structurée (Schema FAQPage)
- Renvois vers commerçants/artisans pertinents
- Mise à jour datée et visible

### Pilier 3 — L'actualité éditoriale (différenciateur fort)

Vous publiez régulièrement, contrairement aux blogs voyage qui publient une fois et oublient. Google adore la fraîcheur.

**Catégories éditoriales avec angles SEO** :

- **Mémoire vivante** — anecdotes historiques. Trafic : "histoire grau du roi", "ancien grau du roi", "pêcheurs camargue traditions"
- **Portraits** — un acteur local par mois. Trafic : recherches nominatives + intent "rencontrer un manadier camargue"
- **Reportages** — événement local couvert. Trafic : "fête votive [ville]", "course camarguaise [ville]"
- **Patrimoine** — un lieu, un bâtiment. Trafic : recherches précises
- **Archives photos** — comparaison "avant/maintenant". Trafic : potentiel viral et SEO image
- **Bons plans saison** — actualités touristiques. Trafic : haute saison

**Cadence cible** : 3-4 articles par semaine, soit ~150-200/an.

### Pilier 4 — L'annuaire (long tail business)

Chaque fiche commerçant capte des requêtes type "poissonnerie port grau du roi", "restaurant terrasse port camargue", "location vélo aigues mortes".

**Structure SEO d'une fiche optimale** :
- URL : `/annuaire/restaurants/le-grau-du-roi/[slug]`
- Title : `[Nom] — [Catégorie] à [Commune] | Le Camarguais`
- H1 unique : nom du commerce
- Description longue (300+ mots) écrite/éditée par votre équipe
- Schema.org `LocalBusiness` complet
- Photos avec `alt` descriptifs
- Horaires structurés
- Avis si possible (Schema `Review`)
- Renvois vers articles mentionnant le commerce

## Optimisations techniques

### Schema.org / Données structurées

**Articles** → `NewsArticle`
**Événements** → `Event` (apparition possible dans box "Évènements à proximité")
**Commerces** → `LocalBusiness` + sous-types (`Restaurant`, `Store`, `LodgingBusiness`)
**Pages communes** → `Place` + `TouristAttraction` + `BreadcrumbList`
**Guides avec FAQ** → `FAQPage` (rich snippets en accordéon)
**Page accueil** → `Organization` + `WebSite` avec `SearchAction`

Exemple Schema Event :

```typescript
{
  '@context': 'https://schema.org',
  '@type': 'Event',
  name: event.title,
  description: event.short_description,
  startDate: event.starts_at,
  endDate: event.ends_at,
  eventStatus: 'https://schema.org/EventScheduled',
  eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
  location: {
    '@type': 'Place',
    name: event.venue_name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: event.address,
      addressLocality: event.commune.name,
      postalCode: event.postal_code,
      addressCountry: 'FR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: event.location.y,
      longitude: event.location.x,
    },
  },
  image: [event.cover_image_url],
  organizer: { '@type': 'Organization', name: event.organizer },
  offers: event.booking_url ? {
    '@type': 'Offer',
    url: event.booking_url,
    price: event.price_value || '0',
    priceCurrency: 'EUR',
  } : undefined,
}
```

### Performance / Core Web Vitals

Targets :
- **LCP** < 2.5s
- **INP** < 200ms
- **CLS** < 0.1

Optimisations Next.js :
- `next/image` avec lazy loading
- WebP/AVIF auto
- Audit régulier `next/bundle-analyzer`
- Preload fonts critiques
- ISR pour les pages éditoriales
- Edge caching Cloudflare devant Next.js

### Mobile-first absolu

70%+ du trafic touristique sera mobile.
- Tap targets > 48px
- Pas de popups intrusifs
- Navigation tactile fluide
- Cartes performantes mobile (MapLibre)
- Bouton "Appeler" direct sur fiches

## Stratégie de contenu

### Règle des 3-3-3 par semaine

- **3 articles courts** (300-600 mots) — recyclage Facebook + enrichissement
- **3 fiches** créées ou mises à jour (commerces, événements, lieux)
- **1 article long** (1500+ mots) — guide ou reportage

Soit ~7 contenus/semaine, ~30/mois, ~360/an.

### Calendrier saisonnier

```
Janvier-février : Anticipation + hors-saison
  → Guides "que faire en hiver"
  → Calendrier événementiel annuel
  → Reportages tradition

Mars-avril : Préparation pic
  → "Que faire à Pâques", "ponts de mai"
  → MAJ grands guides saison
  → Reportages préparatifs

Mai-juin : Pic de production
  → Tout sur la saison qui démarre
  → Couverture événementielle dense
  → Bons plans famille, sport

Juillet-août : Maintenance + actu chaude
  → Couverture quotidienne événements
  → Conseils chaleur, plages moins fréquentées

Septembre-octobre : Patrimoine + arrière-saison
  → "Visiter hors saison" (très fort SEO)
  → Vendanges, courses fin de saison
  → Reportages mémoire vivante (peu de concurrence)

Novembre-décembre : Fond de catalogue
  → Articles evergreen
  → Préparation 2027
  → Marchés de Noël locaux
```

### Recyclage de l'archive Facebook

L'archive Facebook = trésor pour démarrer.

Process :
1. Export complet de l'archive Facebook
2. Sélection des 50-100 posts les plus engageants
3. Réécriture format article web (titre SEO, structure H2/H3, photos HD)
4. Backdating à la date originale du post
5. Republication sur Facebook avec lien vers la version enrichie

Bénéfice double : 50-100 articles de qualité dès le lancement + trafic Facebook réinjecté.

## Backlinks locaux

### Sources institutionnelles (autorité forte)

- Office de tourisme du Grau-du-Roi
- Mairies du territoire couvert
- Communauté de communes Terre de Camargue
- Parc naturel régional de Camargue
- CCI Gard et Hérault

### Sources médias et blogs

- Blogs voyage francophones (guest posts)
- Médias locaux (Midi Libre, Objectif Gard)
- Podcasts régionaux

### Sources métier

- Annuaires touristiques (Gîtes de France, Logis)
- Sites de fédérations locales

### Sources commerçants

Chaque commerçant payant doit mettre un lien depuis son propre site vers sa fiche.
→ **Inclure cette demande dans les CGV** des formules payantes.

### Stratégie relations presse

À chaque reportage exclusif, envoyer un communiqué à :
- Midi Libre (rédaction Le Grau-du-Roi)
- Objectif Gard
- France Bleu Gard Lozère
- France 3 Occitanie

L'angle "média local indépendant nouvellement créé qui révèle [info]" fonctionne bien.

## Google Search Console et Google Business Profile

### Search Console — discipline mensuelle

À configurer dès J1 du sprint 1.

Routine mensuelle :
1. Vérifier pages indexées vs connues
2. Inspecter performances (requêtes, top 10, page 2)
3. Vérifier erreurs (404, server errors, mobile usability)
4. **Requêtes en page 2** : optimiser pour passer top 5

### Google Business Profile

**Pour le média** :
- Type : "Site d'actualités" ou "Service d'information"
- Permet apparition dans recherches "médias locaux Le Grau-du-Roi"

**Pour les annonceurs** : aider à optimiser leur Google Business Profile = service à valeur ajoutée énorme à inclure dans la formule Premium.

### Google News (à terme)

Quand 50+ articles publiés, candidater via Google Publisher Center. Si accepté, multiplie le trafic potentiellement par 5-10.

## SEO image (souvent oublié)

Tourisme = image. Google Images = 15-25% du trafic potentiel.

**Optimisations obligatoires** :
- Nommage : `phare-espiguette-coucher-soleil-grau-du-roi-2026.jpg`
- Alt texts descriptifs naturels
- Captions sous les photos
- Lazy loading (sauf LCP image)
- WebP/AVIF natifs
- Tailles multiples (srcset)
- Schema ImageObject sur galeries

**Idée puissante** : page dédiée "Photos du Grau-du-Roi" avec galeries thématiques (couchers de soleil, port de pêche, courses camarguaises, archives N&B). Énorme potentiel image search.

## Stratégie multilingue (à anticiper)

Touristes étrangers : Allemands, Néerlandais, Belges, Britanniques.

Priorité pour 2027 :
- **Anglais** (prioritaire)
- **Allemand** (forte communauté camping)
- **Néerlandais** (énorme dans le Gard)

Setup : `next-intl` ou `next/i18n`. Traduction DeepL Pro + relecture humaine. ~3000 € pour 200 articles, ouvre trafic significatif.

## KPIs

### À 6 mois (déc 2026)
- 100 articles publiés
- 8 000-15 000 sessions/mois
- Top 10 sur 20-30 requêtes locales prioritaires
- 50+ backlinks de qualité

### À 12 mois (mai 2027)
- 250+ articles
- 25 000-50 000 sessions/mois
- Top 3 sur requêtes territoriales
- 150+ backlinks

### À 24 mois (saison 2028)
- 500+ articles
- 80 000-150 000 sessions/mois (pic estival)
- Référence locale incontournable

## Outils

Gratuit ou peu cher :
- Google Search Console (gratuit)
- Plausible / Matomo (RGPD)
- Ubersuggest ou Mangools (~20-40 €/mois)
- Screaming Frog (gratuit jusqu'à 500 URLs)
- PageSpeed Insights
- Schema Markup Validator

Démarrer sans aucun outil payant 3-6 mois. Mangools (~30 €/mois) ensuite.

## Plan d'action SEO 30 jours

**Semaine 1** :
- Search Console + sitemap soumis
- Google Business Profile créé
- Audit Lighthouse + corrections critiques
- Schema Article + Organization déployés

**Semaine 2** :
- 5 pages communes principales rédigées
- 10 articles republication intelligents depuis archive Facebook
- Schema Event sur tous événements à venir

**Semaine 3** :
- 3 guides thématiques saison 2026
- Schema LocalBusiness sur premières fiches
- Premier batch demandes backlinks (5 sites institutionnels)

**Semaine 4** :
- 3-4 articles éditoriaux
- Analyse premières données Search Console
- Optimisation pages déjà en page 2

→ Fin du 1er mois : ~25-30 contenus, infra SEO en place, premières métriques.

## Conseil structurant

**80% du SEO viendra de la rédactrice, 20% de la technique.**

L'essentiel du temps doit aller à la qualité du back-office éditorial (templates de structure, suggestions tags auto, prévisualisation SEO) plutôt qu'à des optimisations techniques marginales.

Inspirer du process GéoClic SEO récent : pages-piliers + landing pages thématiques + JSON-LD + Search Console.

# 26 — Architecture de collecte multi-sites (Agenda, Marchés, Découvrir)

**Document de conception. État : proposition validée en discussion, non implémentée.**
**Rédigé le 29 juillet 2026, à relire avant chaque lot.**

Ce document fige le workflow de collecte multi-sites pour GeoClic Média. Il
découle des constats vérifiés sur le corpus Le Grau-du-Roi et des décisions
prises en session. Il ne contient aucun secret. Pour l'état courant de la
production, lire d'abord [`25-reprise-llm.md`](./25-reprise-llm.md).

## 1. Objectif et contexte

Alimenter Agenda, Marchés et Découvrir depuis **un même corpus crawlé**, pour
**une quinzaine de sites hétérogènes** (mairies, offices de tourisme,
associations), sans recrawl multiple et sans envoyer l'intégralité des pages à
un LLM.

Contraintes structurantes :

- le système doit être **générique** : aucune règle propre à un site de test ne
  doit être codée en dur ;
- ajouter une ville doit être une **opération de configuration**, jamais une
  modification du pipeline ;
- la **validation humaine reste obligatoire** avant toute publication, sur tous
  les modules ;
- l'**assistant IA conserve l'intégralité du corpus** : aucune page ne doit être
  retirée de la connaissance de l'assistant pour économiser l'extraction.

## 2. Constat vérifié sur le corpus existant

Mesures réalisées en lecture seule sur le corpus Le Grau-du-Roi (29 juillet
2026, `CrawlSource.id=2`) :

- `1051` pages actives mais seulement `124` URL canoniques distinctes ;
- la page d'agrégation d'événements existe en `512` exemplaires, les fiches
  restaurants en `82`, les hébergements en `65+18` : la balise
  `<link rel="canonical">` est **générique** sur ce CMS et agrège toutes les
  fiches derrière une même URL ;
- **aucun JSON-LD `Event`** n'est présent dans le corpus (seuls
  `BreadcrumbList`, `WebSite`, `WebPage`, `ImageObject`) ;
- une classification par mots-clés génériques produit `87 %` de « pages
  événementielles » (faux positifs massifs : toute actualité contient une date
  et un mot-clé).

Conséquences :

1. L'identité de page fiable est l'**URL mise en file** (`final_url`), pas la
   canonique déclarée. Le crawler la conserve déjà correctement dans
   `_save_page` ; c'est le **comptage et l'observabilité** qui doivent offrir
   une vue dédupliquée par canonique.
2. Une classification par mots-clés métier est **exclue** : elle ne survit pas à
   un CMS et ne survivrait pas à quinze. Les signaux doivent être
   **structurels**, jamais sémantiques.
3. L'extraction événementielle dépendra souvent de l'IA ou de l'ICS (pas de
   JSON-LD `Event` garanti) : il faut donc réduire le **nombre de pages envoyées
   à l'IA**, pas chercher à supprimer l'IA.

## 3. Architecture cible

```text
15 x CrawlSource (mairie / OT / association, chacune son domaine)
        |  crawl mutualise toutes les 6 h (existant, inchange)
        v
Corpus CrawledPage  --  l'assistant IA indexe TOUT, inchange
        |
        v
MOTEUR DE SIGNAUX structurels (NOUVEAU, agnostique du contenu)
  par page : types JSON-LD, dates ISO detectees, liens ICS,
             densite de texte, canonique repetee, profondeur
        |
        v
EXTRACTEURS configures par source (jamais codes en dur)
  Agenda    : JSON-LD Event -> ICS -> IA (pages a signal fort)
  Marches   : idem, kind=market detecte par candidat
  Decouvrir : JSON-LD Place/LocalBusiness -> IA
        |
        v
Boites "A valider" par module  --  validation humaine obligatoire
        |
        v
Event (kind event | market)  +  Place
```

### Séparation des responsabilités

| Couche | Rôle | Touche l'assistant ? | Touche le crawl ? |
|---|---|---|---|
| Crawl mutualisé | récupérer les pages une fois par site | non | existant |
| Signaux structurels | mesurer chaque page, sans LLM | non | non (lecture seule du corpus) |
| Extracteurs | produire des candidats par module | non | non |
| Boîtes de validation | décision humaine avant publication | non | non |

L'assistant IA (`indexers/web_crawler.py`, `crawl_source()`) indexe
**chaque page active** (`source.pages.filter(is_active=True)`). Aucun lot de ce
document ne modifie ce comportement : le pré-filtre ne réduit que les pages
envoyées **au LLM d'extraction**, jamais la connaissance de l'assistant.

## 4. Signaux structurels (cœur du système)

Calculés sur chaque `CrawledPage`, sans aucun terme métier, valables pour tous
les sites :

| Signal | Définition | Usage |
|---|---|---|
| `jsonld_types` | ensemble des `@type` schema.org présents | extraction gratuite si `Event` / `Place` |
| `has_ics_link` | au moins un lien `.ics` / `ical` | extraction ICS gratuite |
| `has_iso_date` | au moins une date ISO 8601 dans le texte | indice d'événement |
| `text_density` | longueur du texte nettoyé | écarter pages vides/navigation |
| `canonical_shared` | canonique partagée par N>1 pages | déduplication / comptage |
| `depth` | profondeur de crawl | priorisation |

Stockage : champ JSON `signals` sur `CrawledPage` (nouveau, par défaut `{}`),
recalculé après chaque crawl et à la demande. Aucune migration destructrice.

## 5. Extracteurs

### 5.1 Agenda (existant, à brancher sur les signaux)

Ordre déjà implémenté et conservé : JSON-LD `Event` → flux ICS → IA. Le lot 2
ne change que la **sélection des pages IA** : seules les pages à signal fort
(`has_iso_date` ou `jsonld Event` ou `has_ics_link`, avec densité suffisante)
sont envoyées au LLM, au lieu de toutes les pages sans JSON-LD.

### 5.2 Marchés (détection du `kind` par candidat)

Un marché est un `Event` avec `kind=market` (modèle existant, inchangé). Le
`kind` est aujourd'hui forcé par `source.default_kind`. Le lot 3 le détecte
**par candidat**, par signaux neutres : JSON-LD, récurrence hebdomadaire
détectée dans les dates, ou configuration explicite de la source (repli). Pas
de regex métier.

### 5.3 Découvrir (nouvel extracteur)

`Place` est un modèle séparé sans pont avec le crawl. Le lot 4 ajoute :

- extraction JSON-LD `Place` / `LocalBusiness` / `TouristAttraction`
  (standards schema.org, multi-sites par nature) en priorité ;
- IA en secours, uniquement sur pages à signal lieu fort ;
- `PlaceImportCandidate` et boîte « À valider » dédiée, comme l'Agenda ;
- réutilisation du sélecteur d'image existant ;
- aucune publication automatique, provenance obligatoire.

## 6. Ordre des lots et critères de fin

| Lot | Contenu | Critère de fin |
|---|---|---|
| **1. Signaux + vue dédupliquée** | champ `signals`, recalcul, comptage par canonique, affichage admin « pages distinctes / avec JSON-LD / avec ICS » | signaux visibles en admin ; compteurs distincts corrects ; aucun changement public ; tests OK |
| **2. Pré-filtre IA générique** | l'extracteur Agenda ne consomme que les pages à signal fort | gain de segments mesuré avant/après sur corpus réel ; aucune perte d'événement validé ; tests OK |
| **3. kind=market par candidat** | détection neutre + repli config | marchés alimentés depuis le même run ; règles d'expiration conservées ; tests OK |
| **4. Extracteur Découvrir** | modèle candidat, JSON-LD Place, IA filtrée, boîte de validation, images | lieux détectés passent en validation ; aucune publication auto ; tests OK |
| **5. Onboarding multi-sites** | procédure + interface : créer source, crawl, observer signaux, brancher | ajouter une ville ne demande aucun code ; documentée |

Dépendances : le lot 1 fonde les lots 2, 3 et 4. Le lot 2 peut suivre le lot 1
sans attendre les autres. Les lots 3 et 4 sont indépendants entre eux.

## 7. Procédure d'ajout d'une ville (lot 5)

1. Créer une `CrawlSource` : `seed_url`, domaine, sitemaps, rendu HTTP/Crawl4AI.
2. Lancer un crawl, observer les signaux : JSON-LD présent ? ICS ? pages
   distinctes ?
3. Brancher l'extracteur **le moins coûteux qui fonctionne** : JSON-LD ou ICS
   d'abord, IA en repli seulement.
4. Configurer `url_patterns` de la source Agenda si un filtre est nécessaire.
5. Vérifier la boîte « À valider » avant toute publication.
6. Documenter les droits de réutilisation de la source.

## 8. Règles inchangées

- un seul crawl mutualisé par site, anti-recrawl 6 h, verrou Redis par source ;
- validation humaine obligatoire sur tous les modules ;
- aucune donnée inventée : provenance obligatoire, rejet si inconnue ;
- l'assistant IA conserve l'intégralité du corpus ;
- aucun secret dans la documentation ni le dépôt ;
- montrer le diff avant édition ; ne pousser, fusionner ou déployer qu'après
  accord explicite de Fred ;
- consulter `21-registre-routes-promesses.md` avant de retirer une route, une
  tuile ou une promesse fonctionnelle.

## 9. Décisions de session (29 juillet 2026)

- Cible : environ 15 sites hétérogènes (mairies, OT, associations).
- Découvrir : détection **automatique** depuis le crawl, avec validation
  humaine obligatoire (philosophie Agenda), pas de saisie purement éditoriale.
- Objectif double : réduire le coût/temps de l'IA **et** structurer
  l'alimentation multi-modules.
- Ubuntu hors support : exclu du périmètre de ce chantier (opération distincte).

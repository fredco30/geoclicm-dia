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

## 10. Décision Lot 2 — patterns d'URL d'abord (29 juillet 2026)

Le pré-filtre IA par signaux seuls est **abandonné comme mécanisme principal** :
sur le corpus de référence, aucun signal structurel ne distingue une fiche
événement d'une fiche commerce (gabarits identiques, dates souvent hors HTML).
Le Lot 2 retient :

- **levier principal** : `EventSource.url_patterns` (par source, générique) ;
- **complément** : signaux (JSON-LD, ICS) pour l'extraction gratuite, et
  déduplication par canonique contre le re-traitement des pages d'agrégation ;
- **report** : le système de filtres intelligent sera conçu après le crawl des
  ~15 sites, fondé sur l'observation de leurs structures réelles.

Le Lot 2 du tableau (section 6) est réinterprété en conséquence : « sélection
IA par patterns d'URL + signaux quand disponibles », non « pré-filtre par
signaux ».

## 11. Point de robustesse — indexation après réparation de crawl (30 juillet 2026)

Après la réparation d'un crawl échoué (ici le bug `signals`, migration
`assistant.0005`), l'indexation en chunks **ne se relance pas
automatiquement** : La Grande-Motte avait 477 pages mais 0 chunk jusqu'à une
relance manuelle en tâche Celery. Futur lot de robustesse : déclencher
l'indexation automatiquement après tout crawl réussi qui succède à un échec.

Ce crawl multi-villes (4 corpus réels : Le Grau-du-Roi, La Grande-Motte,
Aigues-Mortes, Saint-Laurent) fournit les données pour **reprendre l'étude du
système de filtres** (section 10) sur structures hétérogènes réelles, au lieu
des suppositions initiales.

## 12. Décision filtres — automatique, jamais exposé à l'admin (30 juillet 2026)

**Constat produit** : en production, les admins ne sont pas informaticiens et ne
peuvent ni choisir des patterns d'URL ni valider une recommandation technique.
Toute configuration de filtre exposée à l'admin est donc exclue.

**Décision (Voie A, validée)** : le filtre de sélection des pages pour l'IA est
**automatique**, avec un garde-fou de sécurité — **en cas de doute, inclure
plutôt qu'exclure**. On préfère envoyer une page de trop à l'IA que d'en rater
une. Le filtre réduit le **coût IA**, jamais la couverture : le crawl complet,
l'extraction gratuite (JSON-LD/ICS) et le cache par segment continuent de
tourner. Si une ville est mal détectée, la correction relève de l'exploitation
technique (Fred/Codex), jamais de l'admin.

Le rôle de l'admin reste inchangé et suffisant : **valider les événements**
dans la boîte « À valider » (titre, date, lieu, image).

Fondé sur l'analyse des 4 corpus réels : aucun site n'a de JSON-LD Event ni
d'ICS ; les segments d'URL événementiels diffèrent par site (`/evenement/`,
`/agenda/`, `-apidae`, ou structure multilingue `/en/ /de/ /es/ /it/`).

## 13. Règle de filtre validée sur chiffres réels (30 juillet 2026)

Validée avec Fred sur l'analyse des 4 corpus. Le filtre automatique calcule,
par source, la densité événementielle de chaque segment d'URL (pages avec date
OU bloc factuel), puis :

1. **retient** les segments à densité élevée ;
2. **écarte** seulement les segments clairement non événementiels (peu de
   dates, beaucoup de pages) ;
3. **inclut en cas de doute** — y compris les segments d'actualités, qui
   peuvent annoncer un événement (coût IA faible, sécurité maximale) ;
4. **déduplique les traductions** (segments `/en/ /de/ /es/ /it/` détectés
   comme même structure) : seule la langue principale est traitée ;
5. **repli sûr** : si aucun segment ne ressort clairement (cas La
   Grande-Motte), tout est envoyé à l'IA, comme aujourd'hui — pas de
   régression.

Gains estimés sur les corpus réels : Le Grau-du-Roi ~49 %, Saint-Laurent
~75 %, Aigues-Mortes ~71 % (grâce à la déduplication des traductions), La
Grande-Motte 0 % (repli sûr accepté).

## 14. Architecture finale — une passe IA multi-catégories (30 juillet 2026)

**Décision validée avec Fred** : une seule passe d'analyse IA par page, qui
récupère et classe **toutes les catégories définies** (événements, marchés,
lieux, et toute catégorie future), au lieu d'un passage par catégorie.

Principes :

- **Voie A prudente** : on envoie tout le corpus à l'IA (on ne perd aucune
  information) ; le filtre automatique se limite à la déduplication des
  traductions et à l'exclusion des pages de navigation pure ;
- **une passe, plusieurs sorties** : la même page analysée une fois produit un
  événement, un marché ou un lieu selon son contenu — coût IA inchangé,
  couverture maximale ;
- **catégories extensibles** : la liste des catégories à extraire est une
  configuration du pipeline, pas du code métier ; ajouter une catégorie (ex.
  « hébergements », « commerces ») ne doit pas demander de nouveau passage ;
- **validation humaine par boîte** : chaque catégorie a sa boîte « À valider »
  (Agenda, Marchés, Découvrir…) ; aucune publication automatique ;
- **provenance obligatoire** : jamais d'invention, rejet si la page source est
  inconnue ;
- l'assistant IA conserve l'intégralité du corpus, inchangé.

Ordre de mise en œuvre : commencer par les **lieux** (Découvrir), seul module
non alimenté, puis généraliser la passe multi-catégories.

## 15. Mise en œuvre — passe multi-catégories (30 juillet 2026)

Implémentation de la section 14, en cours de validation avant déploiement.

**Constat d'entrée (vérifié en lecture seule sur le VPS)** : 3250 pages actives
sur 4 corpus (Le Grau-du-Roi 1051, Saint-Laurent 1015, Aigues-Mortes 696,
La Grande-Motte 488), **aucun JSON-LD Place/Event** — l'extraction gratuite
est impossible, tout passe par l'IA (Voie A). Potentiel mesuré par mots-clés :
restaurant 913 pages, hébergement 873, patrimoine 563, plage 562, marché 486.

**Composants livrés** :

- discovery.PlaceImportCandidate (migration  002) : miroir du candidat
  Agenda pour les lieux, avec provenance, preuve vérifiée et statuts.
- discovery/multi_extraction.py : une passe IA par page classant son contenu
  en events / markets / places (prompt dédié, version multi-v1),
  provenance validée, doublons de segments fusionnés. Réutilise _call_ai
  (budget + audit) rendu paramétrable en prompt système.
- discovery/multi_sync.py : routage — lieux vers la boîte Découvrir,
  événements et marchés vers la boîte Agenda existante (kind=market pour les
  marchés, lot 3 résolu par le même passage). Import Place + image officielle.
- API dmin/place-imports/ (approve/reject), miroir de dmin/event-imports/.
- Boîte « Candidats » Découvrir au front (validation humaine commune/catégorie).
- Tâches Celery discovery.multi_extract_source / multi_extract_all.

**Règles conservées** : le pipeline Agenda existant (EventSource) tourne
inchangé ; l'assistant indexe tout le corpus ; aucune publication automatique ;
provenance obligatoire. La résolution de l'utilisateur porteur de l'appel IA
réutilise le créateur de la source Agenda adossée, sinon le premier superuser.

**À valider au réveil** : coût/durée d'une passe complète sur 3250 pages
(Qwen3.5-9B, ~1 requête/page), qualité des candidats lieux et marchés produits,
puis décision de planification automatique (tâche périodique) ou déclenchement
manuel par source.
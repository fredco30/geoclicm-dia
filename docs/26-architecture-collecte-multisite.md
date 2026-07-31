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

Implémentation de la section 14, **déployée en production** (merge #92, migration discovery.0002).

**Constat d'entrée (vérifié en lecture seule sur le VPS)** : 3250 pages actives
sur 4 corpus (Le Grau-du-Roi 1051, Saint-Laurent 1015, Aigues-Mortes 696,
La Grande-Motte 488), **aucun JSON-LD Place/Event** — l'extraction gratuite
est impossible, tout passe par l'IA (Voie A). Potentiel mesuré par mots-clés :
restaurant 913 pages, hébergement 873, patrimoine 563, plage 562, marché 486.

**Composants livrés** :

- discovery.PlaceImportCandidate (migration 002) : miroir du candidat
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
### Résultats de déploiement et pilote (30 juillet 2026, nuit)

- Déployé sur media.geoclic.fr : migration discovery.0002 appliquée, front
  reconstruit, 4 services redémarrés, backup PostgreSQL préalable (275 Mo).
- Route dmin/place-imports/ résolue ; boîte « Candidats » Découvrir testée
  réellement sur Chromium (onglets « À valider »/« Incomplets », état vide
  propre) ; non-régression Agenda vérifiée (onglets « À valider »/« Incomplets »
  /« Expirés » intacts).
- Pilote IA réel (3 pages du Grau-du-Roi, Qwen3.5-9B) : extraction multi-catégories
  fonctionnelle — lieu « Phare de l'Espiguette » (hint patrimoine, commune
  résolue), 1 événement, provenance validée. Le routage en base est vérifié :
  catégorie « Patrimoine » et commune résolues, candidats créés en pending/
  invalid selon complétude, sans publication.
- **Coût mesuré** : ~24 s/page nominal, jusqu'à ~200 s sur timeout OVH
  (EVENT_AI_HTTP_TIMEOUT=100, 2 tentatives). Pour 3250 pages → plusieurs
  heures : la passe complète doit tourner en tâche Celery de fond, jamais en
  requête web.

### Point d'exploitation — routage Agenda par ville

Le routage événements/marchés vers la boîte Agenda exige une EventSource
adossée au corpus. Aujourd'hui **seule Le Grau-du-Roi** en a une
(EventSource.id=1, crawl_source=2). Les lieux (Découvrir) sont routés pour
les 4 corpus sans condition. Pour alimenter l'Agenda des 3 autres villes,
créer une EventSource par corpus (configuration, pas de code).

## 16. Bascule provider DeepSeek (30 juillet 2026)

L'extracteur multi-catégories utilisait OVH (Qwen3.5-9B) : ~24 s/page nominal,
jusqu'à ~200 s sur timeout (EVENT_AI_HTTP_TIMEOUT=100, 2 tentatives). Pour
3 250 pages, une passe complète prenait plusieurs heures et s'étouffait sur les
timeouts.

**Décision (validée avec Fred) : basculer l'extraction Agenda/Découvrir sur
DeepSeek** (API compatible OpenAI), déjà utilisée sur ce serveur par une autre
application (AE_Gestion). Aucun impact sur les embeddings (Mistral, inchangés).

Implémentation :
- `EVENT_AI_PROVIDER=deepseek` (config, pas de code métier modifié).
- `_provider_config` / `_call_ai` (events/ai_extraction.py) : branche
  `deepseek` réutilisant `generate_openai_compatible` (budget, reprises,
  journal d'audit), endpoint `events.extract.deepseek`.
- Settings `DEEPSEEK_BASE_URL` (https://api.deepseek.com), `DEEPSEEK_API_KEY`
  (copiée depuis l'.env AE_Gestion, jamais commitée), `DEEPSEEK_MODEL`
  (défaut `deepseek-v4-flash` ; `deepseek-chat` est un alias qui résout vers
  ce modèle).
- Tarifs ajoutés dans ai_assist/services/pricing.py (deepseek-v4-flash/pro)
  pour journaliser un coût réaliste au lieu de 0.

Mesures de validation (VPS, code de production) :
- Petites pages : ~1,4 s/page, 6/6 JSON valide, 0 timeout.
- Grosses pages (12-18k, Aigues-Mortes) : 6/6 JSON valide, 17 lieux extraits,
  latences 0,8-17 s (vs ~24 s + timeouts sur Qwen).
- Appel réel via `_call_ai` : provider DeepSeek, model deepseek-v4-flash,
  ~1,5 s, JSON valide, coût journalisé.

Soit environ **15-20x plus rapide** qu'OVH sur ce corpus, sans perte de JSON.

### Suite à décider

- Passe complète multi-catégories relancée en tâche de fond (lots Celery,
  short_first) : mesurer coût/durée/qualité sur les 4 corpus.
- Planification automatique (tâche périodique) **ou** déclenchement manuel par
  source, après retour sur la qualité des candidats produits.
- Repli possible : EVENT_AI_PROVIDER=ovh ou mistral (configuration).

## 17. Cache IA par page (30 juillet 2026)

Problème : chaque passe multi-catégories renvoyait TOUTES les pages à l'IA, même
inchangées -> coût complet (~4-5 EUR pour 2 400 pages) à chaque collecte, y
compris la collecte hebdomadaire de routine.

Décision (validée avec Fred) : ne renvoyer à l'IA que les pages dont le contenu
(ou le prompt/provider) a changé depuis la dernière analyse.

Implémentation :
- Champ `CrawlSource.multi_extraction_cache` (JSON, migration assistant 0006) :
  `{cle_segment: {events, markets, places}}`.
- `extract_multi(..., crawl_source=...)` : pour chaque segment, la clé est
  `sha256(provider + model + prompt_version + segment)`. Si elle est déjà en
  cache, le résultat est réutilisé SANS appel IA ; sinon l'IA est appelée et le
  résultat mis en cache (persisté en une écriture à la fin, en ne gardant que
  les clés du corpus actuel).
- Toute modification de page, du prompt (PROMPT_VERSION) ou de provider
  invalide naturellement la clé -> re-analyse ciblée, jamais de données périmées.
- La déduplication des candidats est inchangée (update_or_create ; les candidats
  validés/rejetés/importés sont préservés). Pas de doublon en re-passe.

Effet attendu : la collecte hebdomadaire ne coûte que les vraies nouveautés
(pages modifiées), pas tout le site. Première passe après déploiement remplit
le cache (coût plein) ; les suivantes sont quasi gratuites hors changements.

Non testé en réel le jour J : cap budgétaire journalier (5 EUR) atteint par la
grosse passe initiale. Test de non-régression (cache -> 0 appel IA) à rejouer
le lendemain ou après relevé du quota.

## 18. Categories Decouvrir enrichies (31 juillet 2026)

Constat (remonté par Fred, confirmé par les données prod) : la catégorie
« Savoir-faire » était un fourre-tout (40% des lieux) car l IA était limitée à
6 catégories. Activités sportives, restaurants et campings y étaient mal classés.

Décision : ajouter 3 catégories — **Activités & Sports**, **Gastronomie**,
**Hébergements** (slugs activites-sports, gastronomie, hebergements).
Les commerces/services (borne de recharge, cyber, boutiques) ne restent PAS dans
Découvrir : à terme ils iront dans le module Commerçants via un chantier dédié
(extraction + BusinessImportCandidate + boîte de validation), pas encore fait.

Implémentation :
- seed_place_categories : 9 catégories.
- CATEGORY_HINT_SLUGS + SYSTEM_PROMPT mis à jour (règle 7 : choisir la catégorie
  la plus précise ; définitions des 3 nouvelles).
- Reclassement des 378 candidats existants SANS IA : règles par mots-clés sur
  titre+description (hébergements sur titre seul + exclusion « hôtel de ville »,
  gastronomie puis activités). 134 lieux reclassés, 0 appel IA, 0 coût.

Nouvelle répartition (pending) : Activités & Sports 82, Patrimoine 77,
Savoir-faire 76, Gastronomie 50, Nature 35, Balades 30, Plages 22,
Points de vue 4, Hébergements 2.

Attention : le nouveau prompt (règle 7) diffère de celui ayant produit le cache
IA actuel -> la prochaine collecte ré-analysera tout (coût plein ~4-5 EUR) mais
classera correctement dès le départ. Reporté à la prochaine vraie collecte.

## 19. Module Commerçants alimenté par le crawl (31 juillet 2026)

Suite de §18 : les commerces/services ne restent plus dans Découvrir. La passe
IA multi-catégories produit désormais une quatrième clé "businesses" (commerce,
artisan ou service établi : boutique, atelier, borne de recharge, cybercafé,
banque, agence...). Restaurants, hébergements et prestataires de loisir restent
dans "places" (gastronomie, hebergements, activites-sports) — le prompt le dit
explicitement pour éviter les doubles emplois.

Implémentation (miroir exact du pipeline Découvrir) :
- `directory.BusinessImportCandidate` + migration `directory.0004` (mêmes
  champs que PlaceImportCandidate, adaptés à Business : phone, email, website,
  postal_code, city ; catégorie = BusinessCategory).
- `PROMPT_VERSION = "multi-v2"` : le cache IA par page (§17) est invalidé par
  construction, la prochaine passe ré-analyse tout (coût plein ~4-5 EUR) et
  produit events + markets + places + businesses en une analyse par page.
- `normalize_business` : catégorie résolue uniquement si le hint IA correspond
  exactement (nom ou slug) à une BusinessCategory active — aucun rapprochement
  flou, sinon la fiche part en « Incomplets » et l'humain choisit. Preuve
  textuelle vérifiée dans la page (même règle que lieux).
- Routage dans `_route_results` : commerce principal par page (même règle de
  recoupement titre de page que les lieux) + dédup par empreinte
  nom+localité normalisés sur tout le corpus.
- Boîte « À valider » Commerçants : `GET/PATCH/POST /api/admin/business-imports/`
  (approve/reject, commune+catégorie requises) et page front
  `/admin/directory/imports` (onglets « À valider »/« Incomplets », pagination
  50/page), bouton « Candidats » ajouté sur `/admin/directory/businesses`.
  L'approbation crée le Business publié (plan free, owner=null, is_claimed=false,
  image officielle téléchargée dans cover_image via sync_business_cover_image,
  mêmes bornes que les lieux : 5 Mo max, jpg/png/webp, uniquement si cover vide).

Vérifications (31 juillet 2026, local) : `manage.py check` OK,
`makemigrations --check` : aucun changement détecté (migration manuscrite
cohérente), 20 tests `apps.discovery` OK (dont 9 nouveaux : routage clé
businesses, cache ancien sans la clé, normalisation/hint/preuve/empreinte,
téléchargeur d'image partagé lieux/commerces),
`tsc --noEmit` et ESLint OK côté front.

À faire au déploiement : appliquer `directory.0004`, puis relancer une passe
multi-catégories complète (cache invalidé -> coût plein). Les candidats
commerces arriveront dans la boîte « À valider » Commerçants ; aucune
publication automatique, validation humaine obligatoire (règle inchangée §8).

## 20. Annonces (emploi, locations) et Associations (31 juillet 2026)

Décisions d'une réunion de travail (Fred) :
- **Offres d'emploi** : alimentées par le crawl, liées à la source
  terredecamargue.fr (WordPress, type de contenu `offre-emploi`, ~7 offres
  actives constatées le 31/07 ; flux RSS `/offre-emploi/feed/` en 500, API
  REST WP désactivée -> crawl HTML classique).
- **Pharmacies & médecins de garde** : rubrique manuelle, hors flux d'annonces.
  À gérer dans `utility.UsefulContact` (rubrique « Pratique », category_label
  dédié) — aucun dev. La valeur stockée doit être une URL/numéro de garde
  officiel (les gardes tournent), pas une liste figée.
- **Locations annuelles** (La Grande-Motte, Le Grau-du-Roi, Aigues-Mortes) :
  offres ET demandes, saisie **manuelle** (pas de crawl). Les gros portails
  d'annonces (Leboncoin, SeLoger...) interdisent le scraping dans leurs CGU et
  se protègent techniquement : non recommandé. Un partenariat flux avec une
  agence locale reste possible plus tard.
- **Associations** : catégorie racine « Associations » dans l'annuaire
  Commerçants (BusinessCategory), alimentée par le crawl via la clé
  "businesses" de la passe IA (hint exact "Associations").

Choix d'architecture : les annonces emploi/locative sont des contenus datés qui
expirent, distincts de l'Agenda (événements), de Découvrir (lieux pérennes) et
de l'annuaire (fiches établies). Un nouveau module **`listings`** est créé
(voie A validée) plutôt que de tordre un module existant.

Implémentation :
- App `apps.listings` : `ListingCategory` (emploi, locations annuelles —
  seed_listing_categories), `Listing` (annonce avec `expires_at`, statuts
  draft/published/expired/archived, commune nullable = intercommunal),
  `ListingImportCandidate` (miroir Découvrir/Commerçants).
- `PROMPT_VERSION = "multi-v3"` : 5e clé `listings` dans la passe IA (emploi).
  Le cache IA par page est invalidé par construction.
- `normalize_listing` : catégorie par hint exact (emploi -> offres-d-emploi) ;
  `application_url` conservée **uniquement** si présente dans les liens de la
  page (pas d'URL inventée) ; preuve textuelle vérifiée ; pas d'erreur si
  commune non résolue (annonce intercommunale possible).
- Routage `_route_results` : annonce « sujet principal » par page + dédup par
  empreinte titre+localité.
- `directory` : seed 9 catégories racines (ajout « Associations », 6
  sous-catégories, schema_type NGO) ; le prompt IA route les associations vers
  businesses avec hint "Associations".
- API publique `/api/listings/` (publiées ET non expirées seulement),
  `/api/listing-categories/` ; admin `/api/admin/listings/` (CRUD),
  `/api/admin/listing-imports/` (approve/reject, catégorie requise).
- Front public : `/emploi` et `/locations-annuelles` (liste + détail,
  composants partagés `makeListingListPage` / `makeListingDetailPage`,
  `ListingCard`), filtre par commune, pagination.
- Front admin : nav « Annonces », liste `/admin/annonces` (avec boutons
  Candidats + Nouvelle annonce), boîte de validation `/admin/annonces/imports`
  (onglets À valider/Incomplets), formulaire CRUD `/admin/annonces/new` et
  `/admin/annonces/[slug]/edit`.

Vérifications (31 juillet 2026, local) : `manage.py check` OK, aucune migration
en suspens, routes résolues (4 viewsets), 24 tests `apps.discovery`+`listings`
OK (dont clé listings, normalisation, drop d'URL de candidature hors-page),
`tsc --noEmit` et ESLint OK côté front.

À faire au déploiement : appliquer `listings.0001` + `directory.0004`, lancer
`seed_listing_categories` et `seed_business_categories`, ajouter
terredecamargue.fr comme CrawlSource (kind office de tourisme, commune vide =
intercommunal), puis relancer la passe multi-catégories (coût plein ~4-5 EUR).


## 21. Fra?cheur des dates d'?v?nements (correctif multi-v4 / events-v4)

Constat (31 juillet 2026, prod) : des ?v?nements encore actifs remontaient avec
des dates anciennes (? Terre de Sport ? affich? au 13 juin 2022, ? Cryptors in
the City ? et plusieurs march?s au 1 janv. 2024). Cause : les fiches WordPress /
OT r?currentes ne sont pas mises ? jour chaque ann?e. Le texte donne un jour et
un mois sans ann?e (? du 13 juin au 18 septembre ?), et la seule ann?e pr?sente
sur la page est sa date de publication (2022) que l'IA reprenait ; ? d?faut de
date elle fabriquait un ? 1 janvier ? d'une ann?e d?duite.

Correctifs :

- **Dates de page crawl?es** : `_parse_html` (shared_crawl) stocke d?sormais
  `published_at` / `modified_at` dans `CrawledPage.metadata` (meta HTML
  `article:published_time`, `dc.date`, `itemprop=datePublished`, etc.).
  `discovery/page_dates.resolve_page_dates` compl?te depuis le JSON-LD
  (`datePublished` / `dateModified`, y compris dans `@graph`) et normalise en
  ISO `YYYY-MM-DD`. Ces dates sont un **rep?re de fra?cheur de page**, jamais
  une date d'?v?nement.
- **Prompt IA** : la date du jour (`today`) est inject?e dans chaque requ?te,
  et `page_dates` est joint ? chaque segment. Nouvelles r?gles : date sans
  ann?e -> prochaine occurrence future par rapport ? `today` ; ne jamais
  utiliser l'ann?e de publication de la page comme ann?e de l'?v?nement ; si
  aucune date r?elle et future n'est d?terminable -> `occurrences: []` (pas de
  1er janvier fabriqu?) ; une activit? permanente (? toute l'ann?e ?, jeu de
  piste, parcours) va dans `places`, pas dans `events`/`markets` ; pas
  d'?v?nement/march? sans date, jour r?current ou saison explicitement dat?s.
- **Versions de prompt** bump?es (`multi-v4`, `events-v4`) pour neutraliser les
  caches de segments calcul?s avec l'ancien prompt.
- **Back-office Agenda** : un candidat sans occurrence dat?e affiche
  ? R?currence ou p?riode non dat?e ? ? pr?ciser ? suivi de la preuve textuelle,
  au lieu d'un faux `1 janv. 2024`. Le bouton ? Approuver ? reste bloqu? tant
  qu'aucune date n'est renseign?e (validation humaine).

V?rifications (1 ao?t 2026, local) : `py_compile` OK sur les modules touch?s,
29 tests `apps.discovery` OK (dont `test_page_dates` : priorit? meta, repli
JSON-LD, `@graph`, valeurs invalides ?cart?es ; et propagation `today` +
`page_dates` au prompt), `tsc --noEmit` et ESLint OK c?t? front.

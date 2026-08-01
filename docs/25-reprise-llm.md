# 25 — Reprise GeoClic Média par un LLM

**Document prioritaire de reprise. État vérifié le 1er aoùt 2026.**

Ce fichier donne l'état réellement observé du dépôt et de la production. Il
prévaut sur les statuts historiques des anciens documents et ne contient aucun
secret. Les compteurs du crawl sont temporels : toujours les relire sur le VPS.

## 1. État immédiat

| Élément | Valeur vérifiée |
|---|---|
| Dépôt | `fredco30/geoclicm-dia` |
| Branche de production | `main` |
| Version déployée | `main`, lot validation en masse `86afcee` |
| Domaine | `https://media.geoclic.fr` |
| VPS | `135.125.159.142`, utilisateur `ubuntu` |
| Dépôt serveur | `/var/www/geoclicmedia` |
| Services | Django, Next.js, Celery worker et beat actifs |
| IA extraction | DeepSeek (`deepseek-v4-flash`), embeddings Mistral inchangés |
| Prompts | `multi-v4` / `events-v4` (dates fiables) |
| Candidats à valider | events 111, places 720, commerces 212, annonces 5 |
| Source 6 « terre de camargues » | recrawl lancé par sentinelle après multi-v4 |

Le healthcheck répond :

```json
{"status": "ok", "service": "geoclicmedia-api"}
```

## 2. Règles de travail

1. Vérifier le code, GitHub et le VPS ; ne pas transformer un ancien plan en
   fait actuel.
2. Montrer le diff avant une modification importante.
3. Ne pousser, fusionner ou déployer qu'après accord explicite de Fred.
4. Préserver `.claude/`, `.env` et `back/.env.backup-*`.
5. Ne jamais committer, afficher ou recopier un secret dans la documentation.
6. Lire `21-registre-routes-promesses.md` avant de supprimer une route, une
   tuile ou une promesse fonctionnelle.
7. Conserver la validation humaine obligatoire avant publication.
8. Mettre à jour ce fichier et `14-journal-avancement.md` après un lot majeur.

## 3. Livraisons récentes

| PR | Merge | Contenu |
|---|---|---|
| `#79` | `b1be020` | identité des pages événement préservée |
| `#80` | `8696639` | extraction OVH reprenable et progression admin |
| `#81` | `4ee16d4` | timeout OVH ramené à 100 s et 2 tentatives |
| `#84` | `06a84e9` | images événementielles et candidats expirés |
| `#85` | `13c9afa` | chargement différé des images candidates |
| `#86` | `7d9c51f` | pagination serveur des candidats admin |

Commits fonctionnels associés :

- `330a422 feat: fiabiliser l'extraction Agenda avec OVH` ;
- `cc69942 fix: borner les délais OVH de l'Agenda`.

Le checkout local était aligné sur `origin/main` lors de cette mise à jour.
Le dossier `.claude/` est non suivi et ne doit pas être ajouté.

## 4. Pipeline actuel

```text
Site officiel
  ↓
CrawlSource partagé
  ├─ HTTP
  ├─ Crawl4AI pour le JavaScript
  └─ CrawledPage : HTML, texte, liens, image, JSON-LD, empreinte
       ↓
EventSource
  ├─ réutilisation du corpus frais
  ├─ JSON-LD Event prioritaire
  ├─ ICS prioritaire
  └─ IA seulement pour le contenu restant
       ↓
Cache IA par segment, sauvegardé après chaque succès
       ↓
Fusion, normalisation, provenance, dédoublonnage
       ↓
EventImportCandidate
       ↓
Boîte admin « À valider »
       ↓ validation humaine
Event + EventOccurrence
```

### Mutualisation et anti-recrawl

- le même `CrawlSource` alimente l'Assistant et l'Agenda ;
- `max_pages=0` supprime l'ancien plafond métier de 30 pages ;
- `SHARED_CRAWL_HARD_LIMIT=5000` reste une garde technique ;
- `SHARED_CRAWL_FRESHNESS_SECONDS=21600` réutilise pendant six heures un
  corpus `ok` ou `partial` contenant des pages actives ;
- Redis verrouille chaque source pour éviter deux crawls simultanés ;
- un recrawl forcé reste possible depuis l'admin ;
- l'Agenda ne doit pas lancer un crawler parallèle au corpus partagé.

### Corpus Le Grau-du-Roi

- `CrawlSource.id=2`, libellé `OT le grau du roi` ;
- état relevé : `partial` ;
- dernière collecte relevée : `28 juillet 2026 19:51:37 UTC` ;
- `1045` pages actives ;
- `EventSource.id=1`, libellé `ot le grau du roi` ;
- `510` segments IA calculés.

Un crawl `partial` conserve les pages réussies. Les anciennes pages ne sont
désactivées qu'après un cycle complet sans échec ni troncature.

## 5. Extraction OVH

Configuration de production :

```dotenv
EVENT_AI_PROVIDER=ovh
EVENT_AI_MODEL=Qwen3.5-9B
EVENT_AI_HTTP_TIMEOUT=100
EVENT_AI_MAX_ATTEMPTS=2
OVH_AI_ENDPOINTS_BASE_URL=https://oai.endpoints.kepler.ai.cloud.ovh.net/v1
OVH_AI_ENDPOINTS_ACCESS_TOKEN=<secret serveur uniquement>
```

Décisions :

- `reasoning_effort=none` pour obtenir directement le JSON ;
- segments de 12 000 caractères, chevauchement de 1 000 ;
- cache indexé par fournisseur, modèle, contenu et version du prompt ;
- succès, y compris une réponse vide, sauvegardé immédiatement ;
- échec isolé sans arrêt du run ;
- reprise sans retraiter les segments réussis ;
- Mistral reste le repli si OVH n'est pas configuré ;
- les embeddings restent sur `mistral-embed` pour éviter une migration
  pgvector et une réindexation non mesurées.

Mesures réelles :

- test Qwen JSON : environ `2,07 s` ;
- réponse riche réussie : `87 s` ;
- ancien plafond `120 s x 3` : échec après `363,5 s` ;
- plafond actuel `100 s x 2` : même échec après `201,4 s` ;
- un redémarrage a repris à partir des `39` segments déjà en cache.

## 6. Pourquoi « À valider » est vide

Ce n'est pas une absence de détection. Au relevé du 29 juillet :

- `386/510` segments réussis ;
- `378` événements dans `EventSource.ai_extraction_cache` ;
- `EventImportCandidate=0` ;
- `Event=0`.

`extract_events()` termine actuellement tous les segments avant de rendre la
main à `sync_event_source()`. La fusion, la normalisation, les preuves de
provenance, le dédoublonnage et `_upsert_candidate()` n'arrivent qu'ensuite.

Conséquence : **À valider** paraît vide pendant plusieurs heures alors que des
événements sont déjà détectés.

### Prochain chantier recommandé : candidats progressifs

1. normaliser chaque lot réussi ;
2. créer ou mettre à jour par empreinte, de manière idempotente ;
3. conserver un statut provisoire jusqu'à la consolidation finale ;
4. empêcher une validation si les contrôles finaux manquent ;
5. fusionner les occurrences issues du chevauchement ;
6. afficher « détecté », « provisoire », « prêt à valider » et les erreurs ;
7. tester interruption, reprise et absence de doublon.

Ne pas exposer directement les 378 objets bruts : certains peuvent encore être
fusionnés ou rejetés par les contrôles de provenance.

## 7. Code à lire avant de modifier le pipeline

- `back/apps/assistant/services/shared_crawl.py` ;
- `back/apps/events/imports.py` ;
- `back/apps/events/ai_extraction.py` ;
- `back/apps/events/crawl4ai_client.py` ;
- `back/apps/events/models.py` ;
- `back/apps/events/serializers.py` ;
- `back/apps/ai_assist/services/openai_compatible.py` ;
- `back/apps/ai_assist/services/pricing.py` ;
- `back/config/settings/base.py` ;
- `front/src/components/admin/event-sources-admin.tsx` ;
- `front/src/components/admin/event-imports-admin.tsx` ;
- `front/src/types/api.ts`.

Tests :

- `back/apps/events/tests/test_ai_extraction_unit.py` ;
- `back/apps/assistant/tests/test_shared_crawl_unit.py` ;
- `back/apps/ai_assist/tests/test_openai_compatible_unit.py`.

Migrations importantes :

- `assistant.0003_shared_crawl_pipeline` ;
- `events.0003_shared_crawl_source` ;
- `events.0005_eventsource_connector_auto` ;
- `events.0006_eventsource_ai_completed_parts_and_more`.

## 8. Routes

Administration :

- `/admin/agenda/sources` ;
- `/admin/agenda/imports` ;
- `/api/admin/event-sources/` ;
- `/api/admin/event-sources/<id>/run/` ;
- `/api/admin/event-imports/` ;
- `/api/admin/event-imports/<id>/approve/` ;
- `/api/admin/event-imports/<id>/reject/`.

Public :

- `/agenda` et `/agenda/<slug>` ;
- `/marches` ;
- `/api/events/`.

Une route admin hors session peut répondre `307` vers la connexion.

## 9. Validation locale

```powershell
$env:GDAL_LIBRARY_PATH='C:\Program Files\QGIS 3.40.14\bin\gdal312.dll'
$env:GEOS_LIBRARY_PATH='C:\Program Files\QGIS 3.40.14\bin\geos_c.dll'
.\back\.venv\Scripts\python.exe back\manage.py check
.\back\.venv\Scripts\python.exe back\manage.py makemigrations --check --dry-run
.\back\.venv\Scripts\python.exe back\manage.py test `
  apps.ai_assist.tests.test_openai_compatible_unit `
  apps.events.tests.test_ai_extraction_unit `
  --settings=config.settings.dev
cd front
npm run lint
$env:NODE_OPTIONS='--max-old-space-size=4096'
npm run build
```

Ne pas conclure sur PostgreSQL de production depuis la base locale si le
tunnel n'est pas ouvert.

## 10. Serveur et déploiement

Clé SSH de déploiement observée :

```text
C:\Users\Fred\.ssh\geoclic_deploy\codex_geoclic
```

Contrôle en lecture seule :

```bash
cd /var/www/geoclicmedia
git branch --show-current
git rev-parse --short HEAD
git status --short
git fetch origin
git rev-list --left-right --count HEAD...origin/main
sudo systemctl is-active \
  geoclicmedia-django geoclicmedia-next \
  geoclicmedia-celery-worker geoclicmedia-celery-beat
curl -fsS https://media.geoclic.fr/healthz/
```

Sauvegarde avant déploiement :

```bash
cd /var/www/geoclicmedia
bash deploy/backup-pg.sh
ls -lh /var/backups/geoclicmedia/ | tail
```

Backend, seulement après accord :

```bash
git pull --ff-only origin main
cd back
source .venv/bin/activate
python manage.py check
python manage.py makemigrations --check --dry-run
python manage.py migrate
python manage.py collectstatic --noinput
sudo systemctl restart \
  geoclicmedia-django geoclicmedia-celery-worker geoclicmedia-celery-beat
```

Frontend, seulement s'il a changé :

```bash
cd /var/www/geoclicmedia/front
rm -rf .next
NODE_OPTIONS="--max-old-space-size=4096" npm run build
sudo systemctl restart geoclicmedia-next
```

Redémarrer Celery interrompt une extraction. Les succès restent en cache, mais
il faut clôturer honnêtement le run interrompu puis relancer la source.

## 11. Diagnostic du run

Dans `back`, avec le virtualenv et les paramètres de production :

```python
from apps.events.models import (
    Event, EventImportCandidate, EventImportRun, EventSource,
)

s = EventSource.objects.get(pk=1)
r = EventImportRun.objects.filter(source=s).order_by("-id").first()
cache = s.ai_extraction_cache or {}
detected = sum(
    len(value.get("events", []))
    for value in cache.values()
    if isinstance(value, dict)
)

print(s.last_status, s.ai_completed_parts, s.ai_total_parts, s.ai_failed_parts)
print("cache", len(cache), "détectés", detected)
print("run", r.id, r.status, r.discovered_count, r.created_count, r.error_count)
print("candidats", EventImportCandidate.objects.filter(source=s).count())
print("publiés", Event.objects.count())
```

`run.discovered_count` et les candidats restent à zéro jusqu'à la consolidation
finale dans l'architecture actuelle.

## 12. Après la fin du run

1. vérifier le statut terminal et les erreurs ;
2. comparer cache, événements normalisés et candidats ;
3. contrôler titre, dates, lieu, commune, catégorie, coordonnées, provenance,
   image et droits dans `/admin/agenda/imports` ;
4. ne valider qu'un candidat factuellement vérifié ;
5. vérifier sa fiche publique et son affichage carte ;
6. contrôler `/agenda`, `/marches` et `/api/events/` ;
7. relancer la source et prouver l'absence de doublon ;
8. mesurer coût, durée, taux d'échec et candidats utiles.

## 13. Priorités

1. corriger les images événementielles et le tri automatique des dates selon
   le prochain lot décrit en section 15 ;
2. terminer et qualifier le premier import ;
3. créer les candidats progressivement sans affaiblir le dédoublonnage ;
4. réduire les 510 segments par de meilleurs signaux de pages événement, sans
   réintroduire une limite arbitraire ;
5. automatiser et tester la restauration des sauvegardes ;
6. préparer la mise à niveau de l'Ubuntu hors support ;
7. documenter les droits de réutilisation des sources.

## 14. Ne pas affirmer sans nouvelle vérification

- que le run est terminé ;
- que 378 objets bruts donneront 378 candidats ;
- que les images et coordonnées sont correctes ;
- qu'un événement est publié ;
- que le second passage est idempotent ;
- que le statut `partial` du crawl est sans conséquence ;
- que MiaMapa est une source autorisée ou intégrée.

MiaMapa reste une référence UX. Les sources retenues sont les sites officiels,
sous réserve de droits de réutilisation documentés.

## 15. Prochain lot — images événementielles et tri des dates

**Décision du 29 juillet 2026 : ce lot sera repris dans une nouvelle
discussion. Ne publier aucun candidat avant sa réalisation et sa validation.**

### 15.1 Diagnostic vérifié des images

- la production contient `481` candidats issus de la première consolidation ;
- les `481` candidats possèdent exactement la même `image_url` :
  `https://letsgrau.com/app/uploads/2023/12/stationgrauduroi-1284-modifier-2172.jpg` ;
- cette image de dunes est le `og:image` générique de la fiche ou du site ;
- `shared_crawl._parse_html()` ne conserve actuellement que `og:image` dans
  `CrawledPage.metadata.image_url` ;
- `_normalize_ai()` recopie ensuite cette valeur générique dans le candidat ;
- les pages officielles contiennent pourtant leurs images événementielles dans
  le HTML, principalement sous `https://static.apidae-tourisme.com/...` ;
- exemples vérifiés :
  - `"Les Copains Twist"` :
    `.../images/27/248/31193115.png` ;
  - `Un livre à la plage` :
    `.../images/107/234/42003051.jpg` ;
- ces URL sont présentes dans `CrawledPage.raw_html_gzip` : une réparation est
  donc possible depuis le corpus existant, sans recrawler les 1045 pages.

### 15.2 Priorité de sélection d'image à implémenter

1. image du nœud JSON-LD `Event.image`, lorsqu'elle correspond à l'événement ;
2. image principale de la fiche événement dans le contenu HTML ;
3. image Apidae associée au bloc ou au titre de l'événement ;
4. `og:image` seulement s'il n'est pas identifié comme image générique ;
5. aucune image plutôt qu'une image de site incorrecte.

La sélection ne doit pas se limiter au domaine `static.apidae-tourisme.com` :
elle doit reposer sur la proximité sémantique/DOM avec la fiche afin de rester
réutilisable pour d'autres offices de tourisme.

### 15.3 Réparation des données existantes

- écrire une commande ou un service idempotent qui relit le HTML compressé ;
- recalculer une image événementielle pour chaque candidat ;
- mettre à jour uniquement `EventImportCandidate.image_url` lorsque la
  correspondance est suffisamment sûre ;
- conserver l'ancienne URL et la méthode de sélection dans un rapport
  d'audit, sans exposer de secret ;
- laisser l'image vide si aucune correspondance fiable n'est trouvée ;
- ne pas télécharger l'image dans `Event.source_cover_image` avant
  l'approbation du candidat ;
- produire les compteurs : corrigés, inchangés, sans image, ambigus, erreurs.

### 15.4 Premier tri automatique par date

Règles retenues :

- conserver un événement futur ;
- conserver un événement déjà commencé si sa date de fin est future ;
- pour une série, supprimer les occurrences dont `ends_at < timezone.now()` ;
- conserver la série si au moins une occurrence non terminée subsiste ;
- classer automatiquement le candidat comme expiré lorsque toutes ses
  occurrences sont terminées ;
- ne pas supprimer silencieusement les candidats expirés : conserver une trace
  auditable ;
- ne pas afficher les expirés dans la boîte courante **À valider** ;
- permettre ultérieurement un filtre admin pour consulter les expirés.

Le statut recommandé est `EventImportCandidate.Status.EXPIRED = "expired"`.
Cela implique une migration, l'adaptation du serializer/API, des compteurs de
run et, si le produit le souhaite, un filtre dans l'interface.

La comparaison doit utiliser des datetimes Django conscientes du fuseau. Pour
un événement à la journée, `ends_at` doit représenter correctement la fin de
la journée locale avant la comparaison.

### 15.5 Fichiers à examiner

- `back/apps/assistant/services/shared_crawl.py` ;
- `back/apps/assistant/models.py` ;
- `back/apps/events/imports.py` ;
- `back/apps/events/models.py` ;
- `back/apps/events/views.py` ;
- `back/apps/events/serializers.py` ;
- `front/src/components/admin/event-imports-admin.tsx` ;
- tests Assistant et Events concernés.

### 15.6 Tests obligatoires

- une fiche avec un `og:image` générique et une image événementielle Apidae ;
- une fiche sans image spécifique : résultat vide, pas l'image générique ;
- deux événements d'une même page avec deux images distinctes ;
- JSON-LD `Event.image` prioritaire ;
- événement entièrement passé classé `expired` ;
- événement en cours conservé ;
- série mixte : occurrences passées retirées, futures conservées ;
- série entièrement passée classée `expired` ;
- relance de la réparation sans nouvelle modification ni doublon ;
- candidats existants réparés sans recrawl ;
- aucune approbation ou publication automatique.

### 15.7 Critères de fin

- les candidats ne partagent plus artificiellement l'image des dunes ;
- chaque image affichée est reliée de façon démontrable à sa fiche officielle ;
- les événements 2024 et les autres événements définitivement passés ne sont
  plus proposés dans la boîte courante ;
- les événements en cours et récurrences futures restent disponibles ;
- un rapport chiffre les images réparées et les candidats expirés ;
- migrations, tests Django, lint/build frontend et smoke tests passent ;
- la documentation est mise à jour avant push et déploiement.

## 16. Lot images et expiration — déployé le 29 juillet 2026

**PR `#84`, `#85` et `#86` fusionnées. Lot fonctionnel déployé au commit
`7d9c51f`, documentation de clôture fusionnée ensuite. Migration
`events.0007_event_expiration` appliquée.**

Implémentation locale :

- sélection d'image depuis `CrawledPage.raw_html_gzip`, sans requête au site ;
- priorité à `Event.image`, puis association titre/bloc DOM, puis OG seulement
  s'il n'est pas générique ;
- détection des images de chrome répétées sur au moins 20 % du corpus ;
- commande `repair_event_candidates`, en dry-run par défaut, avec rapport JSON
  et application seulement via `--apply` ;
- statut auditable `expired` et compteur `EventImportRun.expired_count` ;
- exclusion des événements terminés avant le début du run de la boîte
  **À valider** ;
- conservation des événements en cours et des occurrences futures ;
- retrait des seules occurrences terminées dans une série mixte ;
- filtre admin séparé pour consulter les incomplets et les expirés ;
- interdiction API d'approuver un candidat expiré ;
- respect de la fin de journée Europe/Paris et du `DTEND` exclusif ICS.

Résultat appliqué aux 481 candidats depuis le HTML stocké :

- `465` images spécifiques sélectionnées ;
- `16` fiches laissées sans image fiable ;
- `0` image générique retenue ;
- `125` candidats classés `expired` ;
- `77` occurrences terminées retirées des séries mixtes ;
- `17` candidats `pending` et `339` candidats `invalid` restent consultables ;
- les exemples Copains Twist, Un livre à la plage, Halloween et Nouvel an
  retrouvent leurs images officielles.

Une seconde exécution en dry-run a confirmé l'idempotence : `465` inchangés,
`16` sans image et `0` occurrence supplémentaire retirée. Le rapport
d'application est archivé avec les sauvegardes PostgreSQL.

Validation locale :

- tests ciblés Events/Assistant : OK ;
- Ruff : OK ;
- `makemigrations --check --dry-run` : aucune migration manquante ;
- ESLint : OK ;
- build Next.js 16.2.4 : OK.
- tests navigateur desktop et mobile : OK ;
- pagination admin de 50 candidats : OK, pages suivantes et dernière page
  vérifiées ;
- aucun candidat terminé ne reste dans `pending` ou `invalid` ;
- aucun `Event` n'a été publié automatiquement.

## 17. Lot 1 signaux et décision Lot 2 — 29 juillet 2026

**Lot 1 (signaux structurels) : mergé et déployé.** PR `#89`, commit
`ac1ff38`, migration `assistant.0004_crawledpage_signals` appliquée.

- champ JSON `signals` sur `CrawledPage`, calculé sans LLM ;
- service `page_signals` : `jsonld_types`, `has_ics_link`, `has_iso_date`,
  `has_readable_date`, `has_structured_facts`, `text_length`, `low_density`,
  `canonical_shared`, `depth` ;
- calcul incrémental dans `_save_page` + commande `refresh_page_signals` ;
- vue dédupliquée par canonique : `1051` pages, `124` canoniques distinctes,
  `945` en canonique partagée (dont `512` fiches événement derrière une
  canonique d'agrégation) ;
- aucun changement public ; l'assistant IA conserve l'intégralité du corpus ;
- validé : migration cohérente, `check`, 12 tests unitaires, Ruff, testé sur
  Chromium (agenda 17 événements, assistant fonctionnel).

**Décision Lot 2 (pré-filtre IA) : patterns d'URL en levier principal, signaux
en complément, système de filtres reporté.**

Constat mesuré sur le corpus : aucun signal structurel ne distingue une fiche
événement d'une fiche commerce sur ce CMS (gabarits identiques ; dates souvent
hors du HTML nettoyé pour les événements permanents). Un pré-filtre par
signaux seuls est donc soit trop laxiste (12 % de gain), soit destructeur
(perte de 355 événements sur 512). Il est abandonné comme mécanisme principal.

Règles retenues :

1. **Levier principal** : `EventSource.url_patterns` (existant, par source,
   générique) pour restreindre les pages envoyées à l'IA. Sur ce corpus,
   `/evenement/` réduit d'environ 50 % sans perdre un événement.
2. **Complément** : les signaux (JSON-LD, ICS) pour l'extraction gratuite quand
   disponible, et la **déduplication par canonique** pour ne pas traiter N fois
   la même page d'agrégation.
3. **Report** : le système de filtres intelligent sera conçu **après** le crawl
   des ~15 sites prévus, fondé sur l'observation de leurs structures réelles
   (patterns d'URL, JSON-LD, gabarits), jamais sur des suppositions.

Voir `26-architecture-collecte-multisite.md` et sa section 9 pour les
décisions de session.

## 18. Crawl multi-villes et correctif signals — 29-30 juillet 2026

**3 nouvelles villes crawlées** (décision Fred) : La Grande-Motte, Aigues-Mortes,
Saint-Laurent-d'Aigouze. Corpus total assistant : **3239 pages**.

- Le Grau-du-Roi : 1051 pages ; La Grande-Motte : 477 ; Aigues-Mortes : 696 ;
  Saint-Laurent : 1015.
- **Bug introduit par le Lot 1** : le champ `signals` était `NOT NULL` sans
  défaut en base, bloquant le crawl de toute **nouvelle** page
  (`null value in column signals violates not-null constraint`). Corrigé par
  la migration `assistant.0005_signals_db_default` (défaut `'{}'::jsonb`),
  PR `#91`, mergée et déployée.
- Worker Celery redémarré pour charger le code corrigé.

**Point d'amélioration identifié (robustesse)** : après la réparation d'un
crawl échoué, l'**indexation en chunks ne se relance pas automatiquement**.
La Grande-Motte avait 477 pages mais 0 chunk tant que l'indexation n'a pas
été relancée manuellement en tâche Celery (`crawl_external_source_now`).
À traiter dans un futur lot de robustesse : déclencher l'indexation
automatiquement après un crawl réussi qui succède à un échec.

**Chunks assistant par commune (vérifié)** : Aigues-Mortes 4411, La
Grande-Motte 535, Le Grau-du-Roi 698, Saint-Laurent 793. Assistant testé en
réel sur Aigues-Mortes et La Grande-Motte : réponses fondées sur les sites
officiels, sources citées.

## 19. Décision filtres automatiques — 30 juillet 2026

Voir section 12 de `26-architecture-collecte-multisite.md`. Voie A validée :
filtre de sélection IA **automatique**, **inclut en cas de doute**, jamais
exposé à l'admin (non-informaticien). Réduit le coût IA sans réduire la
couverture ; correction d'une mauvaise détection = exploitation technique.

## 20. Architecture finale — une passe IA multi-catégories (30 juillet 2026)

Voir section 14 de `26-architecture-collecte-multisite.md`. Décision validée :
une seule passe IA par page récupère et classe toutes les catégories définies
(événements, marchés, lieux, extensible), avec validation humaine par boîte.
Voie A prudente (tout à l'IA, aucune perte). Premier chantier : les lieux
(Découvrir), seul module non alimenté.

## 21. Lot du 1er 1er aoùt 2026 — dates fiables, catégories métier, validation en masse

Déployé sur `main` (prod media.geoclic.fr), feu vert de Fred. Détails
dans `14-journal-avancement.md` (entrée du 1er aoùt).

| Élément | Valeur |
|---|---|
| Prompt extraction | `multi-v4` (multi-catégories), `events-v4` (événements) |
| Dates événements | `today` + `page_dates` injectés au prompt ; jamais l’année de publication |
| Sans date | `occurrences: []` à affiché « Récurrence ou période non datée » |
| Validation | POST `bulk-approve` (business/place/event), max 500, PENDING+complets |
| Filtre commerçants | Tout / Associations / Commerces & services |

### Bugs corrigés

- **Dates fabriquées** (2022/2024) : l’IA utilisait l’année de publication de la page.
  Correctif prompt + métadonnées de page (crawl), recrawl + multi-v4 relancée.
- **Source 6 « terre de camargues »** : 2 pages à titre de 325 car. > varchar(300)
  faisaient échouer tout le lot. Troncature à 300 dans `save_chunks`.
- **Navigation admin** : page suivante / filtres « À valider » ne rafraîchissaient pas.
  Resync via derived state (sans useEffect).
- **Mojibake UTF-8** sur 4 écrans d’imports (accents à « ? »). Réécriture des libellés
  en générant les accents par code Unicode (chr) ; vérifié au niveau octet.

### Point d’attention outil

Le shell local (PowerShell) transmet mal les caractères accentués tapés directement
dans les chaînes Python. Pour tout texte français à écrire dans un fichier, générer
les accents avec `chr(0xE9)` etc., jamais en littéral. Vérifier le résultat au niveau octet
(`read_bytes()`), pas à l’affichage console (trompeur).

### Sentinelle VPS

`back/_sentinel.py` : surveille la file d’extraction multi-v4 ; quand elle se vide, lance
automatiquement le recrawl de la source 6. Nettoyer après usage.

### Reste à faire

- Vérifier le succès du recrawl source 6 (indexation de la page au titre long).
- Mesurer coût/qualité de la passe multi-v4 complète.
- Décider planification auto vs déclenchement manuel des passes IA (coût).

## 22. Déduplication Agenda — étape 2 à faire (cross-source)

Étape 1 faite (1er aoùt soir) : 121 candidats supprimés (106 doublons d’URL
exacte + 36 pages non-FR). « À valider » events : 189.

**Étape 2 restante** : 39 groupes de même titre = même événement extrait de
plusieurs sources ou de pages de listing multilingues. À traiter par règle, pas à la main :

1. À la source : ignorer pages de listing/pagination (`?periode=`, `/tous-les-agendas`)
   et pages non-françaises (`/en/`, `/es/`, `/it/`, `/de/`) au crawl ou à la sélection IA.
2. Déduplication métier : source canonique par événement (OT de la commune), clé =
   titre normalisé + date + commune. Le `fingerprint` actuel ne couvre pas le cross-source.
3. Coût IA : ces pages de listing multilingues font aussi gonfler le coût de la passe
   (même contenu analysé en 5 langues) — les exclure réduit la facture.

Voir détail dans `14-journal-avancement.md` (entrée 1er aoùt soir).

## 23. État final session 1er aoùt soir — Agenda nettoyé

**À valider Agenda : 111 candidats** (départ 335). Tous avec date future.

### Série de correctifs appliqués (déployés sur main)

1. **Expiration IA** (`a2b8f14`) : `_normalize_agenda_item` (multi_sync) n’appelait pas
   `apply_occurrence_filter` → candidats toutes dates passées restaient pending.
   Corrigé + `repair_event_candidates --apply` sur les 4 sources.
2. **Rejet dates fabriquées** : 25 candidats (2022/2024, 1er janvier) → expired.
3. **Dédup étape 1** : 121 candidats (106 doublons URL exacte + 36 pages non-FR).
4. **Dédup étape 2** : 17 même fingerprint + 29 cross-source (agrégateur
   `tourisme-saint-laurent-daigouze.fr` rattachait à tort à Saint-Laurent) + 2 résiduels.

### Prochain chantier prioritaire — correction à la source

La dédup manuelle ne doit pas se répéter. Il faut empêcher la production de doublons :

- **Exclure les pages de listing/pagination** (`?periode=`, `/tous-les-agendas`, `/l-agenda-*`,
  `?l-41-*`) de l’extraction — elles génèrent des doublons d’expos et gonflent le coût IA.
- **Exclure les pages non-françaises** (`/en/`, `/es/`, `/it/`, `/de/`) au crawl ou à la sélection IA.
- **Agrégateur** : `tourisme-saint-laurent-daigouze.fr` relaie les événements des autres
  communes ; décider si on ne retient que ses propres événements (commune Saint-Laurent).
- **Dédup par fingerprint** : l’étendre aux candidats `pending` (pas seulement `IMPORTED`),
  ou ajouter une clé titre normalisé + date + commune.

Bénéfice double : moins de doublons à valider ET coût IA réduit (même contenu analysé
en 5 langues + pages de listing).

### Divers

- Sentinelle VPS `back/_sentinel.py` à nettoyer après vérification du recrawl source 6.
- Point outil : générer les accents Python avec `chr(0xE9)` etc. (le shell corrompt les
  littéraux accentués) ; vérifier au niveau octet (`read_bytes()`).
- 226 candidats Agenda en `expired` ; 636 occurrences passées retirées par la réparation.

## 24. Lot du 1er ao?t (soir) ? d?dup ? la source + cache IA multi r?par?

**Deux lots d?ploy?s sur `main`.** Feu vert de Fred.

### 24.1 D?duplication ? la source (commit `f785e52`)

Emp?che la production de doublons au lieu de les nettoyer ? la main :

- **Crawl** (`shared_crawl._allowed`) : exclusion des pages de listing/pagination
  (`?periode=`, `/tous-les-agendas`, `/l-agenda-`, `?page=`) et non-fran?aises
  (`/en/`, `/es/`, `/it/`, `/de/`), pour toutes les sources. Effet imm?diat au prochain crawl.
- **Passe IA multi** (`multi_sync._dedup_canonical`) : une seule page par URL canonique
  (la plus riche). 512 fiches ?taient derri?re une canonique d'agr?gation au Grau.
- **D?dup cross-source** (`imports._upsert_candidate`) : le fingerprint (titre normalis?
  + date + commune) matche aussi un candidat `PENDING` d'une autre source, pas seulement
  `IMPORTED` ? le second arriv? est `DUPLICATE`. Couvre l'agr?gateur Saint-Laurent (option A).

Tests : `_allowed` (listing + non-FR), `_dedup_canonical`, d?dup cross-source.
33/33 tests sans BDD OK. Aucune migration. Frontend inchang?.

### 24.2 Cache IA multi r?par? (commit `871956b`) ? le vrai levier de co?t

Diagnostic chiffr? de la passe multi-v4 (DeepSeek `deepseek-v4-flash`) :

- Cumul : 17 394 appels, 20,0 M tokens entr?e + 15,1 M sortie = **11,23 ?**.
- Statuts : 9 605 `success` (11,23 ?) ; 6 979 `budget_exceeded` ; 814 `error`.
- Par jour : 30/07 = 4,35 ? ; 31/07 = 1,81 ? ; 1er/08 = 5,06 ? ? **cap utilisateur
  5 ?/jour** (`AI_ASSIST_BUDGET_USER_DAILY_EUR`) atteint le 1er ao?t, passe coup?e.
- `multi_extraction_cache` restait **? 0 sur les 6 sources** malgr? la d?pense.

**Bug racine** (`multi_extraction.extract_multi`) : la variable de boucle `key`
(cat?gorie) ?crasait le hash de segment. Le cache ?tait ?crit sous la cl? `"listings"`
au lieu du hash ? jamais de hit, chaque passe repayait l'int?gralit?. Reproduit en prod
puis corrig? :

- variable de boucle renomm?e (`category`) ? cache ?crit sous le **hash de segment** ;
- **fusion** du cache au lieu de la purge par lot (`prune_cache` r?serv? ? une passe
  compl?te) : un lot Celery de 15 pages n'efface plus les cl?s des autres lots.

V?rifi? : cl?s = hash 64 car., fusion A+B entre lots, hit cache (0 appel IA au re-A).
29/29 tests discovery OK.

**Cons?quence** : la prochaine passe multi ne repaiera que les segments dont le contenu
(ou prompt/provider) a chang?. Le cap de 5 ?/jour reste ? ajuster si une passe compl?te
doit tenir en un jour (d?cision produit, non tranch?e).

## 25. Lot du 1er aout (nuit) — refonte frontend mobile-first + monetisation "A la une"

Lot deploye sur `main`. Feu vert de Fred a chaque etape (agenda pilote, puis
generalisation). Objectif : pages de listing lisibles sur mobile sans scroll
excessif, et emplacements "A la une" controlables depuis l'admin (monetisation).

### 25.1 Agenda — refonte dense (pilote)

- `00bb651` refonte mobile-first : header compact (titre + compteur), filtres replies
  derriere un bouton, lignes denses `event-row.tsx` (pastille date + titre + lieu),
  groupees par mois. Image retiree de la liste (reste sur la fiche detail).
- **Bug 500 en prod** : `RangeError: Invalid time value`. `monthKey` produisait une
  date localisee `MM/AAAA` mais `monthLabel` splittait sur `-` → `NaN` → date invalide
  au premier evenement date. Corrige (`31aa837`, cle ISO `AAAA-MM`) ; date-guards
  ajoutes dans `event-row` / `agenda-map-explorer` (`cfc52f7`).
- `52c3f54` bandeau "A la une" monetise + la fenetre carte ne s'ouvre plus toute seule.
- `bd38bc0` carte `AgendaMapExplorer` repliable **desktop-only** + suppression de la
  liste interne doublonne (mobile = liste dense uniquement).

### 25.2 Monetisation "A la une" (placements AdCampaign)

Le mecanisme reutilise `AdCampaign` (periode, ciblage, stats, serve/redirect). Une FK
optionnelle permet de mettre en avant une fiche existante plutot qu'une crea externe :

- `agenda_featured` + `featured_event` (FK Event) : `d9e3b79` + migration `0003`
  (`13d8940`). Bandeau agenda au-dessus de la liste, affiche la fiche evenement
  (image/titre/date/lieu), mention "Presente par {annonceur} · Publicite". Le clic
  passe par `/r/<id>/` (track) puis redirige vers `/agenda/<slug>`.
- `directory_featured` + `featured_business` (FK Business) : `5fd7050` + migration
  `0004` (`018b96b`). Bandeau annuaire, meme logique, redirige vers `/commerces/<slug>`.

**Gestion 100% admin** (Campagnes publicitaires) : creer une campagne sur le placement,
choisir l'evenement/commercant, activer. Desactiver la campagne = le bandeau disparait
(le composant rend `null` si aucune campagne active, HTTP 204). Deux campagnes de demo
creees en prod (id=1 agenda, id=2 annuaire, toutes deux "A VELO") — a gerer par Fred.

### 25.3 Generalisation aux autres listings

`f86abd4` — composants mutualises + lignes denses :

- **Mutualises** : `ui/collapsible-filters.tsx` (filtres replies), `ui/collapsible-map.tsx`
  (carte repliable visible par defaut). Filtres client par page (`business-filters`,
  `discovery-filters`, `listing-filters`).
- **Lignes denses** : `business-row.tsx` (logo carre + nom + categorie + commune),
  `place-row.tsx`, `listing-row.tsx` — 5-6 items par ecran mobile au lieu d'1.
- **Pages refondues** : `/commerces` (carte gardee mais repliable + "commercant a la une"),
  `/decouvrir`, `/emploi`, `/locations-annuelles` (et toutes pages via `listing-list-page`).

### 25.4 Nettoyage

`7dad271` — suppression des composants devenus orphelins : `place-card`, `listing-card`,
`business-featured-section`. `business-card` et `event-card` **conserves** (encore
utilises par `/marches`).

### 25.5 Verifications

tsc + eslint 0 erreur a chaque commit ; migrations `0003`/`0004` appliquees en prod
(backup PG avant) ; pages `/agenda`, `/commerces`, `/decouvrir`, `/emploi` → 200 ;
rendus mobile (390px) et desktop (1280px) valides par captures Playwright.

### 25.6 Reste a faire

- **`/marches`** : derniere page encore en ancien style (gros header + grille de grosses
  cartes `EventCard`/`BusinessCard`). En attente du feu vert de Fred. Une fois refaite,
  supprimer `business-card` et `event-card` (fin du nettoyage).
- `/decouvrir`, `/emploi`, `/locations-annuelles` affichent "0" tant qu'il n'y a pas de
  contenu publie (gabarit en place, pas un bug).

## 26. Lot du 2 aout — candidats admin compacts (validation plus rapide)

Lot deploye sur `main`. Demande de Fred : reduire la hauteur des fiches a valider
dans l'admin (moins de scroll pour approuver en masse).

### 26.1 Format compact generalise aux 4 pages candidats

Meme presentation partout (`admin/*/imports`) :

- **"Source officielle"** remontee sur la 1ere ligne, a l'extreme droite du badge
  "Extraction IA a verifier" (plus de ligne separee).
- **Selects + boutons sur une seule ligne** : `Commune` + `Categorie` a gauche,
  `Rejeter` / `Approuver et publier` a droite (`ml-auto`).

Commits :
- `b0f67eb` candidats **commercants** (`business-imports-admin`).
- `ed1e3cd` generalisation aux candidats **agenda** (`event-imports-admin`),
  **decouvrir** (`place-imports-admin`) et **annonces** (`listing-imports-admin`).

### 26.2 Reformatage des fichiers minifies

`event-imports-admin.tsx` et `place-imports-admin.tsx` etaient minifies (une seule
ligne), difficiles a editer (a cause d'une div non fermee introduite au patch precedent,
corrigee). `718ac32` — passage Prettier, **aucun changement fonctionnel** (~400 lignes
lisibles chacun). tsc + eslint 0 erreur.

Verifie : build + restart Next OK, site 200. Pages admin derriere login (307 attendu
en anonyme).


## 27. Lot du 2 aout ? section Gastronomie autonome + filtres par envie

Lot deploye sur `main` (commit `7ab18de`). Suite de la migration Gastronomie
(commande `migrate_gastronomie`, sections precedentes) : les 77 tables migrees de
`Place` (Decouverte) vers `Business` deviennent une **section a part entiere**,
au lieu d'un simple filtre `?category=gastronomie` dans l'annuaire commerces.

Decision produit (Fred) : **section autonome + separation stricte** ? la gastronomie
sort de l'annuaire generaliste, a sa tuile racine, sa page, ses propres filtres.

### 27.1 Migration donnees (rappel, appliquee juste avant)

- Racine `BusinessCategory` **Gastronomie** (slug `gastronomie`, parent=None) creee.
- **77 Business** crees et publies (70 Restaurants, 3 Bars & Cafes, 1 Glacier,
  2 Producteurs & Caveaux, 1 Food truck). Branche `restauration` deplacee sous
  Gastronomie puis desactivee.
- Envies stockees dans `Business.specialties` (JSONField) via regex `CRAVINGS`.
- **80 Place Decouverte depubliees** (77 migrees + 3 doublons : Petite Prade,
  Guinguette pieds nus, Paillote bambou, deja presentes en Business).
- `PlaceCategory` Decouverte "Gastronomie" (id=8) desactivee.

### 27.2 Backend ? 2 filtres API + specialties exposees

- `serializers.py` : `specialties` ajoute au `BusinessListSerializer` (necessaire
  pour le filtre envie et l'affichage).
- `filters.py` :
  - `specialty` ? matche une envie exacte dans le JSONField (`specialties__contains=[v]`).
  - `exclude_category` ? retire toute une branche (meme logique de descendance
    recursive que `category`, factorisee dans `_branch_ids`).

### 27.3 Frontend ? nouvelle section `/gastronomie`

- `gastronomie/page.tsx` (nouveau) : page dense qui force `category=gastronomie`
  (jamais expose dans l'URL), filtre envie + commune, carte repliable, liste
  `BusinessRow`, pagination, bandeau premium `DirectoryFeatured` scope gastronomie.
- `gastronomie-filters.tsx` (nouveau) : selecteur d'**envies FIXE** (13 libelles
  alignes migration : Cuisine traditionnelle, Pizzeria, Fruits de mer, Mediterraneen,
  Vue mer, Italien, Cafe / Salon de the, Tapas, Glacier, Burgers, Creperie,
  Vins & caveaux, Sushi) + commune. Choix assume : liste fixe plutot que generee
  depuis les donnees (envies normalisees, pas de faute, stable).
- `types/api.ts` : `specialties: string[]` sur `BusinessListItem`.
- `commerces/page.tsx` : `exclude_category: "gastronomie"` ? les 77 sortent de
  l'annuaire generaliste (240 ? 163 fiches). **Separation stricte.**

### 27.4 Choix retenus (arbitrages Fred)

- **Fiches detail** : conservees sous `/commerces/<slug>` (pas de redirect 301).
- **Gastronomie exclue** de `/commerces` (vraie separation).
- **Envies** : liste fixe alignee migration.

### 27.5 Deploy + verification prod

- Tuile home Gastronomie repointee de `/commerces?category=gastronomie` ? `/gastronomie`.
- Backup PG (525M), pull `7ab18de`, build front OK (route `/gastronomie` generee),
  restart Django + Next, services actifs.
- Verifie en prod : `/gastronomie` 200 (77 tables), filtre Pizzeria ? 15,
  Fruits de mer ? 13, annuaire sans gastronomie ? 163. tsc 0 erreur.

Reste possible : page `/marches` a refaire (puis supprimer `business-card`/
`event-card` devenus orphelins) ; campagnes demo id=1/2 "A VELO" toujours en base.

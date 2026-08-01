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
| Candidats à valider | events 189, places 720, commerces 212, annonces 5 |
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

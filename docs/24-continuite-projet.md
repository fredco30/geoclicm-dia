# 24 — Continuité du projet GeoClic Média

**Document canonique de reprise — vérifié le 28 juillet 2026.**

Ce document distingue ce qui existe dans le code, ce qui a été vérifié en
production, ce qui est déployé mais pas encore configuré, ce qui reste à
construire et ce qui ne doit pas être supprimé sans preuve d'absence d'usage.
Il ne contient aucun secret.

## 1. Références et vérité de production

| Élément | Valeur vérifiée |
|---|---|
| Dépôt | `fredco30/geoclicm-dia` |
| Domaine | `https://media.geoclic.fr` |
| Répertoire VPS | `/var/www/geoclicmedia` |
| Branche de production | `main` |
| Commit déployé et `origin/main` | `7319f4080b91da73a692135c9cd3dbb800e8d45d` |
| Écart Git constaté | `0` commit en avance, `0` en retard |
| Système vérifié | Ubuntu 25.04 |
| Stockage vérifié | 72 Gio, 23 Gio utilisés, 49 Gio disponibles |

Le 28 juillet 2026, Ubuntu 25.04 est hors support. La mise à niveau du système
est une opération distincte du déploiement applicatif. Elle doit être préparée
avec sauvegarde, fenêtre de maintenance et plan de retour.

Le dépôt du VPS ne comporte pas de modification suivie. Plusieurs fichiers
`back/.env.backup-*` non suivis sont présents. Ils ne bloquent pas Git, mais
peuvent contenir des secrets : ne jamais les ajouter au dépôt et arbitrer leur
rétention côté serveur.

## 2. État réellement vérifié en production

### Application

- `python manage.py check` : aucun problème signalé ;
- migrations `events.0001_initial` et
  `events.0002_event_sources_and_imports` appliquées ;
- migrations `directory.0003_business_is_local_producer` et
  `discovery.0001_initial` appliquées lors du lot Agenda/Marchés/Découvrir ;
- `/healthz/`, `/api/events/` et `/agenda` répondent `200` ;
- `/admin/agenda/sources` et `/admin/agenda/imports` répondent `307` sans
  session, redirection d'authentification attendue.

### Services

Les services suivants ont été vérifiés `active` :

- `geoclicmedia-django` ;
- `geoclicmedia-next` ;
- `geoclicmedia-celery-worker` ;
- `geoclicmedia-celery-beat` ;
- `nginx`, `postgresql` et `redis-server`.

Le conteneur `geoclicmedia-crawl4ai` a été vérifié `running/healthy`. Un appel
anonyme à `POST /crawl` renvoie `401`, confirmant la protection JWT.

### Configuration Agenda

- Mistral est configuré ;
- Crawl4AI est configuré ;
- l'identité technique est `crawl4ai@gestia.ovh` ;
- la tâche Celery Beat
  `Agenda — synchronisation des sources toutes les 6 h` existe et est activée.

### Contenu Agenda encore absent

Au moment de la vérification :

- `EventSource` : **0** ;
- candidats en attente ou incomplets : **0** ;
- exécutions d'import : **0**.

Conclusion : le moteur et l'interface sont déployés, mais aucun site officiel
n'a encore été enregistré et aucun crawl métier n'a été lancé. Ne pas confondre
« fonctionnalité déployée » et « collecte initialisée ».

## 3. Architecture fonctionnelle actuelle

```text
Sites officiels villes / offices de tourisme
        │
        ├── HTML serveur ───────────────┐
        ├── JavaScript via Crawl4AI ────┤
        └── flux ICS ───────────────────┤
                                       ▼
                         EventSource + EventImportRun
                                       │
                     JSON-LD Event prioritaire
                                       │
                  sinon Mistral sur pages Crawl4AI rendues
                                       │
                         normalisation + dédoublonnage
                                       ▼
                           EventImportCandidate
                             « À valider »
                                       │
                         approbation humaine obligatoire
                                       ▼
                          Event + EventOccurrence
                                       │
                    /agenda, /marches, carte et ICS
```

Les modules sont volontairement reliés :

- un marché est un `Event` avec `kind=market` ;
- ses dates sont des `EventOccurrence` explicites ;
- un producteur est un `Business` avec `is_local_producer=true` ;
- `/marches` compose ces deux sources sans dupliquer les données ;
- un lieu à découvrir est un `Place`, relié si besoin à des articles,
  commerces ou événements existants.

## 4. Pipeline de collecte Agenda

### 4.1 Connecteurs

`EventSource.connector` accepte :

- `json_ld` : pages HTML standards contenant du JSON-LD `Event` ;
- `crawl4ai` : pages JavaScript rendues dans Chromium ;
- `ics` : flux calendrier officiel.

Chaque source possède une URL, un site de référence, une commune et une
catégorie par défaut facultatives, un type par défaut, une limite de pages, un
statut actif, la synchronisation des images et une note sur les droits.

La limite par défaut est de 30 pages, avec une profondeur maximale de deux
niveaux et une restriction au même domaine. Les URL non publiques et certains
suffixes non HTML sont refusés.

### 4.2 Ordre d'extraction

1. Le HTML est récupéré. Pour `crawl4ai`, Chromium est tenté en premier ; le
   crawler standard sert de repli si le rendu échoue.
2. Le crawler recherche en priorité les nœuds JSON-LD de type `Event`.
3. Mistral n'est appelé que si aucun événement JSON-LD n'a été trouvé sur
   l'ensemble du crawl et si des pages ont été rendues par Crawl4AI.
4. L'extraction Mistral est limitée, mise en cache par empreinte du contenu et
   doit restituer l'URL de page ainsi que des preuves textuelles.
5. Les éléments sont normalisés, dédoublonnés et enregistrés comme candidats.
   Ils ne sont pas publiés automatiquement.

Mistral ne doit jamais compléter une date, une heure, une adresse ou une
information absente. Une provenance de page inconnue est rejetée.

### 4.3 Validation humaine

La boîte `/admin/agenda/imports` présente par défaut les statuts `pending` (à
vérifier) et `invalid` (incomplet). L'approbation exige au minimum une
catégorie, une commune, une date de début et une date de fin. Elle crée ou met
à jour l'événement puis le publie. Le rejet place le candidat en `rejected`.

Les autres statuts sont `imported` et `duplicate`. Chaque passage conserve un
`EventImportRun` avec les compteurs de découverte, création, mise à jour,
import, extraction IA, doublons et erreurs.

### 4.4 Images officielles et remplacement admin

Pour une source dont `sync_images=true` :

- l'image détectée sur le site officiel est téléchargée dans le stockage ;
- son URL et son empreinte sont conservées ;
- si elle change, la copie source peut être actualisée ;
- `Event.cover_image` est le remplacement manuel ;
- l'affichage utilise `cover_image` en priorité, sinon
  `source_cover_image`.

Le remplacement admin n'est donc pas écrasé visuellement par une mise à jour
automatique. La note de droits et le crédit doivent être contrôlés avant
publication.

### 4.5 Position de MiaMapa

MiaMapa a servi de référence UX pour la carte, les filtres, la liste latérale
et la fenêtre détaillée. Il ne constitue pas une source d'import intégrée.

Sans API, accord de réutilisation ou contrat confirmé, MiaMapa ne doit pas être
traité comme base à recopier. Les sources canoniques prévues sont les sites
officiels des communes, offices de tourisme et organisateurs. MiaMapa peut
rester un outil de découverte ou de comparaison manuelle.

## 5. Interfaces utiles

### Public

- `/agenda` : liste, filtres et explorateur cartographique ;
- `/agenda/<slug>` : fiche, occurrences, carte, itinéraire et ICS ;
- `/marches` : marchés à venir et producteurs locaux ;
- `/decouvrir` et `/decouvrir/<slug>` ;
- `/api/events/` : API publique filtrable ;
- `/api/events/map/` : données cartographiques, `bbox` facultative ;
- `/api/events/<slug>/calendar.ics` : export calendrier.

### Portail de rédaction

- `/admin/agenda` ;
- `/admin/agenda/new` et `/admin/agenda/<slug>/edit` ;
- `/admin/agenda/categories` ;
- `/admin/agenda/sources` : connecteurs et lancement manuel ;
- `/admin/agenda/imports` : boîte **À valider** ;
- `/admin/decouvrir` et sous-routes ;
- `/admin/directory/businesses` : commerçants et producteurs.

### API protégée


## 6. Exploitation et déploiement

### 6.1 Contrôles avant déploiement

```bash
cd /var/www/geoclicmedia
git branch --show-current
git status --short
git fetch origin
git log --oneline HEAD..origin/main
```

Ne pas écraser une modification locale avant de l'avoir identifiée. Ne jamais
lancer `makemigrations` en production.

Sauvegarder avant migration :

```bash
/usr/local/bin/geoclicmedia-backup-pg
ls -lh /var/backups/geoclicmedia/ | tail -5
```

### 6.2 Déploiement applicatif type

```bash
cd /var/www/geoclicmedia
git pull --ff-only origin main

cd back
source .venv/bin/activate
pip install -r requirements/prod.txt
DJANGO_SETTINGS_MODULE=config.settings.prod python manage.py migrate
DJANGO_SETTINGS_MODULE=config.settings.prod python manage.py seed_editorial_categories
DJANGO_SETTINGS_MODULE=config.settings.prod python manage.py seed_event_categories
DJANGO_SETTINGS_MODULE=config.settings.prod python manage.py seed_place_categories
DJANGO_SETTINGS_MODULE=config.settings.prod python manage.py seed_tiles
DJANGO_SETTINGS_MODULE=config.settings.prod python manage.py collectstatic --noinput
DJANGO_SETTINGS_MODULE=config.settings.prod python manage.py check

cd ../front
npm ci
npm run build

sudo systemctl restart geoclicmedia-django
sudo systemctl restart geoclicmedia-celery-worker
sudo systemctl restart geoclicmedia-celery-beat
sudo systemctl restart geoclicmedia-next
```

Ne pas redémarrer PostgreSQL, Redis ou Nginx sans besoin identifié.

### 6.3 Smoke tests

```bash
curl -fsS https://media.geoclic.fr/healthz/ && echo
curl -sS -o /dev/null -w "Agenda API : %{http_code}\n" https://media.geoclic.fr/api/events/
curl -sS -o /dev/null -w "Agenda : %{http_code}\n" https://media.geoclic.fr/agenda
curl -sS -o /dev/null -w "Marchés : %{http_code}\n" https://media.geoclic.fr/marches
curl -sS -o /dev/null -w "Découvrir : %{http_code}\n" https://media.geoclic.fr/decouvrir
curl -sS -o /dev/null -w "Admin sources : %{http_code}\n" https://media.geoclic.fr/admin/agenda/sources
```

Un `307` sur une route admin sans cookie est normal. Un `200` sur les routes
publiques et le JSON de santé sur `/healthz/` sont attendus.

### 6.4 Diagnostic Agenda depuis Django

```bash
cd /var/www/geoclicmedia/back
source .venv/bin/activate
DJANGO_SETTINGS_MODULE=config.settings.prod python manage.py shell -c "
from apps.events.models import EventSource, EventImportCandidate, EventImportRun
print('sources=', EventSource.objects.count())
print('sources_actives=', EventSource.objects.filter(is_active=True).count())
print('a_valider=', EventImportCandidate.objects.filter(status__in=['pending','invalid']).count())
print('imports=', EventImportRun.objects.count())
for s in EventSource.objects.all():
    print(s.id, s.label, s.connector, s.last_status, s.last_synced_at, s.last_error[:200])
"
```

Journaux :

```bash
sudo journalctl -u geoclicmedia-celery-worker --since "24 hours ago" --no-pager
sudo journalctl -u geoclicmedia-celery-beat --since "24 hours ago" --no-pager
sudo docker logs --since 24h geoclicmedia-crawl4ai
```

## 7. Sauvegardes : état et action urgente

Deux sauvegardes PostgreSQL manuelles du 27 juillet 2026 étaient présentes et
`/usr/local/bin/geoclicmedia-backup-pg` était installé et exécutable.

En revanche, aucune planification n'a été trouvée : aucune crontab `ubuntu`,
aucune crontab root contenant le script et aucun timer systemd correspondant.
La mention historique « sauvegardes quotidiennes » n'est donc pas confirmée.

Priorité : installer une planification, vérifier le lendemain qu'un nouveau
fichier existe, puis tester une restauration sur une base séparée.

## 8. Routes mortes et promesses non terminées

Ne jamais supprimer une route, un champ ou un placement sur la seule base d'une
recherche dans le front. Vérifier les données et les logs Nginx sur une période
définie.

| Élément | Décision actuelle |
|---|---|
| Agenda, Marchés, Découvrir | Livrés et à conserver ; il faut les alimenter |
| Sources Agenda et boîte À valider | Livrées ; activation métier restante |
| `/newsletter` | À terminer, rester masquée jusqu'au workflow RGPD/Brevo complet |
| Publication Facebook automatique | À terminer ; champs conservés, aucune promesse publique |
| Article `scheduled` | À terminer ; date, tâche Celery et tests requis |
| Statistiques annonceur | À terminer, navigation désactivée |
| DataTourisme | À terminer, connecteur actuel non opérationnel |
| Factures PDF, emails Brevo, export prospects | Reportés hors phase pilote |
| `/api/ads/serve/` | Vérifier les logs avant suppression |
| `/api/sponsor-campaigns/` | Vérifier clients externes et logs |
| `Article.sponsor_data` | Auditer et migrer avant suppression |
| placements publicitaires non rendus | Conserver tant que les données ne sont pas auditées |

Le registre détaillé reste `21-registre-routes-promesses.md`.

## 9. Feuille de route recommandée

### Priorité 0 — rendre l'Agenda réellement utile

1. Créer une première source officielle dans `/admin/agenda/sources`.
2. Commencer par un site simple et explicitement autorisé.
3. Choisir `json_ld`, `crawl4ai` ou `ics` selon la source réelle.
4. Renseigner commune, catégorie/type, note de droits et gestion des images.
5. Lancer manuellement la source.
6. Contrôler le journal et la boîte **À valider**.
7. Vérifier date, lieu, image, crédit, URL et doublons avant approbation.
8. Vérifier la fiche publique et son marqueur sur la carte.
9. Ajouter progressivement les autres communes et offices de tourisme.
10. Observer deux cycles automatiques avant de déclarer la sync fiable.

### Priorité 0 — sécuriser l'exploitation

1. Automatiser la sauvegarde PostgreSQL et surveiller son résultat.
2. Réaliser un test de restauration hors production.
3. Préparer la sortie d'Ubuntu 25.04 avec un plan d'upgrade testé.
4. Alerter sur l'échec Celery et l'état Crawl4AI.
5. Définir la rétention sécurisée des `.env.backup-*`.

### Priorité 1 — qualité de la collecte

- tester des sources HTML, JavaScript et ICS représentatives ;
- enrichir les diagnostics par page et motif de rejet ;
- mesurer faux positifs, doublons et événements manqués ;
- améliorer le géocodage sans inventer de coordonnées ;
- permettre la reprise sélective d'un import ;
- ajouter des tests d'intégration avec fixtures HTML/JSON-LD/ICS ;
- vérifier les changements d'heure Europe/Paris ;
- clarifier expiration, annulation et archivage automatiques ;
- valider la fenêtre événementielle et la carte sur mobile.

### Priorité 2 — promesses restantes

1. programmation éditoriale ;
2. statistiques annonceur fondées sur des événements réels ;
3. newsletter conforme avec double opt-in ;
4. diffusion Meta après validation API et idempotence ;
5. factures PDF et emails transactionnels ;
6. audit des compatibilités avant nettoyage historique.

## 10. Critères de fin du prochain lot

Le lot « activation de la collecte Agenda » n'est terminé que si :

- au moins une source officielle est configurée avec ses droits documentés ;
- un crawl réel produit un `EventImportRun` lisible ;
- les candidats passent par la boîte **À valider** ;
- aucun candidat n'est publié sans action humaine ;
- image officielle, remplacement manuel et mise à jour sont testés ;
- les doublons et données incomplètes sont visibles ;
- carte et fenêtre événement fonctionnent sur mobile et desktop ;
- un second cycle ne recrée pas les mêmes événements ;
- tests, migrations, build et smoke tests passent ;
- ce document et le journal d'avancement sont mis à jour.

## 11. Procédure de reprise d'une nouvelle session

1. Lire ce document.
2. Vérifier `git status`, la branche et l'écart avec `origin/main`.
3. Lire les derniers commits et pull requests mergées.
4. Vérifier la production avant de conclure qu'un lot est actif.
5. Consulter `21-registre-routes-promesses.md` avant toute suppression.
6. Montrer le diff avant édition.
7. Ne pousser, merger ou déployer qu'après accord explicite.
8. Après une évolution importante, mettre à jour ce document et le journal.

## 12. Historique récent des lots

- PR `#68` : Agenda, Marchés et Découvrir administrables ;
- PR `#69` : ingestion Agenda, carte et validation admin ;
- PR `#70` : contrôles Django de déploiement ;
- PR `#71` : service Crawl4AI isolé ;
- PR `#72` : authentification JWT Crawl4AI ;
- PR `#73` : identité et permissions runtime Crawl4AI.

Toujours revérifier GitHub et le VPS avant une nouvelle livraison.

## 13. Lot en cours : corpus de crawl mutualise

Branche de livraison : `codex/shared-crawl-pipeline`. Toujours verifier le
commit present sur GitHub et le VPS avant de considerer ce lot comme deploye.

Architecture retenue :

- `CrawlSource` porte une configuration unique pour le rendu HTTP/Crawl4AI,
  les sitemaps, la profondeur, les inclusions/exclusions et la limite ;
- `max_pages=0` supprime le plafond metier historique de 30 pages ;
- `SHARED_CRAWL_HARD_LIMIT` (5000 par defaut) reste une garde d'exploitation
  configurable. Si elle est atteinte, le crawl est `partial` et jamais `ok` ;
- `CrawlRun` trace pages decouvertes, recuperees, conservees, modifiees,
  echouees et la troncature ;
- `CrawledPage` conserve URL canonique, HTML complet compresse, texte complet,
  liens, image/metadonnees, JSON-LD, empreinte et mode de rendu ;
- les anciennes pages ne sont desactivees qu'apres un cycle complet sans
  troncature ni echec, afin qu'un incident ne vide jamais le corpus ;
- l'assistant genere ses chunks depuis `CrawledPage` ;
- une `EventSource` peut selectionner ce meme `CrawlSource` et filtrer les
  pages avec `url_patterns` ;
- l'Agenda extrait d'abord les `Event` JSON-LD, puis envoie a Mistral toutes
  les pages evenement sans JSON-LD, par segments et sans plafond de 100 ;
- chaque resultat reste obligatoirement dans la boite admin **A valider**.

Verification locale du lot :

- build Next.js 16.2.4 : OK ;
- Ruff cible : OK ;
- compilation Python : OK ;
- 10 tests unitaires extraction/Crawl4AI : OK, dont 125 evenements sans perte ;
- `manage.py check` local : OK avec les bibliotheques GDAL/GEOS de QGIS ;
- l'historique PostgreSQL doit toujours etre controle sur le VPS ou via tunnel.

Ordre de deploiement lorsque le lot sera approuve : sauvegarde PostgreSQL,
pull, migration Django, `check --deploy`, redemarrage worker/beat/API, build et
redemarrage front, puis crawl manuel de l'OT et controle des compteurs/pages.

Le premier crawl mutualise de `letsgrau.com` doit utiliser la source Assistant
existante. Dans `/admin/agenda/sources`, selectionner ce corpus, conserver les
motifs `/agenda/` et `/evenement/`, puis verifier la boite **A valider** avant
toute publication.
- `/api/admin/events/` ;
- `/api/admin/event-categories/` ;
- `/api/admin/event-sources/` ;
- `/api/admin/event-sources/<id>/run/` ;
- `/api/admin/event-imports/` ;
- `/api/admin/event-imports/<id>/approve/` ;
- `/api/admin/event-imports/<id>/reject/`.

Ces routes exigent un éditeur ou administrateur authentifié.
## 14. Collecte automatique sans recrawl inutile

Branche locale : `feat/crawl-all-button`, base `2953afd`. Au 28 juillet 2026,
ce lot n'est ni pousse, ni merge, ni deploye.

Decisions fonctionnelles :

- l'administrateur Agenda ne choisit plus JSON-LD, Crawl4AI ou ICS ; les
  nouvelles sources utilisent `EventSource.connector=auto` ;
- une URL ICS directe utilise le parseur ICS ; une page web utilise le corpus
  partage, JSON-LD en priorite, Mistral en secours, puis les flux ICS detectes
  dans les liens ;
- les anciennes sources web JSON-LD/Crawl4AI sont converties vers `auto` par
  `events.0005_eventsource_connector_auto`; les anciennes sources ICS restent
  compatibles sans changement ;
- les nouvelles sources ne recoivent plus de motifs URL implicites : toutes
  les pages du corpus sont examinees tant qu'un expert n'ajoute pas de filtre ;
- chaque candidat reste obligatoirement dans la boite admin **A valider**.

Politique anti-recrawl :

- `ensure_source_fresh()` est l'unique porte d'entree vers le rafraichissement
  du corpus partage pour l'Assistant et l'Agenda ;
- une collecte `ok` ou `partial`, contenant encore des pages actives et agee de
  moins de `SHARED_CRAWL_FRESHNESS_SECONDS`, est reutilisee sans requete au
  site officiel ;
- la valeur par defaut est 21600 secondes (6 h), alignee sur la synchronisation
  Agenda ; elle est configurable sans migration ;
- Redis verrouille chaque `CrawlSource` et une seconde verification sous verrou
  evite qu'un worker recrawle un corpus qu'un autre vient de terminer ;
- **Actualiser les sources** ne traite que les sources dues ; le bouton d'une
  fiche source et `reindex_all` restent des recrawls forces et explicites.

Validations locales : build Next.js 16.2.4 OK, ESLint cible OK, Ruff cible OK,
compilation Python OK, `manage.py check` OK, aucune migration manquante et 8/8
tests cibles OK via le runner Django. La verification de l'historique des
migrations en base n'a pas joint PostgreSQL local faute de tunnel ; elle reste
obligatoire sur le VPS.

Deploiement requis apres accord : sauvegarde PostgreSQL, pull Git, migration
Django, `check --deploy`, redemarrage API + worker + beat, rebuild et
redemarrage Next.js. Verifier ensuite qu'une synchronisation Agenda lancee
moins de 6 h apres un crawl conserve le meme `CrawlRun` et cree seulement les
candidats **A valider**.

## 15. Passerelle OVHcloud et extraction Agenda reprenable

Branche locale : `codex/feat-ovh-agenda-extraction`, base `b1be020`. Ce lot
n'est ni pousse, ni merge, ni deploye tant que son diff n'a pas ete valide.

Decision fournisseur :

- le crawl HTTP/Crawl4AI reste independant de toute IA et ne change pas ;
- les embeddings restent provisoirement sur `mistral-embed` (1024 dimensions),
  afin d'eviter une migration pgvector et une reindexation non mesurees ;
- une passerelle compatible OpenAI permet aux futures generations GeoClic
  d'utiliser OVHcloud sans dupliquer budget, cout, audit, timeout et reprises ;
- l'Agenda est le premier usage active avec `Qwen3.5-9B` et
  `reasoning_effort=none` ;
- le fournisseur reste `mistral` par defaut tant que la production n'active
  pas explicitement OVH.

Configuration de production, sans committer le secret :

```dotenv
EVENT_AI_PROVIDER=ovh
EVENT_AI_MODEL=Qwen3.5-9B
EVENT_AI_HTTP_TIMEOUT=100
EVENT_AI_MAX_ATTEMPTS=2
OVH_AI_ENDPOINTS_BASE_URL=https://oai.endpoints.kepler.ai.cloud.ovh.net/v1
OVH_AI_ENDPOINTS_ACCESS_TOKEN=<secret uniquement dans le .env du VPS>
```

Traitement retenu :

- JSON-LD et ICS restent prioritaires et gratuits ;
- seules les pages evenement sans structure sont envoyees a l'IA ;
- les pages longues sont decoupees en segments de 12 000 caracteres avec
  chevauchement de 1 000 caracteres ;
- chaque succes, y compris une reponse vide, est sauvegarde immediatement ;
- un timeout n'arrete plus les segments suivants ;
- le délai OVH est borné à 100 secondes et 2 tentatives : les réponses riches
  observées autour de 87 secondes restent acceptées, tandis qu'un segment
  indisponible ne bloque plus le pipeline pendant plus de 6 minutes ;
- la relance ne traite que les segments absents du cache ou modifies ;
- les occurrences dupliquees par le chevauchement sont fusionnees ;
- provenance URL et preuves textuelles restent verifiees ;
- tous les candidats IA restent obligatoirement dans **A valider**.

L'admin expose fournisseur, modele, progression, echecs et erreur finale. Il
interroge l'API toutes les quatre secondes tant qu'une source est en cours.

Essai reel limite du compte OVH existant le 28 juillet 2026 :

- endpoint unifie accessible et `Qwen3.5-9B` autorise, HTTP 200 ;
- raisonnement implicite : 13,39 s, 512 tokens, aucun contenu final ;
- `reasoning_effort=none` : 2,07 s, JSON valide, un evenement extrait,
  77 tokens d'entree et 80 de sortie.

Validation locale : 23 tests Django cibles OK, migration stable, compilation
Python OK, ESLint OK et build Next.js 16.2.4 OK. PostgreSQL local n'etait pas
joignable sans tunnel ; migration et historique devront etre verifies sur le
VPS avant redemarrage.

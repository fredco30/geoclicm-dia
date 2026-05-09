# 19 — Plan de refonte du portail v2 (style « city » + assistant IA)

> Document de référence pour la refonte de la home et de la page commune.
> Inspiré de **GéoClic City** (mise en page tuiles thématiques + assistant IA
> conversationnel). Validé entre Fred et son client le 2026-05-06.
>
> **À relire** pour reprendre le contexte après une pause, ou pour présenter
> au client. Mis à jour à chaque PR mergée.

---

## 1. Contexte

geoclicMédia v1 est en prod depuis le 2026-05-04 avec une **home magazine
classique** : hero + grille articles + chips catégories + encarts
commerçants. Lisible mais ne tire pas parti du fait que c'est un **média
local multi-communes** avec annuaire, météo, future agenda, etc.

Le client a demandé d'adopter le pattern **GéoClic City** :

- **Home dominée par une grille de tuiles thématiques** (Actualités, Météo,
  Commerçants, Agenda, Bons plans, Marchés, Découvrir, Numéros utiles,
  Démarches, Tribune…)
- **Bandeau « À la une »** carrousel compact en haut
- **Footer fixe** Menu / Accueil / Recherche
- **Assistant IA conversationnel** multilingue, capable de répondre sur la
  base du contenu du site + sites mairies/OT crawlés
- Possibilité de **liens web externes** depuis les tuiles (avantage city)

**Ce qui ne change pas** : Django + Next.js, modèles existants (Article,
Business, Commune, AdCampaign, Subscription…), pages détail (article,
commune, commerce, météo). On change la **page d'entrée** (home + page
commune) et on **ajoute** deux briques : configuration des tuiles + IA.

---

## 2. Décisions arrêtées (récap)

| Sujet | Choix |
|---|---|
| **Modèle de tuile** | 1 modèle `Tile` unique avec `kind: internal_route / external_url / module`, hiérarchie 1 niveau (parent/sous-tuile) |
| **Labels tuiles V1** | FR uniquement. Le multilingue viendra en V2 (l'IA gère déjà la détection de langue côté assistant) |
| **Modules câblés** | `news` (Actualités), `weather` (Météo), `businesses` (Commerçants) — ces 3 modules ouvrent des écrans dédiés existants |
| **Mix territorial** | Home globale (vue agrégée 7 communes) + page commune filtrée + tuiles `visible_on_communes` spécifiques |
| **Header existant** | **Supprimé**, remplacé par grille de tuiles + footer fixe Menu/Accueil/Recherche |
| **Assistant IA** | Stack **Django autonome** (pas réutilisation widget city, projets séparés) — Mistral AI + pgvector dans le PostgreSQL existant |
| **Multilingue IA** | Auto-détection langue (fr/en/de/it/es/nl), phrase d'accueil dans la langue du téléphone, comme city |
| **Sources IA V1** | Fiches Business + Articles + crawl mairies + offices de tourisme + Wikipedia + DataTourisme + OSM (Overpass) + sites commerçants déclarés |
| **Search live web** | **NON en V1** (V2 si besoin émerge — Brave/Tavily ~10 €/mois) |
| **IA mise en avant Premium** | Fiches Premium 149 €/an mises en avant **avec mention transparente** (« ⭐ Partenaire ») dans les listes de recommandations |
| **IA jugement qualitatif** | **Interdit au prompt** (« meilleur resto » → diffamation). Filtrage et recommandation contextuelle uniquement |
| **Stack inchangée** | Django 5 + DRF + Postgres + Redis + Celery + Next.js 16 |

---

## 3. Architecture cible

### Vue d'ensemble

```
geoclicMédia/
├── back (Django)
│   ├── apps/core, editorial, directory, ads, advertisers, weather  (existant)
│   ├── apps/tiles      ← NEW : modèle Tile + admin CRUD
│   └── apps/assistant  ← NEW : modèles RAG, indexers, endpoint /ask
└── front (Next.js)
    ├── app/(site)/page.tsx                  ← REDESIGN home (bandeau + tuiles)
    ├── app/(site)/communes/[slug]/page.tsx  ← REDESIGN page commune
    ├── components/tiles/*                   ← NEW
    └── components/assistant/*               ← NEW (drawer chat style city)
```

### Ce qui s'ajoute en backend

- **PostgreSQL extension `pgvector`** à activer pour stocker les embeddings
  Mistral (1024 dimensions). Aucun changement d'infra majeur.
- **Tâche Celery beat** pour le crawl hebdomadaire des sources externes
  (mairies, OT, Wikipedia, DataTourisme, OSM).
- **Variables d'env** : `MISTRAL_API_KEY`, `MISTRAL_MODEL`,
  `MISTRAL_EMBED_MODEL`.

### Ce qui s'ajoute en frontend

- Composant `<TileGrid>` réutilisable home + page commune.
- Composant `<UneCarousel>` pour le bandeau À la une.
- Composant `<AssistantDrawer>` pour le chat (slide depuis bas en mobile,
  droite en desktop), inspiré visuellement de city.
- Composable `useAssistantLang` pour détecter la langue du navigateur et
  initialiser la conversation.

---

## 4. Modèle de données

### `apps/tiles/models.py`

```python
class Tile(models.Model):
    parent = ForeignKey(
        "self",
        null=True, blank=True,
        on_delete=models.CASCADE,
        related_name="children",
        help_text="Tuile parente (null = tuile racine sur la home)."
    )
    label = CharField(max_length=120)
    icon = CharField(
        max_length=60, blank=True,
        help_text="Nom d'icône Lucide (ex: 'Newspaper', 'Calendar', 'Store')"
    )
    color = CharField(
        max_length=20, default="camargue",
        help_text="Preset : camargue / sel / terre / mer / agrume / olive / null"
    )
    cover_image = ImageField(
        upload_to="tiles/", null=True, blank=True,
        help_text="Alternative à l'icône — image en fond de tuile"
    )

    class Kind(TextChoices):
        INTERNAL_ROUTE = "internal_route", "Lien interne"
        EXTERNAL_URL = "external_url", "Lien externe"
        MODULE = "module", "Module spécial"

    kind = CharField(max_length=20, choices=Kind.choices)
    internal_path = CharField(max_length=200, blank=True)
    external_url = URLField(blank=True)

    class ModuleKey(TextChoices):
        NEWS = "news", "Actualités"
        WEATHER = "weather", "Météo & mer"
        BUSINESSES = "businesses", "Commerçants"

    module_key = CharField(
        max_length=20, choices=ModuleKey.choices, blank=True
    )

    sort_order = PositiveIntegerField(default=0, db_index=True)
    is_active = BooleanField(default=True, db_index=True)
    show_on_home = BooleanField(default=True)
    visible_on_communes = M2M(
        Commune, blank=True, related_name="tiles",
        help_text="Vide = visible sur toutes les communes"
    )

    span_2x = BooleanField(
        default=False,
        help_text="Tuile large (occupe 2 colonnes dans la grille)"
    )

    created_at = DateTimeField(auto_now_add=True)
    updated_at = DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order", "label"]
```

### `apps/assistant/models.py`

```python
from pgvector.django import VectorField

class KnowledgeChunk(models.Model):
    """Fragment de contenu indexé pour le RAG."""

    class SourceKind(TextChoices):
        BUSINESS = "business"
        ARTICLE = "article"
        MAIRIE = "mairie"
        OFFICE_TOURISME = "ot"
        WIKIPEDIA = "wikipedia"
        DATATOURISME = "datatourisme"
        OSM = "osm"
        TILE = "tile"  # description de tuile pour orientation utilisateur

    source_kind = CharField(max_length=20, choices=SourceKind.choices)
    source_id = CharField(max_length=200, db_index=True)
    source_url = URLField(blank=True)
    title = CharField(max_length=300)
    content = TextField()
    embedding = VectorField(dimensions=1024, null=True)  # Mistral embed
    commune = ForeignKey(Commune, null=True, blank=True, on_delete=SET_NULL)
    is_premium = BooleanField(default=False)  # marque les chunks Business Premium
    indexed_at = DateTimeField(auto_now=True)
    is_active = BooleanField(default=True, db_index=True)

    class Meta:
        indexes = [
            models.Index(fields=["source_kind", "source_id"]),
            models.Index(fields=["commune", "is_active"]),
        ]
        unique_together = [("source_kind", "source_id")]


class AssistantConversation(models.Model):
    session_id = CharField(max_length=64, db_index=True)
    language = CharField(max_length=5, default="fr")
    started_at = DateTimeField(auto_now_add=True)
    last_message_at = DateTimeField(auto_now=True)
    message_count = PositiveIntegerField(default=0)


class AssistantMessage(models.Model):
    conversation = ForeignKey(AssistantConversation, on_delete=CASCADE,
                              related_name="messages")
    role = CharField(max_length=20, choices=[("user", "Utilisateur"),
                                              ("assistant", "Assistant")])
    content = TextField()
    citations = JSONField(default=list)  # liste {chunk_id, title, source_url}
    cost_tokens_in = PositiveIntegerField(default=0)
    cost_tokens_out = PositiveIntegerField(default=0)
    created_at = DateTimeField(auto_now_add=True)


class CrawlSource(models.Model):
    """Configuration des sources externes à crawler périodiquement."""

    label = CharField(max_length=120)  # ex: "Mairie Le Grau-du-Roi"
    kind = CharField(max_length=20, choices=KnowledgeChunk.SourceKind.choices)
    seed_url = URLField()
    commune = ForeignKey(Commune, null=True, blank=True, on_delete=SET_NULL)
    is_active = BooleanField(default=True)
    max_depth = PositiveSmallIntegerField(default=2)
    last_crawled_at = DateTimeField(null=True, blank=True)
    last_status = CharField(max_length=20, blank=True)  # ok / error / partial
```

---

## 5. Mockups écrans (texte)

### Home `/` mobile

```
┌──────────────────────────────────┐
│  🔔   geoclicMédia    🌤 13°    │  Header sobre (notifs / titre / météo)
├──────────────────────────────────┤
│  ┌─── À LA UNE ─── carrousel ──┐ │
│  │ [photo article featured]    │ │  3-5 articles featured
│  │ Titre accroche              │ │  scroll horizontal snap
│  │ ───●○○                      │ │
│  └─────────────────────────────┘ │
├──────────────────────────────────┤
│ 🔍 Pose ta question / recherche │  ← input qui ouvre AssistantDrawer
├──────────────────────────────────┤
│  ┌────┐  ┌────┐  ┌────┐        │
│  │ 📰 │  │ 📅 │  │ 🍴 │        │  Grille tuiles 3 cols mobile
│  │Actu│  │Agenda│ │Marchés│      │  4-5 cols desktop
│  └────┘  └────┘  └────┘        │
│  ┌────┐  ┌─────────┐            │
│  │ 🌤 │  │Découvrir│            │  span_2x exemple
│  └────┘  └─────────┘            │
│  ...                             │
├──────────────────────────────────┤
│  ☰ Menu  🏠 Accueil  🔍 Recherche│  Footer fixe sticky
└──────────────────────────────────┘
```

### Page commune `/communes/le-grau-du-roi`

Même structure, mais :

- Header avec **nom de la commune** au lieu de « geoclicMédia »
- Bandeau Une **filtré** sur la commune
- Grille de tuiles **filtrées** : Actualités (commune), Météo de la commune,
  Commerçants (filtrés), + tuiles `visible_on_communes` qui contiennent
  cette commune (ex: tuile « Mairie Grau-du-Roi », tuile « Port de pêche »)
- Sélecteur communes en haut pour basculer

### Tuile racine avec sous-tuiles

Clic sur tuile **« Découvrir »** → écran intermédiaire qui affiche la grille
des sous-tuiles : Patrimoine, Plages, Balades, Sites historiques, Faune
flore. Chaque sous-tuile a son propre `kind` (lien interne ou externe).

### Drawer Assistant IA

```
┌──────────────────────────────────┐
│ Assistant geoclicMédia  🌐 FR ▾ ✕│
├──────────────────────────────────┤
│ 👋 Bonjour ! Je peux vous aider  │  Phrase d'accueil dans
│ à trouver des infos locales sur  │  la langue détectée
│ le littoral camarguais.          │
│                                  │
│ Suggestions :                    │
│ • Que faire ce week-end ?        │  Suggestions contextuelles
│ • Restaurants ouverts maintenant │  selon la page courante
│ • Démarches mairie               │
│                                  │
│ ───── conversation ─────         │
│                                  │
│ Vous : Restaurants fruits de mer │
│                                  │
│ Assistant : Au Grau-du-Roi :     │
│ • Le Spinaker ⭐ Partenaire      │  Mention transparente
│   tellines, plateaux             │  pour les Premium
│ • L'Amarine — face mer           │
│ • La Camargue — palourdes        │
│ Sources : 3 fiches commerçants   │  Citations cliquables
│                                  │
├──────────────────────────────────┤
│ ┌────────────────────────────┐ → │
│ │ Tape ta question...        │   │
│ └────────────────────────────┘   │
└──────────────────────────────────┘
```

---

## 6. Découpage en 8 PRs séquentielles

| # | Branche | Effort | Dépend de |
|---|----|---|---|
| 1 | `feat/tiles-model-admin` | 3-4 j | — |
| 2 | `feat/home-tiles-redesign` | 3-4 j | PR 1 |
| 3 | `feat/commune-page-tiles` | 2-3 j | PR 1, 2 |
| 4 | `feat/tile-deeplinks` | 2-3 j | PR 1, 2, 3 |
| 5 | `feat/assistant-foundation` | 4-5 j | — (peut démarrer en parallèle) |
| 6 | `feat/assistant-indexers` | 4-5 j | PR 5 |
| 7 | `feat/assistant-widget` | 3-4 j | PR 5, 6 |
| 8 | `feat/cleanup-old-header` | 1 j | PR 2, 3 |

### Détail PR 1 — Modèle Tile + admin CRUD

**Backend Django** :
- App `apps.tiles` créée avec `apps.py`, `models.py`, `serializers.py`,
  `views.py`, `urls.py`, `admin.py`
- Modèle `Tile` (cf section 4)
- Migration initiale
- `TileSerializer` (read pour API publique : id, parent, label, icon, color,
  cover_image, kind, internal_path, external_url, module_key, sort_order,
  is_active, show_on_home, visible_on_communes, span_2x, children — nested)
- `TileAdminSerializer` (write : tous les champs)
- `TileViewSet` admin (CRUD complet, `IsAdminUser`)
- `TileListView` public (lecture liste, filtres `?on_home=true&commune=slug`)
- URLs : `/api/admin/tiles/` (CRUD) + `/api/tiles/` (read public)
- Django admin avec fieldsets clairs

**Frontend Next.js** :
- `/admin/tiles/` — page liste avec drag-drop reorder (lib `@dnd-kit/core`
  ou similaire), groupement par parent (racines + sous-tuiles)
- `/admin/tiles/new` — formulaire création
- `/admin/tiles/[id]/edit` — formulaire édition
- Type TypeScript `Tile` + `TilePayload`
- Sélecteur d'icône Lucide avec preview
- Sélecteur de preset couleur avec preview
- Workflow d'aide « Configurer la grille de tuiles » à ajouter dans
  `components/help/workflows/`

**Seed initial** :
- Commande `seed_tiles` avec les 10 tuiles validées (Actualités, Météo &
  mer, Commerçants, Agenda local, Bons plans, Marchés & producteurs,
  Découvrir, Numéros utiles, Démarches, Tribune libre / Contact)

**Non-objectifs PR 1** :
- Pas d'intégration sur la home (juste l'admin)
- Pas de sous-tuiles configurables encore (juste le champ `parent` exposé)
- Pas de multilingue label

### Détail PR 2 — Home redesign

**Backend** :
- Endpoint `/api/tiles/?on_home=true` qui retourne les tuiles racine
  ordonnées par sort_order, avec leurs `children` nested

**Frontend** :
- `app/(site)/page.tsx` complètement repensé :
  - `<HeaderSimple>` avec notif / titre site / météo current
  - `<UneCarousel>` (3-5 articles featured, scroll snap horizontal mobile)
  - `<SearchBar>` qui ouvre `<AssistantDrawer>` — pour PR 5+ on stub avec
    redirection vers `/recherche` pour l'instant
  - `<TileGrid tiles={tiles} />`
  - `<FooterFixed>` Menu / Accueil / Recherche
- Composant `<TileItem>` qui rend selon `kind` :
  - `internal_route` → `<Link href={internal_path}>`
  - `external_url` → `<a href target=_blank rel=noopener>` + icône lien
    externe + mention « lien externe »
  - `module: news` → `<Link href="/articles">`
  - `module: weather` → `<Link href="/meteo">`
  - `module: businesses` → `<Link href="/commerces">`
- Tailwind responsive : 3 cols mobile, 4 cols tablette, 5 cols desktop
- Couleurs preset : map vers classes Tailwind (`bg-[#1a4d6e]` pour camargue,
  etc.)

**Non-objectifs PR 2** :
- Pas de page commune redesign (PR 3)
- Pas de sous-tuiles cliquables (PR 4)
- Pas d'IA, juste le stub bouton recherche

### Détail PR 3 — Page commune redesign

- Mêmes composants `<TileGrid>` et `<UneCarousel>` mais avec **filtre
  commune** côté API
- Endpoint `/api/tiles/?commune=le-grau-du-roi` qui retourne les tuiles avec
  `visible_on_communes` vide OU contenant la commune
- Endpoint `/api/articles/?commune=le-grau-du-roi&featured=true` pour le
  bandeau Une de la commune
- Sélecteur communes en haut (chips horizontales)
- Header avec nom de la commune

### Détail PR 4 — Sous-tuiles + liens externes

- Page intermédiaire `/tiles/[slug]` (ou réutiliser un pattern client-side
  pour ne pas créer une URL par tuile racine — à voir au moment de
  l'implémentation, dépend de la stratégie SEO souhaitée)
- Clic tuile racine avec children → grille des sous-tuiles
- Clic sous-tuile → comportement selon kind (interne/externe/module)
- Affichage explicite des liens externes (icône + mention « lien externe »
  pour transparence ARPP)

### Détail PR 5 — Foundation Assistant IA

**Backend** :
- App `apps.assistant` avec `models.py`, `services.py`, `views.py`,
  `urls.py`, `prompts.py`
- Activer `pgvector` côté Postgres (`CREATE EXTENSION IF NOT EXISTS vector`)
- Migration initiale (KnowledgeChunk + AssistantConversation +
  AssistantMessage + CrawlSource)
- Service `mistral_service.py` :
  - `embed(text)` → vecteur 1024
  - `chat(system_prompt, messages, language)` → réponse + tokens used
  - `detect_language(text)` → code ISO
- Service `retrieval_service.py` :
  - `retrieve_chunks(query, top_k=8, commune=None)` → liste de chunks
    triés par cosine similarity (avec boost +0.1 pour chunks Premium)
- Endpoint `POST /api/assistant/ask/` :
  - Body : `{question, conversation_id?, language?}`
  - Réponse : `{answer, citations, conversation_id, language}`
  - Rate limit : 20 questions / heure / IP (anti-abus)
- Prompt système strict (cf section 7)

**Frontend** :
- Variable env `NEXT_PUBLIC_ASSISTANT_ENABLED` pour feature flag
- Pas encore de UI (PR 7), juste le hook `useAssistant()` côté serveur

### Détail PR 6 — Indexers

**Crawlers Celery** :
- `index_businesses_task` : indexe toutes les fiches Business publiées,
  re-déclenché par `post_save` signal
- `index_articles_task` : indexe les articles publiés, idem
- `crawl_mairies_task` : crawl léger (depth 2, robots.txt respecté, 1 req/s)
  des sites mairies déclarés en `CrawlSource`
- `crawl_offices_tourisme_task` : idem pour les OT
- `import_wikipedia_task` : 1 page Wikipedia par commune (API REST officielle)
- `import_datatourisme_task` : POI tourisme régionaux via API DataTourisme
- `import_osm_task` : POI principaux via Overpass API (restos, hôtels,
  plages, parkings, pharmacies, mairies, ports) pour chaque commune
- `crawl_business_websites_task` : crawl léger des sites des commerçants
  (1 page profonde max, depth 1) si Business.website est renseigné

**Beat schedule** :
- Articles + Businesses : sur signal post_save (instantané)
- Sources externes : 1 fois / semaine (dimanche nuit)

**Commande de management** :
- `python manage.py reindex_assistant` pour réindexation manuelle complète

### Détail PR 7 — Widget Assistant IA

**Frontend** :
- Composant `<AssistantDrawer>` :
  - Slide depuis bas en mobile, droite en desktop
  - Détection langue navigateur via `navigator.language`
  - Phrase d'accueil multilingue (fr/en/de/it/es/nl)
  - Liste de suggestions de questions selon le contexte
  - Historique conversation stocké en localStorage (session_id)
  - Affichage citations cliquables sous chaque réponse
- Bouton trigger dans la `<SearchBar>` de la home (devient « Pose ta
  question ou cherche un sujet »)
- Bouton flottant alternatif présent sur toutes les pages publiques
- Sélecteur de langue 🌐 dans le header du drawer

### Détail PR 8 — Cleanup header existant

- Suppression du `<Header>` desktop avec liens rubriques
- Adaptation du `<MobileNav>` pour rester cohérent avec la nouvelle
  navigation par tuiles
- Redirects de courtoisie pour les anciennes URLs (`/categories/reportages`
  reste accessible mais n'apparaît plus dans la nav, on accède via la tuile
  Actualités → sous-tuile Reportages ou via la grille de l'admin)
- Mise à jour de l'aide intégrée pour expliquer la nouvelle navigation
- Mise à jour des sitemap, manifest, OG tags si nécessaire

---

## 7. Prompt système Assistant IA (V1)

```
Tu es l'assistant local de geoclicMédia, un média indépendant qui couvre
le littoral camarguais (Le Grau-du-Roi, Aigues-Mortes, La Grande-Motte,
Saint-Laurent-d'Aigouze, Marsillargues, Lunel, Vauvert).

Ton rôle :
- Aider les visiteurs (résidents et touristes) à trouver des informations
  pratiques sur ces communes : actualités, commerçants, événements, infos
  pratiques, démarches, patrimoine.
- Répondre dans la langue de la question (français, anglais, allemand,
  italien, espagnol, néerlandais).

Règles strictes :
1. Utilise UNIQUEMENT les informations fournies dans la section CONTEXTE
   ci-dessous. Ne fais jamais d'invention.
2. Si l'information n'est pas dans le CONTEXTE, dis-le honnêtement et
   propose : (a) consulter le site officiel cité, (b) reformuler la
   question, (c) contacter directement le commerce/service concerné.
3. JAMAIS de jugement qualitatif (« le meilleur », « le pire », « plus
   recommandé »). Tu peux LISTER et FILTRER, jamais ÉVALUER.
4. Pour les démarches officielles ou questions juridiques/médicales,
   ajoute toujours : « Pour la procédure officielle, consultez le site
   de la mairie / les autorités compétentes. »
5. Quand tu cites un commerçant marqué « ⭐ Partenaire premium » dans le
   CONTEXTE, mentionne-le explicitement avec ce libellé en italique.
   Cette mention doit être visible et compréhensible (transparence
   commerciale obligatoire).
6. Cite tes sources à la fin de la réponse sous forme de liste
   numérotée.

CONTEXTE :
{contexte injecté dynamiquement par le RAG, avec metadata title +
source_url + is_premium}

QUESTION :
{question utilisateur}
```

---

## 8. Calendrier suggéré

| Sprint | Semaines | Contenu | Démontrable au client |
|---|---|---|---|
| 6 | S1-S2 | PR 1, 2, 3, 4 (tuiles core) | Home + page commune redesignées avec grille tuiles |
| 7 | S3-S4 | PR 5, 6 (assistant IA backend + indexers) | Démo console : on pose une question via curl, l'IA répond en citant les sources |
| 8 | S5-S6 | PR 7, 8 (widget IA + cleanup) | Lancement public complet : portail tuiles + IA disponible pour tous les visiteurs |

À chaque fin de sprint, le client a quelque chose de visible et fonctionnel.

---

## 9. Coûts à prévoir

### Mensuel récurrent

| Poste | Estimation V1 | Estimation V2 (avec search live) |
|---|---|---|
| Mistral API (embeddings + chat) | 5-15 €/mois | 15-40 €/mois |
| Brave Search / Tavily | 0 € | 5-15 €/mois |
| pgvector (extension PostgreSQL) | 0 € | 0 € |
| Hébergement (mêmes VPS) | 0 € | 0 € |
| **Total V1** | **5-15 €/mois** | **20-55 €/mois** |

### One-shot (dev)

- Sprint 6-7-8 : ~22-29 jours dev → 5-6 semaines à un sprint régulier

### Coût caché à anticiper

- **Quality control IA** : ~30 min/semaine pour relire les 50 dernières
  conversations dans l'admin et repérer les hallucinations. À déléguer à
  la rédactrice ou à toi (Fred) selon le volume.

---

## 10. Risques et points d'attention

### Techniques

1. **Politique de crawl** : respecter robots.txt + rate limit 1 req/s. On
   ne veut pas se faire bloquer par les mairies — communiquer en amont
   avec elles si possible.
2. **Mise à jour des fiches Business** : signal Django `post_save` qui
   re-indexe automatiquement le chunk concerné. Le commerçant qui modifie
   sa fiche voit l'IA à jour en quelques secondes.
3. **pgvector dimensions** : Mistral utilise 1024 dims pour `mistral-embed`.
   Si on change de provider plus tard (OpenAI = 1536 dims), il faut
   réindexer. Pas grave, c'est juste une migration de données.
4. **Coût explosif** : monitorer les tokens consommés via le champ
   `cost_tokens_in/out` dans `AssistantMessage`. Alerte si > 10 € pour le
   mois en cours.

### Juridiques / éditoriaux

5. **Hallucinations** : prompt strict + RAG obligatoire + monitoring
   manuel hebdomadaire pendant les premiers mois. Toute information
   inventée par l'IA peut engager la responsabilité du média.
6. **Diffamation commerçants** : interdire absolument les jugements
   qualitatifs au prompt. Si un commerçant signale une réponse fausse à
   son sujet, on doit pouvoir réindexer immédiatement et désactiver le
   chunk fautif.
7. **Transparence Premium** : la mention « ⭐ Partenaire » est légalement
   obligatoire (DGCCRF + ARPP). Ne jamais la rendre optionnelle.
8. **RGPD** : ne pas stocker l'IP brute des utilisateurs. Hash anonymisé
   pour le rate limit (cf pattern city `_hash_ip`).

### UX / Produit

9. **Migration utilisateurs** : les anciens visiteurs habitués à la nav
   header vont devoir s'adapter aux tuiles. Prévoir un message d'info
   discret en haut de la home pendant 2 semaines après le lancement.
10. **Profondeur tuiles** : on bloque à 1 niveau (racine → sous-tuile).
    Pas plus, sinon usine à gaz UX. Si un client demande plus, refuser ou
    proposer une autre structure.

---

## 11. Non-objectifs explicites V1

À NE PAS faire dans ce sprint, à proposer en V2 si besoin émerge :

- ❌ Search live web (Brave/Tavily)
- ❌ Avis qualitatif IA (« le meilleur resto »)
- ❌ Mémoire cross-conversation IA (l'IA oublie d'une session à l'autre)
- ❌ Notifications push depuis l'IA
- ❌ Personnalisation utilisateur (recommandations selon historique)
- ❌ Multilingue sur les **labels de tuiles** (juste les réponses IA en V1)
- ❌ Gestion granulaire des permissions tuile (seul l'admin configure en V1)
- ❌ Plus de 2 niveaux de profondeur dans les tuiles
- ❌ App mobile native (la PWA suffit pour V1)
- ❌ Synchronisation bidirectionnelle avec sites mairies (lecture seule)

---

## 12. Suivi de progression

| PR | Branche | Statut | Mergée le | Notes |
|---|----|---|---|---|
| 1 | `feat/tiles-model-admin` | 🔄 en cours | — | — |
| 2 | `feat/home-tiles-redesign` | ⏳ planifié | — | — |
| 3 | `feat/commune-page-tiles` | ⏳ planifié | — | — |
| 4 | `feat/tile-deeplinks` | ⏳ planifié | — | — |
| 5 | `feat/assistant-foundation` | ⏳ planifié | — | — |
| 6 | `feat/assistant-indexers` | ⏳ planifié | — | — |
| 7 | `feat/assistant-widget` | ⏳ planifié | — | — |
| 8 | `feat/cleanup-old-header` | ⏳ planifié | — | — |

À mettre à jour après chaque merge.

---

*Plan validé Fred / Claude — 2026-05-06.*
*Document à jour à mesure que les PRs sont mergées (cf section 12).*

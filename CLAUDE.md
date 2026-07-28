# Brief pour Claude — geoclicMédia

> Tu travailles sur geoclicMédia, un média local indépendant pour le
> littoral camarguais. Ce fichier capture l'essentiel pour reprendre
> contexte rapidement. Pour le détail, voir `docs/`.

---

> **Reprise obligatoire** : lire d'abord
> [`docs/24-continuite-projet.md`](docs/24-continuite-projet.md), puis le
> registre `docs/21-registre-routes-promesses.md`. Le 28 juillet 2026, Agenda,
> Marchés, Découvrir et le pipeline Crawl4AI → JSON-LD → repli Mistral → boîte
> « À valider » sont déployés, mais aucune `EventSource` n'est encore configurée
> et aucun crawl métier n'a été exécuté. Ne jamais présenter le moteur déployé
> comme une collecte déjà active.

## Le projet en 30 secondes

- **Quoi** : média local + annuaire commerces + assistant IA pour le
  littoral camarguais (Le Grau-du-Roi, Aigues-Mortes, La Grande-Motte,
  Saint-Laurent-d'Aigouze, Marsillargues, Lunel, Vauvert).
- **Pour qui** : Fred (dev solo) + sa partenaire (rédactrice, contenu
  éditorial + démarchage commercial). Cible visiteurs : locaux +
  touristes.
- **Stade** : Sprint 1 livré le 2026-05-04. Sprints 3+4 (régie pub +
  Stripe self-service) livrés le 2026-05-05. Refonte v2 « pattern city »
  (tuiles + assistant IA Mistral) livrée le 2026-05-07. Itérations
  2026-05-09 : deep-links Maps/Waze sur citations IA, fix aspect ratio
  tuiles span_2x, rubrique Pratique (numéros utiles + démarches), CRUD
  catégories d'articles dans le back-office Next.
- **URL prod** : <https://media.geoclic.fr>
- **VPS** : OVH Ubuntu, IP 135.125.159.142, sous-domaine de geoclic.fr
  (Fred a un autre projet GéoClic Suite déjà sur ce VPS).

---

## Stack

### Backend (`back/`)
Django 5.1 + DRF + PostgreSQL 17 + PostGIS 3 + pgvector + Redis +
Celery + django-celery-beat + dj-stripe.

Apps métier : `core` (User+Commune+Media), `editorial` (Article+Category),
`directory` (Business+Category), `ads` (AdCampaign), `advertisers`
(Subscription+Invoice), `weather` (Open-Meteo), `tiles` (grille
d'accueil configurable), `assistant` (RAG Mistral + indexers),
`utility` (numéros utiles + démarches admin).

### Frontend (`front/`)
Next.js 16.2 (App Router, webpack forcé) + React 19 + TypeScript +
Tailwind 4 + shadcn/ui + Lucide + MapLibre GL JS (carte commerces).

⚠️ **Next.js 16 a des breaking changes** par rapport à ta connaissance
de Next.js. Voir `front/AGENTS.md`. En pratique : préfère t'inspirer du
code existant (les pages admin sont en Next 16 et fonctionnent) que de
te fier à ta mémoire.

### Hébergement / déploiement
- VPS OVH avec Nginx en reverse proxy (vhost `media.geoclic.fr`)
- Services systemd : `geoclicmedia-django` (gunicorn), `geoclicmedia-next`,
  `geoclicmedia-celery-worker`, `geoclicmedia-celery-beat`
- Path : `/var/www/geoclicmedia/back` et `/var/www/geoclicmedia/front`
- HTTPS Let's Encrypt + auto-renew

---

## Workflow Git — IMPORTANT

**Règles strictes** côté Fred :
- **Jamais de push direct sur main** depuis Claude. Le sandbox bloque
  par défaut, et c'est aussi explicite côté Fred.
- **Une branche + une PR par lot livré**. Convention de nommage :
  `feat/<description>`, `fix/<description>`, `docs/<description>`,
  `chore/<description>`.
- Claude push la branche et tente d'ouvrir la PR via `gh pr create`. Si
  `gh` n'est pas authentifié (parfois le cas), Claude fournit le lien
  GitHub `https://github.com/fredco30/geoclicm-dia/pull/new/<branch>`
  pour que Fred ouvre la PR via UI.
- **Jamais demander à Fred de push lui-même** — il l'a explicitement
  refusé.
- Fred merge la PR sur GitHub puis lance le déploiement VPS lui-même.

**PRs empilées** (chaînes) : quand Claude lance plusieurs PRs en
séquence sans attendre les merges, chaque branche est basée sur la
précédente (pattern utilisé pour la refonte v2). Fred merge dans l'ordre,
GitHub réduit naturellement chaque PR à ses propres commits.

---

## Secrets — règle absolue

**Ne JAMAIS demander à Fred de coller un secret dans le chat**, et
l'arrêter immédiatement s'il le fait. Concerne :
- Stripe `sk_test_*`, `sk_live_*`, `whsec_*`
- Mistral API key
- Mots de passe, tokens GitHub/Brevo/MapTiler/Meta, clés SSH

Fred a déjà collé une `sk_test` dans le chat malgré un avertissement —
c'est un réflexe à corriger avant le passage en mode LIVE 2027.

**Procédure** : pour tout secret, dire à Fred de le coller directement
dans le `.env` du VPS via `nano`/`vim`, jamais dans le chat. Donner des
placeholders type `MISTRAL_API_KEY=xxx` qu'il remplace lui-même côté
serveur.

---

## Préférences fortes de Fred

- Réponses **courtes et précises**, jamais redondantes avec ce qu'il
  sait déjà.
- Pas de **sur-engineering** en v1 (factories, abstractions inutiles,
  pre-commit hooks, husky).
- Avancer **par étapes validées**, pas tout balancer d'un coup.
- Si choix structurant : **2 options courtes** pour/contre, puis trancher.
- Le contredire si on l'oriente mal — il préfère la franchise.
- **Back-office custom plutôt que Django Admin** pour le travail
  quotidien. Django Admin reste utile en debug/seed, mais l'interface
  principale est custom Next.js (pour sa partenaire qui n'est pas tech).
  Couvert côté Next : articles, commerçants, catégories commerçants,
  régie pub, tuiles d'accueil, Pratique (numéros + démarches),
  catégories d'articles, sources IA, comptes & droits.

---

## Conventions de commandes shell

**Toujours donner des one-liners autonomes** avec `cd` inclus :

```bash
cd /var/www/geoclicmedia/back && source .venv/bin/activate && python manage.py migrate
```

**Pour les déploiements**, toujours commencer par `git pull` (sinon
`migrate <app>` plante avec « No installed app with label 'X' » parce
que l'app vient d'être ajoutée par la PR pas encore récupérée) :

```bash
cd /var/www/geoclicmedia && git pull && cd back && source .venv/bin/activate && python manage.py migrate && cd ../front && rm -rf .next && NODE_OPTIONS="--max-old-space-size=4096" npm run build && sudo systemctl restart geoclicmedia-django geoclicmedia-next
```

Adapter les services à redémarrer selon ce que la PR touche (Django
seul, Next seul, Celery, etc.).

---

## Pièges déjà rencontrés (à éviter de reproduire)

### PWA / Service Worker

- **Ne JAMAIS laisser `cacheOnFrontEndNav: true` ou
  `aggressiveFrontEndNavCaching: true`** dans next-pwa pour un site avec
  back-office authentifié. Causes des boucles `ERR_FAILED` /
  `ERR_TOO_MANY_REDIRECTS` côté navigateur (les 307 d'auth sont cachés
  et reservis en boucle).
- Si on active next-pwa, **toujours fournir un `runtimeCaching` custom
  qui exclut explicitement** `/admin/*`, `/advertiser/*`, `/api/*`,
  `/django-admin/*`, `/stripe/*`, `/r/*`. Plus un plugin
  `cacheWillUpdate` qui rejette les responses 3xx, opaqueredirect, et
  Set-Cookie. Voir `front/next.config.ts` pour la config sûre actuelle.
- Pour purger les SW pollués chez les utilisateurs existants : pattern
  « killer SW » dans `front/public/sw.js` (skipWaiting + purge caches +
  unregister).

### URLs publiques et bloqueurs de pub

- **Éviter `/ads/`, `/banner/`, `/popup/`** dans tout chemin public
  fetché par le navigateur. uBlock/AdBlock matchent agressivement → 30-
  40 % du trafic FR est concerné. Préférer `/regie/`, `/sponsors/`,
  `/encarts/`, `/r/` (redirect court neutre).
- Le code interne (composants React, modèles Django, types TS) peut
  garder `Ad*` dans les noms — les bloqueurs ne lisent pas les bundles
  JS, ils matchent les URLs HTTP.
- **Tester avec uBlock activé** sur les fonctionnalités critiques
  (régie pub côté visiteurs).

### Migrations manquantes

- L'app `apps.advertisers` a vécu plusieurs jours sans sa migration
  initiale — Django taisait le warning et tout plantait à la première
  écriture. Toujours faire `python manage.py makemigrations <app> --check
  --dry-run` après ajout d'app, et ne jamais commiter une app dans
  INSTALLED_APPS sans sa migration `0001_initial`.

### Cache Next non invalidé après modification admin

- L'API publique `/api/tiles/` (et autres endpoints similaires) est
  servie par Next.js avec `revalidate: 300` côté data cache. Quand un
  admin modifie une tuile (ou tout objet exposé via cette stratégie),
  le cache n'est PAS invalidé automatiquement — la home continue
  d'afficher l'ancienne version pendant jusqu'à 5 min. Workaround
  immédiat : `sudo systemctl restart geoclicmedia-next` après save admin.
  Fix propre futur : Server Action ou endpoint Next qui appelle
  `revalidateTag("tiles")` après le PATCH/POST côté client.

### Tailwind 4 + arbitrary classes dynamiques

- En Tailwind 4, les classes Tailwind composées dynamiquement à partir
  de strings (ex: `\`${preset.bg} ${preset.text}\``) restent OK tant
  que les sources sont des littéraux statiques quelque part dans le
  code scanné (`tile-presets.ts`). Mais une couleur `bg-[#fbf9f5]`
  (preset « Sel ») devient quasi-invisible sur fond blanc — rendre la
  délimitation explicite avec une bordure légère plutôt que compter
  sur le fond seul.

---

## Documentation projet

Tout est dans `docs/` (numérotation chronologique) :

- `00-README.md` — index
- `01-vision-strategie.md`, `02-modele-economique.md`,
  `03-architecture-technique.md`, `04-modeles-donnees.md` —
  fondations
- `05-roadmap-sprints.md`, `06-sprint-1-fondations.md`,
  `07-sprint-2-diffusion.md` — sprints
- `08-meta-app-setup.md`, `09-seo-strategie.md`,
  `10-espace-annonceurs.md`, `11-equipe-organisation.md`,
  `12-checklist-demarrage.md` — opérationnel
- `13-references-geoclic.md` — patterns issus de GéoClic Suite
- `14-journal-avancement.md` — journal des sprints
- `15-administration-utilisateurs.md`, `16-guide-redactrice.md` — guides
  utilisateurs métier (à partager à la rédactrice)
- `17-monitoring.md` — alertes, healthchecks
- **`19-plan-refonte-portail-v2.md`** — chantier « pattern city » +
  assistant IA (8 PRs livrées 2026-05-07)
- **`20-assistant-ia-deploiement.md`** — procédure activation Mistral +
  pgvector côté VPS

---

## Référence externe

`C:\Users\projets\geoclic_final\` (PC Fred local) — codebase **GéoClic
Suite** de Fred, autre projet (SaaS pour collectivités). Mêmes patterns
Django/Celery/Pillow/Nginx/systemd. À consulter pour voir comment Fred
fait habituellement (settings split, vhost Nginx, gunicorn, etc.).
**Attention** : geoclicMédia doit être plus simple architecturalement,
ne pas copier-coller aveuglément.

---

## Lecture obligatoire avant tout changement structurel

1. La section "Workflow Git" ci-dessus.
2. La section "Secrets — règle absolue" ci-dessus.
3. `docs/19-plan-refonte-portail-v2.md` si on touche au portail public ou
   à l'assistant IA.

Le reste se découvre à la demande.

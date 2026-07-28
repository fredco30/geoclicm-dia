# 21 — Registre des routes et promesses produit

**Audit local vérifié le 26 juillet 2026** sur le commit GitHub `1a98433`.

Ce registre empêche trois dérives : laisser un lien qui mène vers un 404,
afficher une fonction qui ne produit aucun effet, ou supprimer une compatibilité
sans preuve d'usage. Une promesse ne peut avoir que l'un des états suivants :

- **LIVRÉE** : route et workflow présents, contrôlés par le build ou le code.
- **À TERMINER** : valeur produit confirmée, lot d'implémentation identifié.
- **MASQUÉE** : structure conservée, mais aucune activation proposée tant que le
  workflow n'est pas complet.
- **REMPLACÉE** : ancien nom redirigé ou retiré au profit d'une route canonique.
- **À VÉRIFIER SUR DONNÉES** : aucune suppression avant contrôle de la base ou
  des journaux d'accès.

> Limite de cet audit : la base PostgreSQL locale et le serveur de production
> n'étaient pas joignables. L'état des tuiles et campagnes déjà enregistrées en
> production ne peut donc pas être confirmé avec les éléments disponibles.

## Routes publiques

| Élément | Preuve dans le code | Décision | Action / condition de sortie |
|---|---|---|---|
| `/articles` | `Tile.ModuleKey.NEWS` y renvoie, mais la page index manquait | **LIVRÉE dans le présent lot** | Liste paginée créée et ajoutée au sitemap ; build Next validé |
| `/articles/[slug]`, `/categories/[slug]`, `/commerces`, `/commerces/[slug]`, `/communes/[slug]`, `/meteo/[commune]` | Routes présentes dans le build Next | **LIVRÉES** | Conserver et couvrir par smoke tests métier avec une base de test |
| `/agenda` | Modèles `Event` + `EventOccurrence`, API, CRUD admin, filtres publics, détail et ICS présents ; route confirmée par le build | **LIVRÉE localement** | Appliquer la migration `events/0001`, seeder les catégories et réaliser le smoke test avec PostgreSQL/PostGIS |
| `/marches` | Vue composée des événements `kind=market` et des fiches `Business.is_local_producer` ; route confirmée par le build | **LIVRÉE localement** | Appliquer `directory/0003`, qualifier les producteurs existants dans l'admin, puis contrôler filtres et pagination sur données réelles |
| `/decouvrir` | Modèles `PlaceCategory` + `Place`, relations vers articles/commerces/événements, CRUD admin et pages publiques présents | **LIVRÉE localement** | Appliquer `discovery/0001`, seeder les catégories et réaliser le smoke test cartographique sur données réelles |
| `/categories/bons-plans`, `/categories/tribune-libre` | Tuiles dynamiques dépendantes de catégories en base ; commande idempotente `seed_editorial_categories` ajoutée | **LIVRÉES sous condition de seed** | Exécuter le seed éditorial dans le même déploiement et vérifier les deux réponses HTTP |
| `/annuaire` | Ancien nom dans les documents ; route canonique actuelle `/commerces` | **REMPLACÉE** | Redirection permanente `/annuaire` → `/commerces` |
| `/newsletter` | Roadmap et placement publicitaire présents ; aucune app, page ou collecte email | **À TERMINER**, mais **MASQUÉE** | Réouvrir seulement après choix Brevo, consentement, double opt-in, désinscription et politique de conservation |

## Back-offices et workflows

| Élément | Preuve dans le code | Décision | Action / condition de sortie |
|---|---|---|---|
| `/admin/settings/users` | CRUD Next et API `/api/users/` présents | **LIVRÉE** | Ancienne promesse `/admin/users` redirigée vers la route canonique |
| `/admin/regie/campagnes` | Pages Next et API campagnes présentes | **LIVRÉE** | Ancienne documentation `/admin/ads/campaigns` couverte par redirection |
| `/admin/agenda` | Liste, création/édition, catégories, séries hebdomadaires et exceptions par occurrence | **LIVRÉE localement** | Migration + smoke test avec rôles editor/admin requis avant production |
| `/admin/decouvrir` | Liste, création/édition, catégories et relations vers contenus publiés | **LIVRÉE localement** | Migration + smoke test avec rôles editor/admin requis avant production |
| Statut article `scheduled` | Choix visible, mais aucun `scheduled_at` ni tâche de publication | **À TERMINER**, mais **MASQUÉE** | Le choix n'est plus proposé aux nouveaux articles ; terminer avec date, Celery, reprise sur erreur et tests de fuseau horaire |
| Publication Facebook automatique | Champs `facebook_*` présents ; aucune tâche métier ni appel Meta dans `back/apps` | **À TERMINER**, non annoncée dans le front | Ne pas supprimer les champs avant arbitrage Meta ; ne pas présenter la diffusion comme active avant un test réel et idempotent |
| Statistiques annonceur `/advertiser/stats` | Navigation désactivée, aucune page | **À TERMINER**, mais **MASQUÉE** | Libellé « prévu » ; construire après définition des événements, consentement analytics et agrégations |
| DataTourisme | Type de source présent, indexeur explicitement no-op même avec une clé | **À TERMINER**, mais **MASQUÉE** | Création masquée et exécution bloquée ; réactiver après client API, mapping, quotas et tests |
| FAQ générée par l'aide IA | Visible en aperçu, absente de `Business`, non envoyée par `onApply` | **CONSERVÉE comme suggestion non persistée** | Ne pas promettre de champ futur ; l'interface indique qu'elle doit être copiée manuellement |
| PDF de facture / emails Brevo / export prospects | Modèle `Invoice.pdf_file` présent ; Lot F explicitement repoussé dans le journal | **À TERMINER plus tard** | Reste hors pilote ; ne pas afficher de téléchargement PDF métier tant que génération et archivage ne sont pas livrés |

## Routes et structures de compatibilité

| Élément | Décision | Condition avant suppression |
|---|---|---|
| `/api/ads/serve/` | **À VÉRIFIER SUR DONNÉES** ; le front public utilise `/api/sponsors/serve/` | Confirmer zéro appel dans les logs Nginx sur une fenêtre définie, puis annoncer la dépréciation |
| `/api/ad-campaigns/` et `/api/advertiser/ad-campaigns/` | **LIVRÉES et utilisées** | Ne pas supprimer : les formulaires admin/annonceur les consomment encore |
| `/api/sponsor-campaigns/` | **À VÉRIFIER SUR DONNÉES** ; aucun appel trouvé dans le front local | Vérifier clients externes et logs avant retrait |
| `Article.sponsor_data` | **À VÉRIFIER SUR DONNÉES** ; champ marqué legacy, FK `sponsor` déjà présente | Compter les lignes non vides, migrer les données, sauvegarder, puis seulement créer une migration de suppression |

## Placements publicitaires

Les seuls placements dont un composant `<AdSlot>` est confirmé dans le front
sont :

- `home_sidebar`
- `article_inline`
- `directory_top`
- `agenda_top`
- `weather_top`
- `weather_sidebar`

`home_hero`, `article_sidebar`, `directory_inline` et
`newsletter` restent dans le modèle pour compatibilité, mais ne sont plus
proposés lors de la création d'une campagne. Une campagne historique utilisant
l'un d'eux reste éditable avec un avertissement « non diffusé actuellement ».

## Ordre de continuation recommandé

1. Ajouter une base PostgreSQL/PostGIS de test reproductible et exécuter toute
   la suite Django, y compris les migrations.
2. Réaliser un smoke test des routes livrées avec données de fixture et rôles
   reader/advertiser/editor/admin.
3. Construire le workflow de programmation éditoriale complet.
4. Charger un premier jeu de contenus Agenda/Découvrir et qualifier les
   producteurs depuis le portail admin.
5. Mesurer les besoins réels avant statistiques annonceur, newsletter et Meta.
6. Auditer les données/logs avant toute suppression des alias API et champs
   legacy.

## Discipline de livraison

- Aucun push ni déploiement n'est inclus dans cet audit.
- Le seed ne doit pas être exécuté sur un environnement public avant que les
  trois routes confirmées soient livrées dans le même déploiement.
- Chaque passage **MASQUÉE → LIVRÉE** exige lint, typage, build, tests backend,
  migration contrôlée si nécessaire, puis smoke test sur l'interface cible.

## Mise à jour de production — 28 juillet 2026

Cette section remplace les mentions « livrée localement » de l'audit du
26 juillet lorsque les éléments suivants sont concernés.

| Élément | État vérifié | Décision actuelle |
|---|---|---|
| `/agenda`, `/agenda/[slug]` et ICS | Déployés, API et page à `200` | **LIVRÉS** |
| `/marches` | Déployé et smoke test à `200` | **LIVRÉ** ; contenu métier à qualifier |
| `/decouvrir` et détail | Déployés, API et page à `200` | **LIVRÉS** ; contenu métier à charger |
| `/admin/agenda/sources` | Route déployée, redirection auth `307` attendue | **LIVRÉE**, mais aucune source configurée |
| `/admin/agenda/imports` | Route déployée, redirection auth `307` attendue | **LIVRÉE**, boîte vide avant premier crawl |
| Crawl4AI | Conteneur `running/healthy`, appel anonyme `/crawl` refusé `401` | **LIVRÉ et protégé par JWT** |
| JSON-LD puis repli Mistral | Pipeline présent, Mistral configuré | **LIVRÉ**, à valider sur une vraie source |
| Synchronisation toutes les 6 h | Tâche Celery Beat présente et activée | **LIVRÉE**, sans effet tant que `EventSource=0` |
| Image officielle + remplacement admin | Deux champs source/manuelle et priorité manuelle présents | **LIVRÉ**, à tester sur une vraie image |

État de données constaté : `0` source, `0` exécution d'import et `0` candidat.
Le prochain lot n'est donc pas un nouveau moteur de crawl, mais l'activation
contrôlée de sources officielles et la validation métier du premier cycle.

Les décisions de conservation restent inchangées pour `/newsletter`, la
programmation éditoriale, Meta, DataTourisme, les statistiques annonceur, les
factures PDF et les compatibilités publicitaires. Aucun retrait ne doit être
fait sans audit des données et des logs.

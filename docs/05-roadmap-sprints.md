# 05 — Roadmap et planning par sprints

## Vue d'ensemble

Calendrier réaliste pour un développeur (Fred) à temps partiel (~15-20h/semaine) en parallèle de GéoClic Suite, avec une partenaire dédiée au contenu et au démarchage commercial.

```
Mai 2026         Sprint 1 : Fondations PWA + back-office
                 Sprint 2 : Diffusion Facebook + Agenda + Annuaire
Juin 2026        Sprint 3 : Régie pub manuelle + Newsletter + Analytics
Juillet 2026     LANCEMENT PILOTE — saison estivale
                 → Démarchage 10-15 commerçants pilotes
Août 2026        Phase observation + recueil feedback
Septembre 2026   Sprint 4 : Espace annonceur self-service + Stripe
Octobre 2026     Sprint 5 : Contenus contributifs + Instagram
Novembre 2026    Sprint 6 : Optimisations SEO + Polish
Décembre 2026    Préparation lancement commercial 2027
Pâques 2027      LANCEMENT COMMERCIAL — offres payantes actives
Été 2027         Pic d'activité — saison 2 (objectif: 60-90 annonceurs)
```

## Sprint 1 — Fondations (2 semaines, mi-mai 2026)

**Objectif** : PWA installable qui affiche des articles, back-office Django pour publier.

**Livrables** :
- Site public en ligne sur le domaine final, HTTPS
- Back-office Django avec gestion articles + médias
- PWA installable (Android et iOS)
- 10-15 articles de seed pour le test
- Pipeline de déploiement opérationnel

**Voir le détail** : [06-sprint-1-fondations.md](./06-sprint-1-fondations.md)

## Sprint 2 — Diffusion + Agenda + Annuaire (2 semaines, fin mai-début juin)

**Objectif** : Workflow "publier une fois, diffuser partout" + ajout des modules événements et commerçants.

**Livrables** :
- Publication automatique vers Facebook depuis Django
- Open Graph et Schema.org propres
- Module Agenda événementiel
- Module Annuaire commerçants (saisie manuelle)
- Carte interactive globale
- Newsletter prête à recevoir des inscriptions
- Analytics RGPD (Plausible)

**Voir le détail** : [07-sprint-2-diffusion.md](./07-sprint-2-diffusion.md)

## Sprint 3 — Régie pub + Newsletter auto + Analytics avancés (2 semaines, juin)

**Objectif** : Industrialisation de la gestion publicitaire côté admin et tracking annonceur.

**Livrables** :
- Modèle AdCampaign + affichage des encarts dans le site
- Back-office régie : créer une campagne, l'assigner à un commerçant, suivi des stats
- Newsletter automatique hebdomadaire (best-of)
- Tracking détaillé des fiches commerçants (vues, clics phone/email/site)
- Tableau de bord interne (MRR simulé, audience, top contenus)
- Module "Bons plans" / promos commerçants
- Schema.org Event sur tous les événements

## Phase pilote — Été 2026 (juillet-août)

**Pas de dev majeur, focus terrain.**

Activités :
- Démarchage en main propre 10-15 commerçants pilotes
- Saison estivale gratuite contre engagement témoignage
- Saisie manuelle des fiches via admin Django
- Couverture éditoriale dense de la saison
- Recueil feedback annonceurs et lecteurs
- Mesure d'audience initiale

Métriques de succès attendues :
- 30-50 articles publiés
- 5 000-10 000 sessions/mois
- 10-15 commerçants pilotes signés
- Listes Brevo : 100-300 abonnés newsletter

## Sprint 4 — Espace annonceur self-service (3-4 semaines, septembre)

**Objectif** : automatiser la régie pour passer le plafond de gestion manuelle.

**Livrables** :
- Inscription/connexion annonceur (séparé du backend admin)
- Wizard création de fiche
- Édition de fiche (description, photos, horaires, etc.)
- Choix et achat de formules via Stripe (abonnement annuel)
- Achat add-ons (encarts mensuels, mises en avant)
- Tableau de bord annonceur : stats, factures, abonnements
- Workflow de modération (toi valides nouvelles fiches)
- Génération automatique factures PDF
- Webhooks Stripe pour gérer renouvellements/échecs paiements

## Sprint 5 — Contributions citoyennes + Instagram (2 semaines, octobre)

**Objectif** : engagement communautaire + canal Instagram.

**Livrables** :
- Formulaire contribution (envoi photo + anecdote par lecteur)
- Workflow de modération éditoriale
- Sync Instagram via Meta Graph API (publications synchronisées)
- Notifications push PWA (VAPID)
- Module commentaires modérés (si jugé pertinent)

## Sprint 6 — Optimisations SEO + Polish (2 semaines, novembre)

**Objectif** : maximiser la captation de trafic touristique pour la saison 2027.

**Livrables** :
- Pages communes profondes (1500-2500 mots) pour les 8-10 territoires couverts
- Guides thématiques saison 2027
- Schema.org sur 100% du site
- Audit performance complet (Lighthouse 95+)
- Optimisation images (WebP/AVIF généralisé)
- Soumission Google News
- Backlinks campaign (institutionnels, partenaires)

## Phase commerciale — Hiver 2026/2027

**Activités hors-dev** :
- Création SAS (si pas déjà fait)
- Plaquette commerciale finalisée
- Témoignages vidéo des pilotes
- Démarchage actif via la commerciale
- Lancement campagne "Pré-réservez votre fiche pour la saison 2027" avec tarif découverte

## Saison 2027 — Pâques à fin été

**Métriques cibles** :
- 60-90 annonceurs payants
- 25 000-50 000 sessions/mois
- MRR ~1 000-1 500 €
- 250+ articles publiés
- Newsletter : 1 500-3 000 abonnés
- Top 3 Google sur 30+ requêtes locales

## Sprints futurs envisagés (2027+)

- **Multilingue** (anglais prioritaire) pour capter tourisme étranger
- **App native via Capacitor** si l'usage PWA dépasse 50% des sessions
- **Module réservation** intégré pour restaurants/activités (commission)
- **Réplication territoriale** (un autre bassin couvert)
- **Marketplace de prestataires** (mise en relation événements privés)

## Règles de pilotage

### Definition of Done

Une feature n'est livrée que si :
- Code écrit et reviewé
- Tests unitaires des points critiques
- Documentation à jour (README + ADR si choix structurant)
- Déployée en prod
- Testée par toi sur le device cible (mobile en priorité)
- Validée par la partenaire si elle est utilisatrice (back-office, espace annonceur)

### Gestion du scope creep

- Tout nouveau besoin = ticket
- Pas de "tant qu'on y est" en plein sprint
- Revue mensuelle de la roadmap pour ré-arbitrer
- "Le mieux est l'ennemi du bien" : v1 simple > v0 reportée

### Mesure et apprentissage

- Réunion bilan fin de chaque sprint (toi + partenaire)
- Tableau de bord audience consulté chaque lundi
- Feedback annonceurs collecté systématiquement
- Hypothèses business validées ou invalidées explicitement

# 10 — Espace annonceur self-service

L'espace annonceur est ce qui transforme votre projet de "site sympa" en vraie petite régie publicitaire qui tourne toute seule.

## Pourquoi c'est central

Aujourd'hui sur la page Facebook, si un commerçant veut apparaître, il faut :
- L'écouter
- Bricoler un post
- Gérer manuellement

→ Ne scale pas. À 50 commerçants, c'est l'enfer.

**L'espace annonceur self-service automatise tout ça.** Le commerçant gère lui-même sa présence, paye en ligne, vous n'intervenez qu'en validation/modération.

Modèle équivalent : Pages Jaunes en ligne, TripAdvisor côté restaurant, espace pro Doctolib, petitscommerces.fr.

## Parcours commerçant type

### Inscription (5 minutes)

Madame Dupont, poissonnerie du port au Grau-du-Roi, va sur `lecamarguais.fr/pro` ou `/annonceurs`.

Elle voit :
- "35 000 lecteurs locaux et touristes par mois" (chiffres réels)
- Tableau comparatif des 3 formules
- Témoignages de commerçants pilotes
- Bouton "Créer mon compte"

Elle clique → email + mot de passe → validation email → tableau de bord vide → "Bienvenue ! Commencez par créer votre fiche".

### Création de fiche (15 minutes)

Wizard en plusieurs étapes :

**Étape 1 — Identité**
- Nom du commerce
- Catégorie (poissonnerie)
- Description courte (160 car.)
- Description longue
- SIRET (optionnel mais valorise)

**Étape 2 — Localisation**
- Adresse → géocodage auto → carte avec point ajustable
- Coordonnées GPS

**Étape 3 — Contact**
- Téléphone, mobile, email, site web
- Facebook, Instagram, TikTok

**Étape 4 — Horaires**
- Tableau jour par jour
- Gestion fermetures saisonnières

**Étape 5 — Photos**
- Logo
- Photo de couverture
- Galerie (5 ou 15 selon formule)

**Étape 6 — Choix formule**
- Gratuit / Basic / Premium
- Paiement Stripe si payant

→ Soumission → Statut "En attente de modération"
→ Vous recevez notif → Validation 30 sec → Fiche publique

### Quotidien — Tableau de bord

La commerçante se reconnecte de temps en temps et voit :

- **Stats** : vues fiche/semaine, clics phone/site/itinéraire
- **Sa fiche** : modification à tout moment
- **Encarts pub actifs** : si elle en a acheté
- **Factures** téléchargeables PDF
- **Abonnement** : date fin, renouvellement, changement formule
- **Promotions** : si module "bons plans" actif (2 promos/mois)

### Achats additionnels

À côté de l'abonnement de base :

- **Encart pub page d'accueil** — 49 €/mois
- **Mise en avant catégorie** — 29 €/2 semaines
- **Article sponsorisé** — 149 € (devis pour formats étendus)
- **Pack saison estivale** tout-en-un — 199 €

Clic → paiement Stripe → actif immédiatement.

## Côté admin (vous)

Dashboard "Régie pub" dans Django admin :

- **Vue commerciale** : nb annonceurs actifs, MRR, taux renouvellement, formules les plus vendues
- **Modération** : nouvelles fiches en attente, signalements
- **Gestion** : créer fiche manuellement (utile pour démarchage face-à-face), offrir formule gratuite à un partenaire
- **Facturation** : export comptable, suivi impayés
- **Campagnes** : "commerce du mois", mises en avant gratuites

## Pourquoi y penser dès le sprint 1

**1. Modèle de données initial doit anticiper**

Quand on crée le modèle `Business` au sprint 1 :
- Champ `owner` (FK User) — vide au début, rempli à la revendication
- Champ `is_published` (admin valide) ET `is_claimed` (commerçant a revendiqué)
- Champ `plan` même si non facturé avant sprint 4
- Champs Stripe (`stripe_customer_id`, `stripe_subscription_id`)

Sinon migrations pénibles plus tard.

**2. Stratégie commerciale en dépend**

Pendant sprints 1-3, démarchage commerçants pilotes en face-à-face. Promesse :
> "Donnez-moi votre logo, je crée votre fiche manuellement, c'est gratuit cette saison contre votre témoignage. À la rentrée, vous pourrez prendre la main vous-même via un espace en ligne et passer en formule payante."

→ Promesse à honorer, donc anticiper l'UX général.

**3. C'est ce qui rend le projet rentable**

50 fiches en gestion manuelle = mi-temps minimum.
50 fiches self-service = 2h/semaine de modération max.

Même réflexe que GéoClic Suite : pas de SAV permanent, autonomie clients.

## Architecture technique sprint 4

### Authentification séparée

L'espace annonceur n'utilise PAS l'admin Django.

- Routes Next.js sous `(advertiser)` (groupe de routes)
- API Django `/api/advertiser/...` avec auth JWT ou session
- Login/registration avec validation email
- Récupération mot de passe
- 2FA optionnel

### Composants principaux

```
app/(advertiser)/
├── inscription/page.tsx
├── login/page.tsx
├── mot-de-passe-oublie/page.tsx
├── dashboard/
│   ├── page.tsx                # vue d'ensemble + KPIs
│   ├── ma-fiche/
│   │   ├── page.tsx            # affichage + édition
│   │   └── edition/page.tsx    # wizard d'édition
│   ├── statistiques/page.tsx   # stats détaillées
│   ├── pub/
│   │   ├── page.tsx            # campagnes actives + boutique
│   │   └── nouvelle/page.tsx   # création campagne
│   ├── facturation/
│   │   ├── page.tsx            # liste factures
│   │   └── abonnement/page.tsx # gestion abo
│   └── parametres/page.tsx     # email, mdp, prefs
```

### Workflow de modération

1. Commerçant soumet fiche
2. Statut `is_published=False`, `is_claimed=True`
3. Notification admin (email + dashboard)
4. Admin valide : 30 sec (vérifier que c'est bien un vrai commerce)
5. `is_published=True`
6. Notification commerçant : "Votre fiche est en ligne"

### Intégration Stripe

Choix : utiliser **dj-stripe** (lib Django Stripe mature).

**Workflow abonnement** :
1. Commerçant choisit formule
2. Création Stripe Customer + Subscription
3. Paiement Stripe Checkout (page hébergée Stripe, simple et conforme)
4. Webhook Stripe → `subscription.created`
5. `Business.plan = 'basic'/'premium'`, `plan_starts_at`, `plan_ends_at`
6. Renouvellement annuel auto par Stripe
7. Webhook `invoice.payment_failed` → email annonceur + retry
8. Webhook `subscription.deleted` → downgrade vers `free`

**Workflow add-on (one-shot)** :
1. Commerçant choisit add-on (encart, mise en avant)
2. Paiement Stripe Checkout
3. Webhook → création `AdCampaign` active
4. Programme la fin selon durée achetée

### Génération factures

À chaque paiement réussi :
1. Récupérer infos via webhook Stripe
2. Générer PDF avec ReportLab (vous maîtrisez)
3. Stocker en `media/invoices/`
4. Envoyer par email + dispo dans dashboard
5. Métadonnées RGPD (conservation 10 ans pour la compta)

### Stats annonceur

Données affichées :
- Vues de fiche (par jour, semaine, mois)
- Clics phone, email, site, itinéraire
- Provenance : direct, recherche, depuis annuaire, depuis article
- Comparaison avec moyenne de la catégorie
- Pic horaire (utile pour ajuster horaires d'ouverture)

Sources :
- Plausible Analytics (events custom)
- Compteurs Django incrémentés (cf. sprint 2)

### Notifications

- Inscription validée
- Fiche en attente de modération
- Fiche publiée
- Facture émise
- Paiement réussi
- Paiement échoué (relance)
- Abonnement à renouveler dans 30 jours
- Abonnement renouvelé
- Encart pub bientôt fini (proposer renouvellement)
- Stat hebdomadaire (digest email)

## UX clés

### Onboarding rapide

- Inscription en 3 champs minimum
- Wizard de fiche en 6 étapes claires
- Possibilité de sauvegarder en brouillon
- Aide contextuelle à chaque étape
- "Voir un exemple" pour chaque champ

### Mobile-first

Les commerçants éditeront probablement souvent depuis mobile.
- Wizard adapté petit écran
- Upload photo direct depuis caméra
- Géocodage adresse fluide

### Aide à la rédaction (formule Premium)

Pour Premium, possibilité de cocher "Je veux que votre équipe rédige ma fiche" → ticket interne → la rédactrice prend contact.

### Communication transparente

- Statut fiche toujours visible (Brouillon / En modération / Publiée)
- Délai de modération annoncé (24-48h)
- Politique de modération claire
- CGV claires et accessibles

## Risques et points d'attention

### RGPD

- Consentement explicite à la création de compte
- Politique de conservation des données
- Droit d'accès, modification, suppression
- DPO ou responsable de traitement identifié
- Registre des traitements

### Sécurité paiement

- Pas de stockage de cartes : tout via Stripe
- HTTPS obligatoire
- Validation côté serveur (jamais faire confiance au client)
- Logs de toutes les transactions
- Webhooks signés et vérifiés

### Modération

- Charte de qualité écrite
- Refus motivé d'une fiche (mauvaise qualité, contenu inapproprié)
- Pouvoir bloquer un compte
- Process d'appel pour un refus

### Fiscalité

- Facturation TTC pour B2C, HT/TTC selon profil
- TVA à 20% (sauf statut presse en ligne où 2.1% sur certaines recettes)
- Mentions obligatoires sur factures (numéro SIRET, TVA intracom, etc.)
- Numérotation continue des factures
- Conservation 10 ans

### Support client

- FAQ riche sur l'espace annonceur
- Email support `support@lecamarguais.fr`
- Délai de réponse < 24h en semaine
- Pour Premium : support prioritaire

## Métriques à suivre

- **Taux de conversion** : visiteurs page formules → inscriptions
- **Taux d'activation** : inscrits → fiche publiée
- **Taux de paiement** : fiches publiées → upgrade payant
- **Taux de churn** annuel : non-renouvellements
- **NPS** des annonceurs
- **Délai moyen de modération**
- **Taux d'utilisation des add-ons**

# 12 — Checklist de démarrage

TODO concret pour passer de la réflexion à l'action. À cocher au fur et à mesure.

## Avant tout — Décisions stratégiques

### Décisions juridiques et humaines
- [ ] Discussion équipe : alignement vision, calendrier, charge de travail
- [ ] Statut de la partenaire (associée, salariée, freelance, intéressée)
- [ ] Répartition des parts si SAS
- [ ] Pacte d'associés rédigé ou prévu
- [ ] Choix structure : SAS unipersonnelle ou pluripersonnelle

### Décisions identitaires
- [ ] Nom du projet définitif (vérifier dispo INPI + nom de domaine)
- [ ] Nom de domaine acheté (`.fr` priorité, `.media` ou `.com` aussi)
- [ ] Charte graphique de base : logo simple + 2 couleurs primaires
- [ ] Tagline éditoriale ("Le média du littoral camarguais", etc.)

### Décisions éditoriales
- [ ] Charte éditoriale rédigée (ton, rythme, rubriques)
- [ ] Calendrier éditorial mois par mois pour les 6 premiers mois
- [ ] Règles de modération définies (commentaires, contributions)
- [ ] Politique des contenus sponsorisés (mention "Partenaire" obligatoire)

## Setup juridique et administratif

- [ ] Création SAS (dossier formaliste : annonce légale, statuts, dépôt greffe)
- [ ] Compte bancaire pro
- [ ] Numéro SIRET et SIREN
- [ ] Numéro TVA intracom
- [ ] Souscription assurance RC pro (obligatoire pour service de presse en ligne)
- [ ] Relation comptable établie (50-80 €/mois)
- [ ] Règlement intérieur si salariés à venir

## Setup infrastructure technique

### VPS et domaines
- [ ] Vérification capacité VPS OVH actuel (RAM, CPU, stockage)
- [ ] Domaines achetés et DNS configurés (A record, CNAME www)
- [ ] Email pro configuré (`contact@`, `support@`, `redaction@`)
- [ ] Certificat SSL Let's Encrypt déployé

### Bases techniques
- [ ] Repos Git créés (back + front)
- [ ] PostgreSQL + PostGIS installé sur VPS
- [ ] Redis installé pour cache + Celery
- [ ] Compte GitHub Pro ou GitLab pour les repos privés
- [ ] Backups automatisés base + médias configurés et testés
- [ ] Monitoring uptime (UptimeRobot ou Better Stack)

## Setup services tiers

### Meta / Facebook
- [ ] Business Manager créé/rattaché à la page actuelle
- [ ] Vérification entreprise lancée
- [ ] Meta App créée
- [ ] Compte de test Meta préparé
- [ ] Vidéo de démo App Review tournée
- [ ] Politique de confidentialité publiée et conforme
- [ ] Page suppression-données publiée

### Stripe
- [ ] Compte Stripe créé
- [ ] Vérification d'identité business validée
- [ ] Webhooks configurés vers `/api/stripe/webhook/`
- [ ] Produits + tarifs créés (Basic, Premium, add-ons)
- [ ] Mode test pour le développement
- [ ] Mode live pour la mise en prod

### Brevo (newsletter)
- [ ] Compte Brevo créé
- [ ] Domaine vérifié (DKIM, SPF, DMARC)
- [ ] Liste principale créée
- [ ] Templates emails de base (bienvenue, transactionnel, newsletter)
- [ ] API key stockée dans variables d'env

### Google
- [ ] Google Search Console : propriété ajoutée et vérifiée
- [ ] Google Business Profile : profil média créé
- [ ] Google Publisher Center : à candidater quand 50+ articles

### MapTiler
- [ ] Compte MapTiler créé
- [ ] Style de carte personnalisé créé (couleurs camarguaises)
- [ ] API key stockée dans variables d'env
- [ ] Quota free tier surveillé (100k req/mois)

### Plausible
- [ ] Auto-hébergement Docker sur VPS (gratuit) OU
- [ ] Compte Plausible Cloud (~9 €/mois)
- [ ] Tracking script intégré dans Next.js
- [ ] Custom events configurés

## Setup éditorial

### Avant le sprint 1
- [ ] Export complet de l'archive Facebook
- [ ] Sélection 50-100 posts les plus engageants à recycler
- [ ] Banque de photos haute définition organisée (Drive/Nextcloud)
- [ ] Liste des 8-10 communes prioritaires avec contacts mairie
- [ ] Premier brouillon des pages communes
- [ ] Charte d'écriture (ton, longueur, structure)

### Pendant le sprint 1-2
- [ ] 10-15 articles seed prêts à publier
- [ ] 5 pages communes principales rédigées
- [ ] 50 événements à venir documentés et prêts
- [ ] 30-50 commerçants identifiés pour le démarchage pilote

## Setup commercial

### Outils
- [ ] CRM léger (Notion ou Trello)
- [ ] Pipeline prospects (statut, dates, suivi)
- [ ] Liste de 100 commerçants prioritaires (avec coordonnées)
- [ ] Templates emails de prospection
- [ ] Carte de visite / signature email pro

### Supports commerciaux
- [ ] Plaquette PDF de présentation (avec chiffres audience)
- [ ] Vidéo démo (60 sec) de l'app et expérience annonceur
- [ ] Page "Pourquoi nous" sur le site
- [ ] CGV pour les annonceurs (faire relire par avocat ou Legalstart)
- [ ] CGU pour les utilisateurs lecteurs

### Étape pilote (été 2026)
- [ ] Liste 10-15 commerçants pilotes prioritaires
- [ ] Pitch de démarchage face-à-face préparé et répété
- [ ] Formulaire de témoignage à recueillir
- [ ] Engagement explicite : "saison gratuite contre témoignage"
- [ ] Démarrage prospection mi-juin pour saison de juillet-août

## Conformité légale

- [ ] Mentions légales rédigées
- [ ] Politique de confidentialité conforme RGPD
- [ ] CGU pour les utilisateurs
- [ ] CGV pour les annonceurs
- [ ] Bandeau cookies (ou pas si Plausible RGPD-friendly)
- [ ] Registre des traitements RGPD (modèle CNIL)
- [ ] Désignation responsable de traitement (toi ou la SAS)
- [ ] Procédure de droit d'accès / suppression / modification
- [ ] Contrats type avec annonceurs (CGV claires)
- [ ] Mentions obligatoires sur factures (SIRET, TVA, etc.)

## Première mise en ligne

### Critères pour pouvoir lancer
- [ ] Site live, accessible HTTPS
- [ ] PWA installable Android et iOS
- [ ] 15+ articles publiés
- [ ] 5 pages communes rédigées
- [ ] Mentions légales et PP en ligne
- [ ] Sitemap soumis Google Search Console
- [ ] Monitoring uptime actif
- [ ] Backups testés
- [ ] Diffusion Facebook fonctionnelle (review approuvée)
- [ ] Page Facebook actuelle annonce le nouveau site (post épinglé)

### Annonce du lancement
- [ ] Communiqué de presse aux médias locaux
- [ ] Annonce sur la page Facebook actuelle
- [ ] Email aux contacts pro
- [ ] Affichage en bord de quai pendant 1 semaine (papier ou QR code)
- [ ] Post LinkedIn perso
- [ ] Inscriptions newsletter actives

## Routine post-lancement

### Quotidien
- [ ] Publication article (si pertinent)
- [ ] Modération commentaires/contributions
- [ ] Réponse messages annonceurs

### Hebdomadaire
- [ ] Réunion équipe (lundi 45 min)
- [ ] Newsletter envoyée (vendredi)
- [ ] Vérification métriques Search Console
- [ ] Revue audience Plausible

### Mensuel
- [ ] Bilan financier (CA, MRR, dépenses)
- [ ] Revue roadmap
- [ ] Reporting annonceurs (stats de leur fiche envoyées par email)
- [ ] Backup test (restaurer un backup pour vérifier)

### Trimestriel
- [ ] Bilan complet
- [ ] Ajustements stratégiques
- [ ] Réunion clientèle annonceurs (si pertinent)

## Risques à surveiller en continu

- **Token Facebook expiré** → alerte automatique + procédure refresh
- **VPS plein** → monitoring espace disque
- **Performance dégradée** → Lighthouse mensuel
- **SEO en chute** → Search Console hebdomadaire
- **Annonceurs insatisfaits** → NPS trimestriel
- **Surcharge équipe** → revue hebdo charge réelle
- **Concurrence émergente** → veille mensuelle

## Premiers indicateurs de succès

À 3 mois post-lancement :
- 30+ articles publiés
- 5 000+ sessions/mois
- 10+ commerçants pilotes engagés
- 200+ inscrits newsletter
- 0 incident sécurité majeur

À 6 mois post-lancement :
- 80+ articles
- 10 000-20 000 sessions/mois
- 5+ premiers paiements de commerçants (rentabilité démarrée)
- 500+ inscrits newsletter
- Top 10 sur 15+ requêtes locales

À 12 mois (Pâques 2027) :
- 200+ articles
- 25 000+ sessions/mois
- 30+ annonceurs payants actifs
- 1 500+ inscrits newsletter
- Top 3 sur 20+ requêtes territoriales
- MRR ~600-900 €
- Projet rentable opérationnellement

## Quand utiliser cette checklist

- **Avant de commencer Claude Code** : lire toute la doc + cocher les décisions
- **Au démarrage de chaque sprint** : revérifier les pré-requis
- **À chaque milestone** : valider les critères de succès
- **En cas de blocage** : retrouver le contexte rapidement

> **Mise à jour du 28 juillet 2026** : cette checklist est historique. Une case
> ne remplace pas une vérification du code ou de la production. Utiliser
> [`24-continuite-projet.md`](./24-continuite-projet.md) pour la reprise.

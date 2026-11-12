# Récupération des accès — 12 novembre 2026

## CURRENT CODE STATE

Lot basé sur GitHub main `84e979f`, branche `codex/recuperation-acces`.
Objectif autorisé par Fred : intégrer le correctif mots de passe à GitHub et
repartir du dépôt canonique. Aucun travail sur les extractions IA dans ce lot.

- `/api/auth/recovery/` : formulaire HTML CSRF ; adresse connue ou inconnue,
  même réponse ; file Celery sans recherche utilisateur dans la requête HTTP.
- Mail : identifiant réel et lien sur l'origine fixe `https://media.geoclic.fr`.
  Aucun mot de passe communiqué par email. Tous les comptes actifs de cette
  adresse ayant un mot de passe utilisable sont traités.
- Jeton Django valable une heure, invalidé par le changement de mot de passe.
  POST avec CSRF, validation et revérification du jeton sous verrou PostgreSQL.
- Minimum explicite : 8 caractères et un caractère Unicode de ponctuation ou
  symbole (`!`, `@`, `#`, etc.). Un espace ne suffit pas. Autres validateurs
  Django conservés ; pas de changement forcé des mots de passe existants.
- Cache Redis : quotas atomiques IP/adresse, clés HMAC ; indisponibilité cache,
  broker ou SMTP non configuré => message d'indisponibilité sans révéler de compte.
- `X-Real-IP` accepté depuis le proxy loopback uniquement. Nginx doit écraser cet
  en-tête et Gunicorn rester lié à `127.0.0.1:8002` (configuration existante).
- Méta referrer `same-origin`, pas de ressources tierces. `no-referrer` avait
  produit Origin:null dans Chrome et un 403 CSRF ; cette erreur est corrigée.
- Anciennes pages annonceur redirigées, anciens liens uid/token conservés via
  redirection vers le formulaire Django. Anciens POST JSON répondent 410 avec
  l'adresse du formulaire canonique et ne modifient plus de compte.

## CURRENT CANONICAL DEPLOYED STATE

LAST VERIFIED AT : 12 novembre 2026, avant intégration GitHub.
Serveur : `camping-vps`, dépôt `/var/www/geoclicmedia`, domaine media.geoclic.fr.
Base Git observée : `84e979f` + correctif mots de passe hors Git, à réconcilier
avec le présent lot après intégration. Ne pas présenter ce patch comme déjà
inclus dans main. Fichiers modifiés observés : core/urls, settings/base,
config/urls, formulaire login ; modules recovery/tasks/validator et templates
non suivis. Le `.env` reste privé et n'est jamais committé.

Services : `geoclicmedia-django`, `geoclicmedia-celery-worker`,
`geoclicmedia-next`. Aucun changement de schéma de base.
Envoi OVH SMTP ssl0.ovh.net:587 STARTTLS, configuration privée réutilisée depuis
le service contact de geoclic.fr. ACCOUNT_RECOVERY_ENABLED=True observé dans le
lot précédent ; authentification SMTP et acceptation d'un email confirmées.
Réception en boîte non confirmée par le test SMTP seul.
Sauvegarde privée précédente : `/var/backups/geoclicmedia-recovery-20261112`.

## Validation

26 tests de récupération SQLite/auth Django réussis, dont CSRF, jetons expirés
et réutilisés, session invalidée, quotas, échecs SMTP/broker et règle symbole.
Les settings isolés ne lisent pas `.env` ni la base de production. La même suite
est aussi découverte par pytest avec le User réel/PostGIS dans la CI complète.
Test navigateur Chrome public du lot précédent sur compte temporaire supprimé :
mot de passe court refusé, 8 caractères + symbole accepté, Origin correct,
jeton réutilisé refusé. Nouveau smoke à effectuer après alignement final.

## Déploiement / rollback

1. Sauvegarder et vérifier par SHA256 les fichiers du patch serveur hors Git ;
   préserver `.env`, `.claude/` et les scripts utilisateur non suivis.
2. Mettre de côté uniquement les fichiers de ce lot, restaurer uniquement ses
   changements suivis, puis avancer main en fast-forward au SHA GitHub validé.
3. `manage.py check`, `migrate --check`, reconstruire Next ; redémarrer Django,
   worker et Next. Ne modifier ni Nginx ni les certificats ni la base métier.
4. Vérifier healthcheck, pages publiques, redirections, tâche Celery enregistrée
   et changement de mot de passe sur compte temporaire.
5. Rollback : restaurer le code/build sauvegardé et redémarrer ces services ;
   ne pas restaurer la base pour annuler ce correctif.

Aucun secret, mot de passe ou lien personnel n'est conservé dans ce document.

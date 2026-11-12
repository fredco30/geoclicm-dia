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

LAST VERIFIED AT : 12 novembre 2026, après remplacement du patch hors Git.
Serveur : `camping-vps`, dépôt `/var/www/geoclicmedia`, domaine media.geoclic.fr.
RELEASE CODE SHA : `3f733c304cffd231d9f2f8233b7a7c483dc30238` (code testé de
la [PR #101](https://github.com/fredco30/geoclicm-dia/pull/101)). Les commits de
documentation/fusion suivants ne modifient pas le code de cette release.
Le checkout est réaligné sur main GitHub après fusion de cette PR ; pour connaître
son SHA Git exact, lire `git -C /var/www/geoclicmedia rev-parse HEAD` et comparer
avec origin/main. Ne pas utiliser une ancienne sauvegarde comme source de code.

Le patch serveur hors Git a été sauvegardé, vérifié par SHA256 et mis de côté
avant installation de la release GitHub. Le `.env` reste privé et inchangé.
Services : `geoclicmedia-django`, `geoclicmedia-celery-worker`,
`geoclicmedia-next`. Aucune migration de base nouvelle.
Configuration : `ACCOUNT_RECOVERY_ENABLED=True`, OVH SMTP ssl0.ovh.net:587
STARTTLS. Les secrets viennent du service contact de geoclic.fr, hors dépôt.
La disponibilité SMTP et l'enregistrement de la tâche Celery ont été revérifiés.
Authentification SMTP et acceptation d'un email confirmées dans le lot précédent ;
réception en boîte non confirmée par le test SMTP seul. Aucun nouvel email envoyé
pour la validation de l'intégration GitHub.

BACKUP / ROLLBACK : `/var/backups/geoclicmedia-github-20261112` (privé),
manifest SHA256, fichiers du patch et build Next précédent. Le backup initial
`/var/backups/geoclicmedia-recovery-20261112` est HISTORICAL / ROLLBACK ONLY.

## Validation

26 tests de récupération SQLite/auth Django réussis, dont CSRF, jetons expirés
et réutilisés, session invalidée, quotas, échecs SMTP/broker et règle symbole.
Les settings isolés ne lisent pas `.env` ni la base de production. La même suite
a réussi avec le User réel/PostGIS dans la CI complète : 179 tests Django réussis.
Types, lint et build Next réussis dans la même CI (run 43247958757).
Test navigateur Chrome public répété sur cette release, compte temporaire supprimé :
mot de passe court refusé, 8 caractères + symbole accepté, Origin correct,
jeton réutilisé refusé. Anciens POST JSON vérifiés HTTP 410, healthcheck HTTP 200.
`manage.py check` et `migrate --check` réussis ; tâche Celery enregistrée.
La CI du commit final doit rester verte avant fusion de la PR.

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

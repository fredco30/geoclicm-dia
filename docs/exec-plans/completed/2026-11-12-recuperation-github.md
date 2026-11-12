# Intégration récupération des accès

Objectif : intégrer le correctif production dans GitHub main et réaligner le local/serveur.
Autorisation : Fred demande explicitement intégration GitHub puis reprise propre.
RISK LEVEL : HIGH — récupération d’accès et changement de mot de passe public.
REVIEW DEPTH : diff complet auth, tests réels CSRF/jetons, CI, smoke navigateur.

Base : GitHub main 84e979f ; correctif prod initial hors Git, sauvegarde privée disponible.
Périmètre : récupération identifiant/email, mot de passe >=8 caractères + symbole,
jeton 1h/usage unique, quotas Redis, Celery SMTP, correctif referrer same-origin.
Compatibilité : anciennes pages redirigées ; anciens POST JSON renvoient 410 + route canonique.
Secrets et fichiers utilisateur préexistants exclus des commits.

- [x] Base GitHub synchronisée ; sauvegarde des changements locaux vérifiée.
- [x] Réintégration sur branche codex/recuperation-acces.
- [x] Validation locale (26 tests) et CI complète (179 tests + build Next).
- [x] PR #101 publiée ; fusion et fast-forward final suivis par cette PR.
- [x] Patch hors Git remplacé par release 3f733c3, smoke Chrome/CSRF/règle 8+symbole/jeton unique réussi.

La clôture Git du lot est la fusion de #101 puis le fast-forward des main local/VPS.
Le statut de fusion vérifiable est porté par GitHub ; aucun correctif IA inclus.

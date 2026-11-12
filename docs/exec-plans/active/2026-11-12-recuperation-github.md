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
- [ ] Validation locale et CI.
- [ ] PR et intégration main.
- [ ] Alignement production et état déployé vérifié.

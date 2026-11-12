# Qualité des extractions IA — 12 novembre 2026

Objectif : prévenir les doublons et la publication des offres/événements expirés,
sans supprimer de candidat ni publier automatiquement. Base GitHub main 9d34b84.
RISK LEVEL : HIGH — décisions de publication, concurrence et requalification des données.
REVIEW DEPTH : tests dates/preuves, dédup sans faux rapprochement, PostgreSQL
concurrent, API d'approbation, dry-run sur production avant tout reclassement.

Constats audit : Beach Coffee Club 3757/4202 même empreinte ; annonce Papy/Mamy
candidat 2 fin de contrat 7 juillet 2022 dans preuve mais expiry vide ; ancien
recensement candidat 1 expiry 2022 ; 376 candidats Agenda incomplets dont toutes
les occurrences enregistrées sont terminées. Ces relevés datent de l'audit.

- [x] Main local/GitHub synchronisés ; fichiers utilisateur non suivis préservés.
- [x] Service commun de décision + verrou de concurrence à l'approbation/extraction.
- [x] Validité prouvée / expirée / à confirmer ; preuve et historique conservés.
- [x] UI d'historique/décision et confirmation explicite des offres incertaines.
- [x] Commande dry-run par défaut et tâche régulière sans publication/suppression.
- [x] Tests, CI, PR et bilan chiffré avant reclassement de l'existant.

Hors périmètre : fusion floue automatique, réécriture des fiches publiées,
modification de l'index assistant, nouvelle extraction IA facturée et recrawl.

87 tests ciblés PG réussis, types/lint/migrations vérifiés. Dry-run READ ONLY :
30 lieux, 5 commerces, 18 événements en doublon ; 377 événements et 2 annonces
expirés ; 3 annonces à confirmer. 2666 snapshots privés. CI complète à lancer.


Livraison : release GitHub 3091f67 de PR #102 installée après CI verte (205 tests).
Migration, build, reclassement 435 transitions puis idempotence vérifiés. Smoke
Chrome des écrans de validation réussi ; tâche horaire active. Sauvegardes privées
et état réellement déployé détaillés dans docs/28-qualite-extractions.md.
La clôture Git est portée par la fusion de #102 et les fast-forward main local/VPS.

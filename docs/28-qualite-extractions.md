# Qualité des candidats IA — 12 novembre 2026

## CURRENT CODE STATE

Base GitHub main `9d34b84`, branche `codex/qualite-extractions`.
Objectif : doublons certains écartés de la validation, contenus périmés bloqués,
incertitude temporelle explicite. Aucun candidat supprimé et aucune publication
automatique. Les fiches déjà importées et les décisions de rejet sont préservées.

## Décisions communes à tous les imports

Le service `apps/discovery/review.py` intervient après extraction, avant chaque
approbation individuelle/groupée, et lors du contrôle horaire. Verrou consultatif
PostgreSQL par module, pris avant toute écriture d'import ; même ordre pour
extraction/approbation afin d'éviter les interblocages. Le second validateur
relit le candidat après le verrou : une double approbation ne crée pas deux fiches.
Les écritures manuelles contournant ces services ne sont pas couvertes.

Même nom normalisé + même commune, puis contrôle des adresses et des sources.
Une adresse contradictoire empêche la déduplication automatique. Sans commune
résolue, il faut la même page. Les lieux/commerces sont aussi comparés au catalogue
existant (nom + adresse ou URL officielle). Un candidat de référence est choisi
par priorité : déjà importé, structure complète, puis identifiant croissant.
Chaque URL source reste dans son candidat ; le doublon pointe vers le candidat
ou la fiche de référence dans raw_payload.review. Les rapprochements non établis
sont affichés comme tels, sans fusion automatique.

Agenda : comparaison du type, du lieu et de l'ensemble exact des occurrences,
pas seulement de la première date. Deux éditions ou deux séries différentes ne
sont pas fusionnées. Sans dates, la même page et les mêmes preuves sont requises.
La preuve temporelle des événements reste celle des occurrences enregistrées :
ce contrôle ne constitue pas une nouvelle vérification distante de chaque date IA.

La déduplication en mémoire ne jette plus les sources distinctes sur la seule
empreinte nom/localité : le service décide du statut en base et conserve les preuves.

## Validité

- Agenda : toutes les occurrences enregistrées terminées => expired. Série mixte :
  conserve les occurrences futures lors de l'import. Une occurrence sans fin valide
  empêche de déclarer la série entièrement expirée ; publication refusée si dates
  incohérentes ou absentes. Réévaluation au moment exact de l'approbation.
- Annonces : date limite ou fin de contrat/mission dans un extrait **vérifié**.
  Dates françaises avec année et ISO explicites ; aucune année inventée. « Avant le »
  exclut la date limite ; « jusqu'au » conserve cette journée (Europe/Paris).
  Une date publiée/modifiée et une expires_at IA sans preuve ne suffisent pas.
- Si absence d'échéance démontrée : needs_review, jamais expiration sur le seul âge.
  Le seuil de 90 jours ajoute un avertissement, pas une preuve de péremption.
- Un membre de l'équipe peut déclarer avoir revérifié la source : confirmation
  nominative pour 30 jours, approbation distincte toujours obligatoire. Une période
  explicitement expirée ne peut pas être réouverte par cette confirmation.
- Une annonce approuvée reçoit la fin prouvée ou la fin de la confirmation de 30 jours.
  Le filtre public existant masque les annonces après cette échéance.
- Prompt multi-v5-validity : demander les extraits des échéances/périodes même passées.
  Ce lot ne déclenche ni recrawl ni nouvelle extraction IA.

## Historique et exploitation

Les statuts/raisons, preuves et identifiants de référence sont conservés dans
raw_payload.review, avec historique des transitions et confirmation humaine.
last_seen_at reste une observation de la source : le contrôle de qualité ne le modifie pas.
Les lectures API n'écrivent pas en base ; leur évaluation temporelle est recalculée.
Onglets Doublons/Expirés/Actualité à confirmer ; l'approbation en masse conserve à
l'écran les candidats non publiés (réponse imported_ids), y compris les refus serveur.

`python manage.py review_import_candidates` est **en lecture seule par défaut**,
transaction PostgreSQL READ ONLY. `--report chemin.json` exporte les propositions
et les snapshots originaux des candidats non traités, en permissions 0600.
`--apply --report nouveau-chemin.json` exige une sauvegarde avant de recontrôler
et appliquer. Ne jamais écraser un rapport existant ; ne pas committer ces exports.

La tâche Celery `core.review_import_candidates` est planifiée toutes les heures
via CELERY_BEAT_SCHEDULE ; elle ne publie ni ne supprime de contenu. Migration
listings.0005 : ajout des choix expired / needs_review, aucun effacement de données.

## Validation et bilan préalable

87 tests ciblés PostgreSQL réussis : homonymes, sources distinctes, séries différentes,
approbation simultanée, blocage des dates passées, confirmation humaine, idempotence.
11 tests de validité purs également exécutés localement. TypeScript et ESLint ciblés
réussis. `makemigrations --check --dry-run` : aucune migration manquante.
La première suite complète isolée a rencontré trois erreurs de permissions du
répertoire média de test ; après correction de ce répertoire, les trois tests
ont réussi. La CI complète doit être verte avant livraison.

Dry-run réel READ ONLY le 12 novembre 2026 à 16:16 UTC, snapshot 2666 candidats
non importés/non rejetés :

| Proposition | Nombre |
|---|---:|
| Découvrir → doublon certain | 30 |
| Commerçants → doublon certain | 5 |
| Agenda → doublon certain | 18 |
| Agenda → expiré selon occurrences enregistrées | 377 |
| Annonces → expirée sur preuve | 2 |
| Annonces → actualité à confirmer | 3 |

Exemples : Beach Coffee Club 4202 → doublon de 3757 ; annonces 1 (recensement,
candidature avant le 15 novembre 2022) et 2 (Papy/Mamy, contrat terminé le
7 juillet 2022) → expirées. Les variantes moins sûres ne sont pas comptées comme
doublons certains. Rapport privé sur VPS : `/tmp/geoclic-quality-dryrun-final-20261112.json`.

## CURRENT CANONICAL DEPLOYED STATE

État avant livraison : main `9d34b84` sur camping-vps, `/var/www/geoclicmedia`.
Ce lot est implémenté/testé dans une copie isolée `/tmp/geoclic-quality-tests-20261112`.
Aucun reclassement appliqué à la base métier à ce stade ; aucun nouveau code livré
aux services applicatifs. Lire la fin de ce document pour les validations ultérieures.

Déploiement prévu : sauvegarde du code/build et des statuts+payloads ; fast-forward
au SHA GitHub validé, migration listings.0005, build Next, redémarrage Django/worker/beat/Next.
Comparer un nouveau dry-run au bilan, puis appliquer avec un rapport privé distinct.
Vérifier les compteurs, l'idempotence et l'interface authentifiée sans publier.
Rollback code/build : version précédente sauvegardée et redémarrage. Désactiver la
tâche PeriodicTask core.review_import_candidates si retour à l'ancienne version.
Rollback du reclassement : restauration ciblée des statuts/raw_payload depuis le
snapshot après vérification de l'absence de modifications humaines ultérieures ;
ne pas restaurer la base métier complète ni supprimer des candidats.

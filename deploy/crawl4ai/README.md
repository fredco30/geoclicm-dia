# Crawl4AI pour GeoClic Media

Service Chromium isolé pour rendre les sources Agenda en JavaScript.

## Sécurité et ressources

- image épinglée sur `unclecode/crawl4ai:0.8.5` ;
- API exposée uniquement sur `127.0.0.1:11235` ;
- token obligatoire, partagé avec le backend via `back/.env` ;
- hooks Crawl4AI désactivés ;
- limite mémoire de 1,5 Gio, 1 CPU et 256 processus ;
- aucun secret versionné.

## Variables backend

Dans `back/.env` :

```dotenv
CRAWL4AI_URL=http://127.0.0.1:11235
CRAWL4AI_TOKEN=<secret aléatoire long>
```

## Démarrage

Depuis `/var/www/geoclicmedia/deploy/crawl4ai` :

```bash
sudo docker compose --env-file ../../back/.env pull
sudo docker compose --env-file ../../back/.env up -d
```

Redémarrer ensuite Django et les workers Celery afin de recharger les variables.

## Vérification

```bash
sudo docker compose --env-file ../../back/.env ps
curl -fsS http://127.0.0.1:11235/health
```

Le test fonctionnel doit appeler `POST /crawl` avec le bearer token sans jamais
l'afficher dans les journaux.

## Arrêt et retour au crawler standard

Supprimer ou vider `CRAWL4AI_URL` dans `back/.env`, redémarrer Django et Celery,
puis arrêter le conteneur :

```bash
sudo docker compose --env-file ../../back/.env down
```

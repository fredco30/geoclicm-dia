# Crawl4AI pour GeoClic Media

Service Chromium isolé pour rendre les sources Agenda en JavaScript.

## Sécurité et ressources

- image épinglée sur `unclecode/crawl4ai:0.8.5` ;
- API exposée uniquement sur `127.0.0.1:11235` ;
- authentification JWT activée avec un token d’émission et un secret de signature distincts ;
- configuration sensible montée en lecture seule depuis `/var/lib/geoclicmedia-crawl4ai/config.yml` ;
- hooks Crawl4AI désactivés ;
- limite mémoire de 1,5 Gio, 1 CPU et 256 processus ;
- aucun secret versionné.

## Variables backend

Dans `back/.env` :

```dotenv
CRAWL4AI_URL=http://127.0.0.1:11235
CRAWL4AI_TOKEN=<secret aléatoire long pour POST /token>
CRAWL4AI_JWT_SECRET=<secret aléatoire distinct pour signer les JWT>
CRAWL4AI_EMAIL=crawl4ai@geoclic.fr
```

Le backend échange automatiquement `CRAWL4AI_TOKEN` contre un JWT valable une heure,
puis le conserve en mémoire pendant 50 minutes.

## Configuration sensible Crawl4AI

Créer le fichier à partir du modèle sans versionner le secret :

```bash
sudo install -d -m 750 -o root -g ubuntu /var/lib/geoclicmedia-crawl4ai
sed "s/__CRAWL4AI_TOKEN__/$CRAWL4AI_TOKEN/" config.yml.template \
  | sudo tee /var/lib/geoclicmedia-crawl4ai/config.yml >/dev/null
sudo chown root:ubuntu /var/lib/geoclicmedia-crawl4ai/config.yml
sudo chmod 640 /var/lib/geoclicmedia-crawl4ai/config.yml
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

Une requête `POST /crawl` sans JWT doit répondre `401`.

## Arrêt et retour au crawler standard

Supprimer ou vider `CRAWL4AI_URL` dans `back/.env`, redémarrer Django et Celery,
puis arrêter le conteneur :

```bash
sudo docker compose --env-file ../../back/.env down
```

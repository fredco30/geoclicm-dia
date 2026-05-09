# 20 — Assistant IA : déploiement et configuration

> Document opérationnel pour activer l'assistant IA en production. À
> exécuter une seule fois au premier déploiement de la PR 5
> (`feat/assistant-foundation`). Les PRs suivantes (6 indexers, 7 widget
> front) n'ajoutent pas de prérequis serveur.

---

## Résumé en 1 minute

L'assistant IA repose sur 3 briques côté serveur :

1. **Mistral AI** (LLM hébergé en France/UE) → embeddings + chat completions
2. **pgvector** (extension PostgreSQL) → stockage et recherche des embeddings
3. **Package Python `pgvector`** → mapping ORM Django ↔ pgvector

Coût estimé en cruise : **5-15 €/mois** chez Mistral pour ~500-2000 questions/mois.

---

## 1. Créer un compte Mistral et générer une clé API

1. Aller sur https://console.mistral.ai/ et créer un compte (email + mot
   de passe).
2. Activer la facturation (CB demandée même pour le crédit gratuit
   initial). Mistral offre quelques euros de crédit pour démarrer ; au-delà,
   facturation à la consommation.
3. Aller sur **API Keys** : https://console.mistral.ai/api-keys
4. Cliquer **Create new key**. Donner un nom (ex: `media.geoclic.fr —
   prod`). Copier la clé immédiatement (elle ne sera plus jamais
   affichée en clair).

⚠️ **NE JAMAIS coller cette clé dans le chat avec Claude.** La copier
directement dans le `.env` du VPS via SSH (cf section 4 ci-dessous).

---

## 2. Installer pgvector côté PostgreSQL

L'extension pgvector doit être disponible au niveau du serveur PostgreSQL.
Sur Ubuntu avec PostgreSQL 17 :

```bash
sudo apt update
sudo apt install postgresql-17-pgvector
sudo systemctl restart postgresql
```

Si le paquet `postgresql-17-pgvector` n'est pas trouvé (vieille distro) :

```bash
# Vérifier la version Postgres installée
psql --version
# Si Postgres 16 :
sudo apt install postgresql-16-pgvector
# Si version exotique : compiler depuis les sources
# https://github.com/pgvector/pgvector#installation-notes
```

Activer l'extension dans la base `geoclicmedia_db` :

```bash
sudo -u postgres psql -d geoclicmedia_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

Vérification :

```bash
sudo -u postgres psql -d geoclicmedia_db -c "\dx" | grep vector
# Doit afficher une ligne "vector | 0.x.x | public | vector data type ..."
```

> Note : la migration Django `assistant.0001_initial` contient un
> `pgvector.django.VectorExtension()` qui fera aussi `CREATE EXTENSION`,
> mais il faut quand même que le paquet système soit installé d'abord —
> sinon la migration échouera avec `extension "vector" is not available`.

---

## 3. Installer la dépendance Python

```bash
cd /var/www/geoclicmedia/back
source .venv/bin/activate
pip install -r requirements/base.txt
```

Cela installe `pgvector>=0.3` qui fournit le `VectorField` Django.

---

## 4. Configurer les variables d'environnement

Éditer `/var/www/geoclicmedia/back/.env` :

```bash
nano /var/www/geoclicmedia/back/.env
```

Ajouter à la fin :

```
# Assistant IA (Mistral)
MISTRAL_API_KEY=<clé copiée depuis console.mistral.ai/api-keys>
MISTRAL_MODEL=mistral-small-latest
MISTRAL_EMBED_MODEL=mistral-embed
ASSISTANT_RATE_LIMIT_PER_HOUR=20
```

Sauvegarder et fermer (`Ctrl+O`, Enter, `Ctrl+X`).

> Test mental : si quelqu'un voit cette clé, peut-il faire des appels API
> à votre place et faire monter votre facture Mistral ? **OUI**, donc
> c'est un secret. Ne jamais la mettre dans Git ni dans un chat.

---

## 5. Appliquer la migration

```bash
cd /var/www/geoclicmedia/back
source .venv/bin/activate
python manage.py migrate assistant
```

Vous devriez voir :

```
Applying assistant.0001_initial... OK
```

Si vous voyez `extension "vector" is not available`, retournez à la
section 2 (le paquet système n'est pas installé).

---

## 6. Redémarrer Django

```bash
sudo systemctl restart geoclicmedia-django
```

---

## 7. Smoke test (après PR 5 mergée)

L'endpoint `/api/assistant/ask/` est désormais disponible mais l'index
est **vide** — l'IA répondra honnêtement « Je n'ai aucune information
indexée pour l'instant ». C'est normal : les indexers (PR 6) viendront
remplir la base avec les fiches Business + articles + crawl mairies/OT
+ Wikipedia + DataTourisme + OSM.

Pour vérifier que l'endpoint répond bien et que la chaîne Mistral
fonctionne :

```bash
curl -X POST https://media.geoclic.fr/api/assistant/ask/ \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Bonjour",
    "session_id": "test-session-12345678",
    "language": "fr"
  }'
```

Réponses possibles :

- **HTTP 200** + JSON `{answer, citations, session_id, language}` →
  Mistral répond, chaîne complète OK. Les `citations` seront vides tant
  que l'index n'est pas peuplé.
- **HTTP 503 + code: "not_configured"** → la clé `MISTRAL_API_KEY` n'est
  pas dans `.env` ou pas chargée. Refaire section 4 puis redémarrer Django.
- **HTTP 503 + code: "mistral_error"** → la clé est rejetée par Mistral
  (mauvaise clé, compte bloqué, quota dépassé). Vérifier sur la console.
- **HTTP 500** → erreur côté Django. Logs : `sudo journalctl -u
  geoclicmedia-django -n 50 --no-pager`.

---

## 8. Surveillance et coûts

Côté admin Django (`/django-admin/assistant/assistantmessage/`), on peut
voir toutes les questions/réponses avec leurs tokens consommés. Le suivi
mensuel se fait :

```bash
sudo -u postgres psql -d geoclicmedia_db -c "
  SELECT
    DATE_TRUNC('month', created_at) AS mois,
    SUM(cost_tokens_in) AS tokens_in,
    SUM(cost_tokens_out) AS tokens_out,
    COUNT(*) AS nb_messages
  FROM assistant_assistantmessage
  WHERE role='assistant'
  GROUP BY 1 ORDER BY 1 DESC;
"
```

Conversion en coût (au 2026-05) :
- Tokens entrée × 0,20 €/1M = coût input
- Tokens sortie × 0,60 €/1M = coût output
- Coût embeddings : à mesurer dans la console Mistral car non logué
  côté Django (les embeddings sont produits par les indexers PR 6, le
  monitoring se fait via le tableau de bord Mistral).

Si le coût mensuel dépasse 30 €, agir :
- Réduire `ASSISTANT_RATE_LIMIT_PER_HOUR` (par défaut 20, descendre à 10)
- Vérifier les questions logguées : si l'IA est utilisée pour des
  usages hors-périmètre (ex: chat général), ajouter un filtre côté prompt
  ou côté frontend
- Switcher temporairement vers `mistral-tiny` (moins cher mais moins
  qualitatif) en mettant `MISTRAL_MODEL=mistral-tiny` dans `.env`

---

## 9. Dépannage

**`pgvector.django.utils.VectorExtensionNotAvailable`**
→ L'extension Postgres n'est pas activée dans la base. Refaire section 2
en se connectant explicitement à `geoclicmedia_db`.

**`Mistral chat HTTP 401`**
→ Clé API invalide. Régénérer sur https://console.mistral.ai/api-keys et
mettre la nouvelle dans `.env`.

**`Mistral chat HTTP 429`**
→ Mistral rate-limit votre clé (trop de requêtes/seconde côté serveur,
ou crédit épuisé). Voir le quota sur la console Mistral.

**Réponses lentes (> 10s)**
→ Le modèle `mistral-small-latest` est généralement < 3s, mais peut
ralentir en heure de pointe. Si systématiquement lent, ouvrir un ticket
Mistral. Pour V1, accepter ; on peut introduire du streaming en V2 pour
améliorer la perception.

**`extension "vector" already exists`** lors du migrate
→ Pas grave, l'extension était déjà activée manuellement. La migration
continue normalement.

---

## 10. Procédure complète one-shot (récap)

Pour un nouveau VPS / réinstallation totale :

```bash
# 1. Installer pgvector au niveau système
sudo apt install postgresql-17-pgvector
sudo systemctl restart postgresql
sudo -u postgres psql -d geoclicmedia_db -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 2. Installer la dep Python
cd /var/www/geoclicmedia/back && source .venv/bin/activate && pip install -r requirements/base.txt

# 3. Mettre la clé Mistral dans .env (manuel, voir section 4)
nano .env

# 4. Migrer et redémarrer
python manage.py migrate assistant && sudo systemctl restart geoclicmedia-django

# 5. Smoke test
curl -s -X POST https://media.geoclic.fr/api/assistant/ask/ \
  -H "Content-Type: application/json" \
  -d '{"question":"Bonjour","session_id":"test-12345678","language":"fr"}' | head -200
```

---

*Document à jour PR 5 — refonte portail v2 (cf 19-plan-refonte-portail-v2.md).*

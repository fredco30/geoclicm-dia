# 15 — Administration des utilisateurs et rôles

Comment créer des comptes, attribuer des droits, et utiliser les rôles dans geoclicMédia.

---

## 🎯 Les 4 rôles

| Rôle (slug) | Libellé | Peut publier ? | Peut éditer son propre article ? | Peut éditer celui des autres ? |
|---|---|:-:|:-:|:-:|
| `reader` | Lecteur | ❌ | — | — |
| `advertiser` | Annonceur | ❌ | — | — |
| `editor` | Rédacteur | ✅ | ✅ | ❌ |
| `admin` | Administrateur | ✅ | ✅ | ✅ |

> ⚙️ **Cas particulier** : un compte avec `is_superuser=True` (créé via `python manage.py createsuperuser`) a **tous les droits**, peu importe son `role`. C'est ton compte `fred` aujourd'hui — son rôle métier reste "reader" mais il a accès complet via le flag superuser. Le back-office l'affiche maintenant comme "Administrateur".

---

## 📝 Créer un nouvel utilisateur

### Méthode 1 — Via Django Admin (recommandé)

Tant qu'on n'a pas d'écran `/admin/users/` custom dans le front (Sprint futur), on passe par Django Admin :

1. Ouvre **`http://135.125.159.142:8002/admin/core/user/add/`** (ou `https://media.geoclic.fr/admin/core/user/add/` en prod).
2. Connecte-toi avec ton compte superuser.
3. Remplis :
   - **Nom d'utilisateur** : ex. `marie.dupont` (sera l'identifiant de connexion)
   - **Mot de passe** : génère un mot de passe fort, à transmettre à la personne
4. Clique **« Enregistrer et continuer les modifications »**.
5. Sur l'écran suivant, complète :
   - **Email**, **Prénom**, **Nom**
   - **Rôle** : choisis dans la liste déroulante (`Rédacteur` pour ta partenaire éditoriale)
   - Coche **« Statut équipe »** (`is_staff`) si tu veux qu'elle puisse aussi accéder à `/admin/` Django (utile pour debug).
   - **Ne coche PAS** « Statut super-utilisateur » sauf besoin (c'est l'équivalent de root).
6. **Enregistrer**.

La personne peut maintenant se connecter à **`/admin/login`** (back-office custom) avec ses identifiants.

### Méthode 2 — En ligne de commande (urgences)

Sur le VPS :

```bash
cd /var/www/geoclicmedia/back && source .venv/bin/activate && python manage.py shell
```

Dans le shell Python :

```python
from apps.core.models import User
u = User.objects.create_user(
    username="marie.dupont",
    email="marie@exemple.fr",
    password="mot-de-passe-fort",
    first_name="Marie",
    last_name="Dupont",
    role=User.Role.EDITOR,  # ou READER, ADVERTISER, ADMIN
)
u.save()
exit()
```

---

## 🔑 Modifier le rôle d'un utilisateur existant

Via **Django Admin** → `/admin/core/user/` → clique sur le user → change le champ **Rôle** → **Enregistrer**.

Effet immédiat : à sa prochaine connexion (ou `Ctrl+F5` du back-office custom), ses droits sont mis à jour.

---

## 🔒 Désactiver un compte (sans supprimer)

Via **Django Admin** → `/admin/core/user/<id>/` → décoche **« Actif »** (`is_active`) → Enregistrer.

Le user ne peut plus se connecter mais ses articles et historique restent. Pour réactiver : recoche `is_active`.

---

## 🗑️ Supprimer un compte

⚠️ **À éviter sauf RGPD** — supprimer un user supprime aussi tous ses articles (modèle Article a `author` en ON DELETE PROTECT, donc ça refusera tant qu'il a des articles).

Procédure RGPD propre :
1. Réassigne ses articles à un autre user (via Django Admin → article → change author → save).
2. Anonymise le compte : change username en `anonyme-12345`, email vide, prénom/nom vides.
3. Désactive le compte (`is_active=False`).
4. Garde la trace pour 1 an puis delete (article R10-12 LCEN).

---

## 📊 Cas d'usage typiques

### Ta partenaire éditoriale
- Rôle : **Rédacteur** (`editor`)
- Coché : `is_staff` (accès admin Django pour debug)
- Décoché : `is_superuser`
- Elle utilisera `/admin/login` (back-office custom) pour son travail quotidien.

### Toi (admin solo)
- Rôle : `reader` (défaut), mais `is_superuser=True` → tous les droits.
- Si tu veux nettoyer la sémantique : passe ton rôle à `admin` via Django Admin.

### Annonceurs (sprint 4)
- Rôle : `advertiser` — pas de droit publication, mais pourra accéder à un futur `/annonceur/dashboard` avec stats Stripe + gestion encarts.

### Lecteurs anonymes
- Pas de compte requis. Aucun rôle.

---

## 🛠️ Modifier la liste des rôles

Si plus tard tu veux ajouter un rôle (ex. `moderator` pour modérer les commentaires), dans `back/apps/core/models.py` :

```python
class Role(models.TextChoices):
    READER = "reader", "Lecteur"
    ADVERTISER = "advertiser", "Annonceur"
    EDITOR = "editor", "Rédacteur"
    MODERATOR = "moderator", "Modérateur"  # NOUVEAU
    ADMIN = "admin", "Administrateur"
```

Puis :

```bash
python manage.py makemigrations core
python manage.py migrate
```

Et adapte la méthode `can_publish` si besoin.

Côté front, mets à jour `front/src/lib/roles.ts` avec le nouveau libellé.

---

## 🔐 Sécurité

- Les mots de passe sont stockés hachés (PBKDF2 SHA256 par défaut Django, robuste).
- 2FA via `django-otp` est installée mais pas activée par défaut. À activer pour les comptes admin sur prod (sprint futur).
- Sessions HttpOnly + CSRF protégés (déjà en place).
- HTTPS obligatoire en prod (à activer via ÉTAPE 6 / `deploy-prod.sh`).

---

## 📅 Roadmap utilisateurs

- **Sprint 1** ✅ : 4 rôles, création via Django Admin, can_publish.
- **Sprint 2** : page `/admin/users/` custom dans le front (lister, créer, modifier rôle, désactiver) — pour que tu n'aies plus à utiliser Django Admin.
- **Sprint 3** : invitation par email (lien token magique pour set son mot de passe).
- **Sprint 4** : espace `/annonceur/` self-service.
- **Sprint 5** : 2FA obligatoire pour rôles editor/admin.

# 08 — Setup Meta App + Procédure App Review

Procédure complète pour configurer la publication automatique vers la Page Facebook depuis le back-office Django, et passer l'App Review Meta du premier coup.

> **Important** : la review Meta prend 2-7 jours en moyenne. **Démarrer la procédure dès que possible** en parallèle du dev pour ne pas bloquer le sprint 2.

## Vue d'ensemble du processus

```
J0     Création Business Manager + App + setup technique
J1-J3  Dev de l'intégration en mode "Development" avec test
J3     Préparation des assets de review (vidéo, descriptions)
J4     Soumission pour App Review
J6-J11 Review Meta (2-7 jours)
J11+   Passage en mode Live, intégration finale
```

## Préalables

### Compte Facebook personnel propre

- Vérifié (numéro de téléphone, identité)
- Pas tout neuf
- Sans historique de signalements
- Utilise ton compte principal, pas un compte "pro" créé pour l'occasion

### Page Facebook existante bien configurée

La page actuelle doit être :
- Avec catégorie clairement définie (Média/Actualités/Communauté)
- Sans warnings ou restrictions
- Avec rôle "Admin" attribué à ton compte

### Domaine et site live AVANT la review

**NON NÉGOCIABLE.** Meta vérifie que :
- Le site est accessible et fonctionnel
- La politique de confidentialité est en ligne ET mentionne explicitement Facebook
- Les CGU sont accessibles
- Les mentions légales et contact sont visibles

→ Soumettre la review APRÈS le sprint 1 déployé, pas avant.

## Phase 1 — Création de la structure Meta

### Business Manager

Direction `business.facebook.com`.

Configuration :
- **Nom** : "Le Camarguais Média" (ou nom de la SAS)
- **Email pro** : `contact@lecamarguais.fr`
- **Site web** : `https://lecamarguais.fr`

Dans le Business Manager :
- [ ] Comptes > Pages : revendiquer ou ajouter la page Facebook actuelle
- [ ] Utilisateurs > Personnes : ajouter la partenaire avec rôle Admin
- [ ] Sécurité : activer 2FA obligatoire pour tous les admins

### Vérification Business

Dans `Paramètres de l'entreprise > Centre de sécurité`.

Documents demandés :
- Justificatif d'enregistrement (Kbis si SAS, récépissé d'association)
- Justificatif de domicile pro
- Numéro de téléphone vérifiable

→ Idéalement, créer la SAS avant cette étape pour fluidifier.

### Création de la Meta App

Direction `developers.facebook.com/apps`.

- Créer App > Type **Business**
- **Nom** : "Le Camarguais" (apparaît aux utilisateurs)
- **Email de contact** : email surveillé quotidiennement
- **Business** : sélectionner le Business Manager créé

Noter :
- App ID
- App Secret
- Page ID (depuis votre page Facebook : Paramètres > À propos > ID de la Page)

À mettre dans les settings Django :

```python
# config/settings/prod.py
FACEBOOK_APP_ID = os.environ['FACEBOOK_APP_ID']
FACEBOOK_APP_SECRET = os.environ['FACEBOOK_APP_SECRET']
FACEBOOK_PAGE_ID = os.environ['FACEBOOK_PAGE_ID']
SITE_URL = os.environ.get('SITE_URL', 'https://lecamarguais.fr')
```

### Configuration de base

**Settings > Basic** :
- App Domains : `lecamarguais.fr` (sans www, sans https)
- Privacy Policy URL : `https://lecamarguais.fr/politique-confidentialite`
- Terms of Service URL : `https://lecamarguais.fr/cgu`
- User Data Deletion : `https://lecamarguais.fr/suppression-donnees` (page d'instructions, l'app ne stockant pas de données utilisateur Facebook)
- Category : "News" ou "Business and Pages"
- Icon : 1024×1024 px, logo final
- Site URL : ajouter plateforme "Website" → `https://lecamarguais.fr`

### Ajouter Facebook Login for Business

Bizarrerie Meta : pour publier sur une Page, il faut configurer Facebook Login.

- Ajouter le produit **Facebook Login for Business**
- Valid OAuth Redirect URIs : `https://lecamarguais.fr/admin/facebook/callback/`
- Client OAuth Login : ON
- Web OAuth Login : ON

## Phase 2 — Permissions à demander

**3 permissions seulement**, pas plus :

### `pages_show_list`

Description type pour la review :

> Cette permission est utilisée une seule fois lors de la configuration initiale de l'application. L'administrateur du média Le Camarguais sélectionne la Page Facebook officielle parmi celles qu'il administre, afin d'établir la liaison technique entre notre back-office éditorial et la Page. Sans cette permission, l'administrateur ne peut pas identifier laquelle de ses Pages doit recevoir les publications automatisées.

### `pages_read_engagement`

Description type :

> Notre application affiche dans le tableau de bord éditorial les statistiques de performance des articles publiés sur Facebook (nombre de réactions, de commentaires, de partages). Ces statistiques aident l'équipe rédactionnelle à comprendre quels formats d'articles fonctionnent le mieux auprès de la communauté locale. Les données sont affichées uniquement aux administrateurs internes du média.

### `pages_manage_posts`

Description type :

> Notre application est un back-office éditorial pour le média local Le Camarguais (lecamarguais.fr). Lorsqu'un journaliste publie un article sur notre site, l'application crée automatiquement un post correspondant sur la Page Facebook officielle du média (avec lien vers l'article et résumé). Cela permet à l'équipe de publier une fois et de toucher à la fois les lecteurs du site et la communauté Facebook historique du média (X abonnés depuis Y années). En cas de dépublication d'un article (correction d'erreur factuelle, problème juridique), la suppression est répercutée sur la Page Facebook pour cohérence.

→ Remplacer X et Y par les vrais chiffres.

### Ce qu'il NE FAUT PAS demander

- ❌ `pages_manage_metadata`
- ❌ `pages_messaging`
- ❌ `pages_manage_engagement`
- ❌ Toute permission Instagram (sprint 5)
- ❌ `business_management`

Demander moins = approbation plus rapide.

## Phase 3 — Préparer les assets de review

### Vidéo de démo (LE point critique)

80% des rejets viennent d'une vidéo mal faite.

**Cahier des charges** :
- Durée : 60-120 sec
- Format : MP4, 1920×1080 minimum, < 100 MB
- Voix off française recommandée
- Sous-titres anglais fortement recommandés (reviewers internationaux)

**Scénario** :

| Temps | Action | Commentaire |
|-------|--------|-------------|
| 0-10s | Site `lecamarguais.fr` | "Voici Le Camarguais, média local du littoral camarguais" |
| 10-25s | Login admin Django | "Un journaliste se connecte à notre back-office éditorial" |
| 25-45s | Création article (titre, contenu, photo) | "Il rédige un article sur un événement local" |
| 45-65s | Clic "Publier" + notif succès | "L'application utilise les permissions Facebook pour publier automatiquement" |
| 65-85s | Voir le post FB réel avec preview | "Voici le post publié automatiquement sur notre Page" |
| 85-100s | Retour Django, voir stats | "L'équipe peut suivre les performances depuis le back-office" |
| 100-120s | Conclusion | "Cette intégration permet de toucher site + communauté FB efficacement" |

**Astuces** :
- Fond propre, désactiver notifications
- OBS Studio pour la capture (gratuit)
- Voix off > muet
- Pas de musique de fond (gêne la compréhension)

### Politique de confidentialité

Doit explicitement contenir :

> Notre site utilise les API officielles de Meta Platforms (Facebook) dans le cadre exclusif de la publication automatisée de nos articles sur notre Page Facebook officielle. Cette utilisation ne donne lieu à aucune collecte ni stockage de données personnelles d'utilisateurs Facebook par notre service. Les seules données traitées sont les statistiques d'engagement public (nombre de réactions, commentaires) sur nos propres publications, utilisées en interne pour évaluer la performance éditoriale. Aucune donnée n'est partagée avec des tiers.

### Test users

Dans **App Roles > Roles** :
- Tes co-équipiers en rôle Admin/Developer
- **Ne jamais** mettre tes vrais identifiants dans les notes au reviewer (Meta utilise ses propres test accounts)

## Phase 4 — Implémentation technique

### Flow OAuth (one-time setup)

```python
# apps/distribution/views.py
from django.shortcuts import redirect
from django.contrib.admin.views.decorators import staff_member_required
from django.conf import settings
from django.utils import timezone
from django.http import HttpResponse
import requests

@staff_member_required
def facebook_connect(request):
    redirect_uri = request.build_absolute_uri('/admin/facebook/callback/')
    auth_url = (
        f"https://www.facebook.com/v19.0/dialog/oauth?"
        f"client_id={settings.FACEBOOK_APP_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=pages_show_list,pages_read_engagement,pages_manage_posts"
        f"&response_type=code"
    )
    return redirect(auth_url)


@staff_member_required
def facebook_callback(request):
    code = request.GET.get('code')
    redirect_uri = request.build_absolute_uri('/admin/facebook/callback/')

    # Échange code -> short user token
    token_url = "https://graph.facebook.com/v19.0/oauth/access_token"
    r = requests.get(token_url, params={
        'client_id': settings.FACEBOOK_APP_ID,
        'client_secret': settings.FACEBOOK_APP_SECRET,
        'redirect_uri': redirect_uri,
        'code': code,
    })
    short_user_token = r.json()['access_token']

    # Échange -> long user token (~60 jours)
    r = requests.get(token_url, params={
        'grant_type': 'fb_exchange_token',
        'client_id': settings.FACEBOOK_APP_ID,
        'client_secret': settings.FACEBOOK_APP_SECRET,
        'fb_exchange_token': short_user_token,
    })
    long_user_token = r.json()['access_token']

    # Récupère pages + Page Access Tokens
    r = requests.get(
        "https://graph.facebook.com/v19.0/me/accounts",
        params={'access_token': long_user_token}
    )
    pages = r.json()['data']

    target_page = next(p for p in pages if p['id'] == settings.FACEBOOK_PAGE_ID)
    page_token = target_page['access_token']

    # Le Page Access Token issu d'un long user token est SANS EXPIRATION
    # tant que l'utilisateur ne change pas son mdp et garde l'app autorisée
    FacebookCredentials.objects.update_or_create(
        page_id=settings.FACEBOOK_PAGE_ID,
        defaults={
            'page_name': target_page['name'],
            'access_token': page_token,
            'granted_by': request.user,
            'refreshed_at': timezone.now(),
            'is_valid': True,
        }
    )

    return HttpResponse("Token Facebook configuré avec succès.")
```

### Sécurité du Page Access Token

- Chiffrement en base via `django-cryptography`
- Variables d'env pour App ID/Secret, jamais en Git
- Jamais en log, jamais en clair dans l'admin

### Détection d'expiration

```python
# apps/distribution/tasks.py
from celery import shared_task

@shared_task
def check_facebook_token_health():
    creds = FacebookCredentials.objects.filter(is_valid=True).first()
    if not creds:
        return

    r = requests.get(
        f"https://graph.facebook.com/v19.0/{creds.page_id}",
        params={'access_token': creds.access_token, 'fields': 'id,name'}
    )
    if r.status_code != 200:
        creds.is_valid = False
        creds.save()
        send_admin_email(
            subject="🚨 Token Facebook invalide",
            body=f"Le token a expiré ou été révoqué. Reconnecter via /admin/facebook/connect/"
        )

    creds.last_health_check = timezone.now()
    creds.save()
```

Tâche planifiée via Celery Beat : tous les jours à 6h.

## Phase 5 — Soumission de la review

1. **App Review > Permissions and Features**
2. Pour chaque permission, **Request Advanced Access**
3. Description spécifique (jamais copier-coller)
4. Upload vidéo de démo (même vidéo OK pour les 3 permissions)
5. Vérifier complétude :
   - Settings remplis
   - App Verification renseignée
   - Email valide
   - Catégorie précise
   - Data Use Checkup à jour
6. **Submit for Review**

### Pendant la review

- L'app reste utilisable en mode Development par tes test accounts
- Tu ne peux pas modifier la soumission
- 2-7 jours ouvrés
- Email à chaque changement de statut

## Erreurs typiques de rejet et solutions

| Motif | Solution |
|-------|----------|
| Use case unclear | Réécrire descriptions plus concrètement, refaire vidéo plus claire |
| Privacy policy issue | Vérifier accessibilité, mention Facebook explicite, langue cohérente |
| Cannot reproduce behavior | Améliorer la vidéo (sous-titres, voix off) |
| App not functional | Site en panne pendant review → vérifier uptime |
| Missing data deletion | Créer page suppression-données ou URL callback |

Chaque rejet relance le compteur. Bien préparer le 1er coup peut faire gagner 2 semaines.

## Phase 6 — Passage en mode Live

Une fois approuvé :
1. **Settings > Basic > App Mode** : Development → **Live**
2. ⚠️ Apps en Live ne peuvent demander que les permissions approuvées
3. Re-tester un cycle complet de publication
4. Documenter le process pour la partenaire

## Erreurs à éviter ABSOLUMENT

1. ❌ Soumettre avant que le site soit live et stable
2. ❌ Demander des permissions "au cas où"
3. ❌ Vidéo générique ou avec coupures
4. ❌ PP absente ou ne mentionnant pas Facebook
5. ❌ Description copiée-collée entre permissions
6. ❌ Site en français mais interface en anglais incohérente
7. ❌ Compte créateur pas vérifié
8. ❌ App Mode basculé en Live avant approbation

## Timing par rapport au planning

```
Sprint 1 (sem 1-2) : Site live, PP rédigée, page suppression-données
                     → Création Business Manager + Meta App en parallèle

Sprint 2 J1-J2     : Implémentation OAuth + publication mode Dev
Sprint 2 J3        : Tournage vidéo + rédaction descriptions
Sprint 2 J4        : Soumission Review
Sprint 2 J5-J10    : Continuer agenda + annuaire pendant la review
                     → Si approuvé : passage Live, intégration finale
                     → Si rejet : corrections + resoumission
```

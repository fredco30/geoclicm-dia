# 16 — Guide de la rédactrice

Comment publier un article sur **geoclicMédia** en 5 minutes.

---

## 🔑 Première connexion

1. Va sur **https://media.geoclic.fr/admin/login**
2. Entre ton **identifiant** et ton **mot de passe** (Fred te les a transmis)
3. Clique **Se connecter**

Tu arrives sur le tableau de bord avec la liste de tous les articles.

> 🔒 **Mot de passe oublié ?** Demande à Fred — il peut le réinitialiser depuis l'écran "Comptes & droits" en quelques secondes.

---

## ✍️ Publier un nouvel article

### 1. Ouvrir le formulaire

Dans la sidebar à gauche, clique **« Nouvel article »** (ou le bouton vert en haut à droite du tableau).

### 2. Remplir le contenu

| Champ | Quoi mettre |
|---|---|
| **Titre** | La phrase qui résume l'article. Court et accrocheur (max 250 caractères). Ex: *« Le Grau-du-Roi inaugure son nouveau port de plaisance »* |
| **Chapeau** | L'accroche de 1 à 2 phrases qui apparaît sous le titre. **Maximum 300 caractères** (un compteur s'affiche). C'est ce qui donne envie de cliquer. |
| **Corps** | Le texte complet de l'article, en **markdown** (voir section ci-dessous). |

### 3. Le markdown — c'est simple

Pour mettre la mise en forme dans le corps de l'article :

| Ce que tu veux | Comment l'écrire |
|---|---|
| Un titre de section | `## Mon titre` |
| Un sous-titre | `### Mon sous-titre` |
| Du **gras** | `**mon texte**` |
| De l'*italique* | `*mon texte*` |
| Une citation | `> Sa phrase entre guillemets, sur une ligne dédiée préfixée par >` |
| Une liste | `- premier point` puis `- deuxième point` (un par ligne) |
| Un lien | `[texte du lien](https://exemple.fr)` |
| Une image dans le corps | `![Description](URL-image.jpg)` (mais préférer le champ "Image de couverture" pour la photo principale) |

> 💡 **Astuce** : sur la page d'édition, clique sur l'onglet **« Aperçu »** au-dessus de la zone d'écriture. Tu vois le rendu final exactement comme le verra le lecteur. Très pratique pour relire.

### 4. Image de couverture

Dans la sidebar à droite, section **« Image de couverture »** :
1. Clique sur la zone pointillée **« Cliquer pour uploader »**
2. Choisis ton fichier image (JPEG, PNG ou WebP, format paysage de préférence)
3. L'image s'affiche en aperçu

Le système redimensionne **automatiquement** l'image en 3 tailles (vignette / mobile / desktop) pour qu'elle s'affiche bien sur tous les écrans. Tu n'as rien à faire.

> 📸 **Photo paysage recommandée** : pour le hero de la page d'accueil, une photo paysage (16/9) donne le meilleur rendu. Une photo portrait fonctionnera aussi mais sera affichée différemment selon la page.

### 5. Catégoriser

Dans la sidebar à droite, section **« Catégorisation »** :
- **Catégorie** (obligatoire) : Mémoire vivante, Patrimoine, Pêche et traditions, Portraits, Reportages, Archives photos, Bons plans, Tribune libre.
- **Commune** (facultatif) : si l'article concerne une commune précise du territoire.
- **Type** : Reportage, Portrait, Brève, Tribune libre, Dossier.

### 6. Publier

Dans la sidebar **« Publication »** :

| Statut | Quoi |
|---|---|
| **Brouillon** | L'article est sauvegardé mais pas visible publiquement. À utiliser pendant l'écriture. |
| **Programmé** | (À venir Sprint 2) Publication automatique à une date future. |
| **Publié** | L'article est visible immédiatement sur le site. |
| **Archivé** | Retiré du site sans suppression définitive. |

Coche **« À la une »** si l'article doit apparaître en hero sur la page d'accueil.

### 7. Sauvegarder

Clique **« Enregistrer »** en haut à droite. C'est en ligne ✨

---

## 📝 Réviser un article existant

1. Tableau de bord → trouve l'article dans la liste
2. Clique l'icône ✏️ dans la colonne **Actions**
3. Modifie ce que tu veux
4. **Enregistrer**

Pour **voir** comment l'article apparaît au public, clique l'icône 👁️ dans la colonne Actions.

---

## 🎨 Bonnes pratiques éditoriales

### Titres
- Court (50-70 caractères) pour qu'ils ne soient pas tronqués sur Google
- Évite les majuscules en CAPS LOCK
- Pose une question ou annonce un fait précis

### Chapeau
- Phrase complète, donne envie de lire
- Mentionne le **où** (commune) et le **pourquoi**
- Évite les "Découvrez...", trop génériques

### Corps
- **Premier paragraphe** : poser le contexte en 2-3 phrases (qui, quoi, où)
- **Sous-titres `##`** : pour aérer les longs articles (> 600 mots)
- **Citations `> ...`** : mettre en valeur les paroles d'un témoin
- **Photos dans le corps** : 1 toutes les 300-500 mots maximum
- **Conclusion** : ouvre sur une perspective, pas un résumé

### SEO (Référencement Google)
- Le **titre** et le **chapeau** sont déjà utilisés pour Google.
- Champs avancés (sidebar) :
  - **Meta title** : variation du titre optimisée pour Google (60-70 caractères max). Si vide, c'est le titre qui sert.
  - **Meta description** : phrase qui apparaît sous le lien sur Google (140-160 caractères). Si vide, c'est le chapeau qui sert.

> Tu peux laisser ces deux champs vides : le système utilisera le titre et le chapeau par défaut, c'est très bien.

---

## 🚫 Mention sponsor

Si l'article est **sponsorisé** par un commerçant (Sprint 4 — pas encore actif) :
- Remplis **Mention sponsor** dans la sidebar (ex : *« En partenariat avec La Fromagerie du Grau »*).
- Cette mention apparaîtra clairement en tête de l'article. **Obligation légale.**

Pour un article éditorial classique → laisse ce champ vide.

---

## 🆘 Bug ou question

- Pour un **bug technique** : envoie un message à Fred.
- Pour une **question éditoriale** : on en discute en réunion d'équipe.
- Pour un **mot de passe perdu** : Fred peut le réinitialiser depuis l'écran "Comptes & droits".

---

## ⌨️ Raccourcis utiles

- **Ctrl+S** dans le formulaire d'article : ne sauvegarde **pas** (bug Next.js, à venir). Pour l'instant, clique le bouton **Enregistrer**.
- **Ctrl+Tab** dans le navigateur : passe d'un onglet à l'autre. Utile pour avoir l'admin et le site public ouverts en parallèle.
- **F5** : rafraîchir la page. **Ctrl+Maj+R** : rafraîchir en vidant le cache (si l'aperçu ne se met pas à jour).

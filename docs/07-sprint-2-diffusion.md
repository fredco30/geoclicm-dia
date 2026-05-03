# 07 — Sprint 2 : Diffusion Facebook + Agenda + Annuaire (2 semaines)

## Objectif

Workflow "publier une fois, diffuser partout" + ajout des modules événements et commerçants pour avoir un vrai média opérationnel.

## Vue d'ensemble du sprint

```
Semaine 1 :
  J1-J2 : Setup Meta App + diffusion Facebook
  J3    : Open Graph, Schema.org, SEO avancé
  J4-J5 : Module Agenda événementiel

Semaine 2 :
  J6-J7 : Module Annuaire commerçants
  J8    : Carte interactive globale (MapLibre)
  J9    : Newsletter + analytics RGPD (Plausible)
  J10   : Polish, tests, déploiement
```

## Jours 1-2 — Diffusion automatique Facebook (10-12h)

**Important** : la procédure Meta App + Review prend 2-7 jours administratifs. **Démarrer la procédure dès le J1 du sprint 2** (cf. [08-meta-app-setup.md](./08-meta-app-setup.md)) pour que la review soit faite quand on bascule en prod.

### Côté code

- [ ] Créer app `distribution`
- [ ] Modèle `FacebookCredentials` (stockage chiffré du Page Access Token)
- [ ] Modèle `DistributionLog` pour tracer succès/échecs
- [ ] Vue OAuth Django : `/admin/facebook/connect/` + `/admin/facebook/callback/`
- [ ] Service `FacebookPublisher` (publish + delete)
- [ ] Tâche Celery `publish_article_to_facebook` avec retry exponentiel
- [ ] Signal post_save sur Article qui déclenche la tâche async
- [ ] Tâche Celery Beat quotidienne `check_facebook_token_health` avec alerte email

```python
# apps/distribution/services/facebook.py
import requests
from django.conf import settings

class FacebookPublisher:
    GRAPH_API_VERSION = 'v19.0'
    BASE_URL = f'https://graph.facebook.com/{GRAPH_API_VERSION}'

    def __init__(self):
        creds = FacebookCredentials.objects.get(is_valid=True)
        self.page_id = creds.page_id
        self.access_token = creds.access_token

    def publish_article(self, article):
        article_url = f"{settings.SITE_URL}/articles/{article.slug}"
        message = f"{article.title}\n\n{article.chapeau}\n\nLire : {article_url}"

        endpoint = f"{self.BASE_URL}/{self.page_id}/feed"
        params = {
            'message': message,
            'link': article_url,
            'access_token': self.access_token,
        }
        r = requests.post(endpoint, data=params, timeout=15)
        r.raise_for_status()
        return r.json()['id']

    def delete_post(self, post_id):
        endpoint = f"{self.BASE_URL}/{post_id}"
        r = requests.delete(endpoint, params={'access_token': self.access_token}, timeout=15)
        r.raise_for_status()
```

```python
# apps/distribution/tasks.py
from celery import shared_task
from django.utils import timezone

@shared_task(bind=True, max_retries=3, default_retry_delay=300)
def publish_article_to_facebook(self, article_id):
    from apps.editorial.models import Article
    from .services.facebook import FacebookPublisher

    try:
        article = Article.objects.get(id=article_id)
        if article.facebook_post_id or not article.auto_publish_to_facebook:
            return

        publisher = FacebookPublisher()
        post_id = publisher.publish_article(article)

        article.facebook_post_id = post_id
        article.facebook_published_at = timezone.now()
        article.save(update_fields=['facebook_post_id', 'facebook_published_at'])

        return post_id
    except Exception as exc:
        raise self.retry(exc=exc)
```

### Tests

- [ ] Publier article test → vérifier post Facebook créé avec preview correcte
- [ ] Désactiver `auto_publish_to_facebook` → pas de post
- [ ] Mettre Facebook en panne (mauvais token) → erreur tracée, retry, alerte email

## Jour 3 — Open Graph, Schema.org, SEO avancé (5-6h)

### Open Graph côté Next.js

`generateMetadata` dynamique sur `/articles/[slug]/page.tsx` :

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const article = await fetchArticle(params.slug);
  return {
    title: `${article.title} | Le Camarguais`,
    description: article.meta_description || article.chapeau,
    openGraph: {
      title: article.title,
      description: article.chapeau,
      type: 'article',
      url: `https://lecamarguais.fr/articles/${article.slug}`,
      images: [{
        url: article.cover_image_large,
        width: 1200,
        height: 630,
        alt: article.title,
      }],
      siteName: 'Le Camarguais',
      locale: 'fr_FR',
      publishedTime: article.published_at,
      authors: [article.author.name],
      tags: article.tags.map(t => t.name),
    },
    twitter: {
      card: 'summary_large_image',
      title: article.title,
      description: article.chapeau,
      images: [article.cover_image_large],
    },
    alternates: {
      canonical: `https://lecamarguais.fr/articles/${article.slug}`,
    },
  };
}
```

### Schema.org JSON-LD

- [ ] Composant `<ArticleStructuredData>` injectant `NewsArticle`
- [ ] Composant `<EventStructuredData>` injectant `Event`
- [ ] Composant `<BusinessStructuredData>` injectant `LocalBusiness` + sous-types
- [ ] Composant `<BreadcrumbList>` sur les pages catégorie/commune
- [ ] Composant `<OrganizationStructuredData>` global dans le layout

### Sitemap dynamique

`app/sitemap.ts` :

```typescript
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, events, businesses, communes] = await Promise.all([
    fetchAllArticleSlugs(),
    fetchAllEventSlugs(),
    fetchAllBusinessSlugs(),
    fetchAllCommuneSlugs(),
  ]);

  const staticUrls = [
    { url: 'https://lecamarguais.fr', lastModified: new Date(), priority: 1.0 },
    { url: 'https://lecamarguais.fr/agenda', lastModified: new Date(), priority: 0.8 },
    { url: 'https://lecamarguais.fr/annuaire', lastModified: new Date(), priority: 0.8 },
    { url: 'https://lecamarguais.fr/carte', lastModified: new Date(), priority: 0.7 },
  ];

  const articleUrls = articles.map(a => ({
    url: `https://lecamarguais.fr/articles/${a.slug}`,
    lastModified: new Date(a.updated_at),
    priority: 0.7,
  }));
  // idem events, businesses, communes

  return [...staticUrls, ...articleUrls, ...eventUrls, ...businessUrls, ...communeUrls];
}
```

### Robots.txt

`app/robots.ts` :

```typescript
export default function robots() {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin/', '/api/'] }],
    sitemap: 'https://lecamarguais.fr/sitemap.xml',
  };
}
```

## Jours 4-5 — Module Agenda événementiel (10-12h)

### Backend

- [ ] App `events` créée
- [ ] Modèles `EventCategory`, `Event` (cf. modèles 04-modeles-donnees.md)
- [ ] Données seed : catégories (Festival, Marché, Sport, Culture, etc.)
- [ ] Admin Django configuré
- [ ] Endpoints API :
  - `GET /api/events/` avec filtres `?from=&to=&category=&commune=`
  - `GET /api/events/<slug>/`
  - `GET /api/events/upcoming/?limit=5`
  - `GET /api/events/calendar/?month=2026-06` pour vue mois
  - `GET /api/event-categories/`
- [ ] Génération .ics côté serveur via lib `icalendar`

### Frontend

- [ ] Page `/agenda` avec 3 modes d'affichage :
  - **Liste** chronologique groupée par jour (default mobile)
  - **Calendrier** mensuel avec pastilles colorées (default desktop)
  - **Carte** géolocalisée avec pins
- [ ] Page détail `/agenda/[slug]` :
  - Hero avec photo, titre, dates
  - Bouton "Ajouter à mon calendrier" → télécharge .ics
  - Carte du lieu (MapLibre mini)
  - Bouton "M'y rendre" (deep link maps)
  - Description riche
  - Sidebar infos pratiques
- [ ] Page `/agenda/categorie/[slug]`
- [ ] Composant `<EventCard>`
- [ ] Composant `<EventCalendar>` (utiliser `react-day-picker`)

### Choix techniques

- Stockage `starts_at` en UTC, affichage en `Europe/Paris`
- `Intl.DateTimeFormat('fr-FR')` pour formatage natif
- `react-day-picker` pour le calendrier (léger, locales)
- `icalendar` Python pour générer les .ics

## Jours 6-7 — Module Annuaire commerçants (10-12h)

### Backend

- [ ] App `directory` créée
- [ ] Modèles `BusinessCategory` (hiérarchique), `Business` (cf. 04-modeles-donnees.md)
- [ ] Données seed : arborescence catégories (Restauration, Commerces, Artisanat, etc.)
- [ ] Admin Django configuré (avec inline pour photos, validation horaires, etc.)
- [ ] Endpoints API :
  - `GET /api/businesses/` avec filtres
  - `GET /api/businesses/<slug>/`
  - `GET /api/businesses/nearby/?lat=&lng=&radius=`
  - `GET /api/business-categories/` arbre hiérarchique
- [ ] Vue PostGIS pour la requête `nearby` :

```python
class BusinessNearbyView(APIView):
    def get(self, request):
        lat = float(request.query_params['lat'])
        lng = float(request.query_params['lng'])
        radius_km = float(request.query_params.get('radius', 5))

        user_location = Point(lng, lat, srid=4326)
        businesses = (
            Business.objects
            .filter(is_published=True)
            .annotate(distance=Distance('location', user_location))
            .filter(distance__lte=radius_km * 1000)
            .order_by('distance')[:50]
        )
        return Response(BusinessSerializer(businesses, many=True).data)
```

### Frontend

- [ ] Page `/annuaire` :
  - Barre de recherche
  - Filtres latéraux (catégorie, commune, ouvert maintenant)
  - Vue grille des fiches
  - Bouton "Voir sur la carte"
  - Pagination
  - Mise en avant Premium (badge, ordre privilégié)
- [ ] Page détail `/annuaire/[slug]` :
  - Hero (logo, photo couverture, badge si Premium)
  - Bloc infos pratiques (adresse + carte mini, téléphone clic-to-call, email, site, horaires avec indicateur "ouvert maintenant")
  - Galerie photos (lightbox)
  - Description longue
  - Réseaux sociaux
  - Bouton sticky "M'y rendre"
  - Articles du média mentionnant ce commerce
  - Suggestions autres commerces
- [ ] Page `/annuaire/categorie/[slug]`
- [ ] Page `/annuaire/commune/[slug]`
- [ ] Composant `<BusinessCard>`
- [ ] Helper `isOpenNow(opening_hours, seasonal_closures)` côté client

### "Ouvert maintenant" côté client

```typescript
function isOpenNow(openingHours, seasonalClosures): boolean {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  for (const closure of seasonalClosures) {
    if (today >= closure.from && today <= closure.to) return false;
  }

  const dayName = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][now.getDay()];
  const todayHours = openingHours[dayName] || [];
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return todayHours.some(slot => {
    const [openH, openM] = slot.open.split(':').map(Number);
    const [closeH, closeM] = slot.close.split(':').map(Number);
    return currentMinutes >= (openH * 60 + openM) && currentMinutes <= (closeH * 60 + closeM);
  });
}
```

## Jour 8 — Carte interactive globale (5-6h)

### Choix : MapLibre GL JS + tuiles MapTiler

- Free tier MapTiler : 100 000 requêtes/mois, largement suffisant
- Style perso possible (carte aux couleurs camarguaises)
- Clustering performant en mobile

### Page `/carte`

- [ ] Affichage de tous les commerces (icônes par catégorie)
- [ ] Affichage des événements à venir (icônes calendrier datés)
- [ ] Affichage de lieux d'intérêt (issus d'articles avec location)
- [ ] Filtres en overlay : toggle types, par commune, par catégorie
- [ ] Géolocalisation utilisateur ("Centrer sur ma position")
- [ ] Clustering automatique selon le zoom
- [ ] Popups au clic avec lien vers la page détail

### Composants

- [ ] `<MainMap>` wrapper MapLibre
- [ ] `<MapPopup>` pour les fiches dans la carte
- [ ] `<MapFilters>` overlay de filtres
- [ ] Hooks `useMapLibre`, `useMarkers`

## Jour 9 — Newsletter + Analytics RGPD (5-6h)

### Brevo (Newsletter)

- [ ] App `newsletter` créée
- [ ] Modèle `NewsletterSubscriber`
- [ ] Service Brevo (subscribe, unsubscribe, send_campaign)
- [ ] Composant inscription (footer + bas d'article + page dédiée `/newsletter`)
- [ ] Email de bienvenue automatique
- [ ] Page de désinscription one-click conforme RGPD

### Plausible Analytics

Deux options :

**Option A : Plausible Cloud** (~9 €/mois) — plus simple, à déployer en 5 minutes
**Option B : Auto-hébergement** (gratuit) — Docker sur le VPS, 30 minutes de setup

- [ ] Choix : Auto-hébergé pour rester gratuit, sauf si trop de friction
- [ ] Installation Plausible (community edition) en Docker
- [ ] Tracking script intégré dans le layout Next.js
- [ ] Custom events sur :
  - Vue de fiche commerçant
  - Clic phone, email, site
  - Inscription newsletter
  - Vue d'événement
  - Clic sur encart pub (anticipation sprint 3)
- [ ] Incrément côté Django du compteur `view_count` sur fiches commerçants (pour stats annonceur ultérieures)

## Jour 10 — Polish + déploiement (5-6h)

### Checklist finale

- [ ] Lighthouse score > 90 partout sur les pages clés
- [ ] Test parcours complet :
  - Visiteur arrive
  - Lit un article
  - Consulte agenda
  - Trouve un événement, l'ajoute à son calendrier
  - Cherche un commerçant
  - Appelle le commerçant via la fiche
  - S'inscrit à la newsletter
- [ ] Test diffusion Facebook : publier 2 articles tests, vérifier preview FB
- [ ] Test PWA Android Chrome ET iOS Safari
- [ ] Test responsive 320px, 768px, 1440px
- [ ] Mentions légales, PP, CGU finalisées
- [ ] Soumission sitemap Search Console et Bing
- [ ] Tests de charge (1000 articles, 200 events, 500 commerces seed)
- [ ] Backup automatique configuré
- [ ] Monitoring uptime (UptimeRobot)
- [ ] Documentation interne mise à jour

## Livrables fin de sprint 2

✅ PWA performante, SEO-friendly, riche
✅ Articles publiés en un clic, diffusés sur Facebook automatiquement
✅ Agenda événementiel avec carte
✅ Annuaire commerçants détaillé
✅ Carte interactive globale du territoire
✅ Newsletter en place
✅ Analytics qui collectent les données pour négocier avec les annonceurs

## Vous N'AVEZ PAS encore

- ❌ Affichage d'encarts publicitaires (sprint 3)
- ❌ Espace annonceur self-service (sprint 4)
- ❌ Notifications push (sprint 5)
- ❌ Contributions citoyennes (sprint 5)

## Risques et points d'attention

- **Meta App Review en attente** : si rejet, prévoir 3-5j de plus → ne pas bloquer le déploiement
- **Quota MapTiler** : surveiller la consommation pour ne pas exploser le free tier
- **Performance carte** : avec 500+ markers, vérifier le clustering, sinon paginer
- **Volume images** : optimiser dès le départ (WebP/AVIF, srcset, lazy loading)
- **Newsletter compliance** : double opt-in obligatoire, mention RGPD, désinscription en 1 clic

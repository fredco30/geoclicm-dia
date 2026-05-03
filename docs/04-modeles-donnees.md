# 04 — Modèles de données Django

Tous les modèles principaux du projet, à créer au fil des sprints. Conserver dès le sprint 1 les champs anticipant les sprints suivants pour éviter les migrations pénibles.

## App `core`

### User (custom)

```python
class User(AbstractUser):
    """Utilisateur custom — toujours créer dès le début."""
    role = models.CharField(
        max_length=20,
        choices=[
            ('reader', 'Lecteur'),
            ('advertiser', 'Annonceur'),
            ('editor', 'Rédacteur'),
            ('admin', 'Administrateur'),
        ],
        default='reader',
    )
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', blank=True, null=True)
    is_email_verified = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### Commune

```python
class Commune(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    insee_code = models.CharField(max_length=5, unique=True)
    postal_codes = models.JSONField(default=list)  # plusieurs CP possibles
    
    department = models.CharField(max_length=3)  # "30" ou "34"
    
    # Centroïde + emprise géographique
    location = models.PointField(srid=4326)
    bbox = models.PolygonField(srid=4326, null=True, blank=True)
    
    # SEO
    description = models.TextField(blank=True)
    short_description = models.CharField(max_length=200, blank=True)
    cover_image = models.ImageField(upload_to='communes/', blank=True, null=True)
    
    # Hiérarchie
    intercommunalite = models.CharField(max_length=150, blank=True)
    
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveIntegerField(default=0)
```

### Media

```python
class Media(models.Model):
    """Bibliothèque média mutualisée (articles, fiches, événements)."""
    file = models.ImageField(upload_to='media/%Y/%m/')
    title = models.CharField(max_length=200, blank=True)
    alt_text = models.CharField(max_length=200, blank=True)
    caption = models.CharField(max_length=300, blank=True)
    credit = models.CharField(max_length=150, blank=True)  # ex: "© Le Camarguais 2026"
    
    # Géoloc optionnelle (utile pour archives photo localisées)
    location = models.PointField(srid=4326, null=True, blank=True)
    taken_at = models.DateField(null=True, blank=True)  # date de prise de vue
    
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

## App `editorial`

### Category

```python
class Category(models.Model):
    name = models.CharField(max_length=80)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=7, default='#1a4d6e')
    icon = models.CharField(max_length=50, blank=True)  # Lucide icon name
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
```

Catégories suggérées initiales :
- Mémoire vivante
- Patrimoine
- Pêche et traditions
- Portraits
- Reportages
- Archives photos
- Événements
- Bons plans
- Tribune libre

### Tag

```python
class Tag(models.Model):
    name = models.CharField(max_length=50)
    slug = models.SlugField(unique=True)
```

### Article

```python
class Article(models.Model):
    ARTICLE_TYPES = [
        ('news', 'Actualité'),
        ('memory', 'Mémoire vivante'),
        ('portrait', 'Portrait'),
        ('reportage', 'Reportage'),
        ('archive', 'Archive photo'),
        ('guide', 'Guide thématique'),
        ('sponsored', 'Contenu partenaire'),
    ]
    
    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('scheduled', 'Programmé'),
        ('published', 'Publié'),
        ('archived', 'Archivé'),
    ]
    
    # Identité
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=220)
    chapeau = models.TextField(max_length=300)
    body = models.TextField()  # Markdown
    
    # Médias
    cover_image = models.ImageField(upload_to='articles/covers/%Y/%m/')
    gallery = models.ManyToManyField('core.Media', blank=True, related_name='articles')
    
    # Classification
    category = models.ForeignKey(Category, on_delete=models.PROTECT)
    tags = models.ManyToManyField(Tag, blank=True)
    article_type = models.CharField(max_length=20, choices=ARTICLE_TYPES, default='news')
    
    # Géoloc et territoire
    location = models.PointField(srid=4326, null=True, blank=True)
    commune = models.ForeignKey('core.Commune', null=True, blank=True, on_delete=models.SET_NULL)
    
    # Workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    is_featured = models.BooleanField(default=False)
    author = models.ForeignKey('core.User', on_delete=models.PROTECT, related_name='articles')
    published_at = models.DateTimeField(null=True, blank=True)
    
    # Diffusion (sprint 2)
    auto_publish_to_facebook = models.BooleanField(default=True)
    facebook_post_id = models.CharField(max_length=100, blank=True)
    facebook_published_at = models.DateTimeField(null=True, blank=True)
    
    # Sponsoring (anticipation)
    sponsor = models.ForeignKey('directory.Business', null=True, blank=True, on_delete=models.SET_NULL)
    sponsor_disclosure = models.CharField(max_length=200, blank=True)
    
    # SEO
    meta_title = models.CharField(max_length=70, blank=True)
    meta_description = models.CharField(max_length=160, blank=True)
    
    # Stats agrégées (mises à jour async)
    view_count = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-published_at']
        indexes = [
            models.Index(fields=['status', '-published_at']),
            models.Index(fields=['category', '-published_at']),
            models.Index(fields=['commune', '-published_at']),
        ]
```

## App `events`

### EventCategory

```python
class EventCategory(models.Model):
    name = models.CharField(max_length=80)
    slug = models.SlugField(unique=True)
    icon = models.CharField(max_length=50, blank=True)
    color = models.CharField(max_length=7, default='#1a4d6e')
    sort_order = models.PositiveIntegerField(default=0)
```

Catégories suggérées : Festival, Marché, Sport, Culture, Tradition camarguaise, Concert, Exposition, Conférence, Famille, Gastronomie.

### Event

```python
class Event(models.Model):
    STATUS_CHOICES = [
        ('draft', 'Brouillon'),
        ('published', 'Publié'),
        ('cancelled', 'Annulé'),
        ('postponed', 'Reporté'),
    ]
    
    SOURCE_CHOICES = [
        ('manual', 'Saisie manuelle'),
        ('partner', 'Partenaire'),
        ('opendata', 'Open Data'),
        ('advertiser', 'Annonceur'),
    ]
    
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=220)
    description = models.TextField()
    short_description = models.CharField(max_length=200)
    cover_image = models.ImageField(upload_to='events/%Y/%m/')
    
    category = models.ForeignKey(EventCategory, on_delete=models.PROTECT)
    
    # Temporalité
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    is_all_day = models.BooleanField(default=False)
    is_recurring = models.BooleanField(default=False)
    recurrence_rule = models.CharField(max_length=200, blank=True)  # iCal RRULE
    
    # Lieu
    venue_name = models.CharField(max_length=150)
    address = models.CharField(max_length=255)
    location = models.PointField(srid=4326)
    commune = models.ForeignKey('core.Commune', on_delete=models.PROTECT)
    
    # Infos pratiques
    price = models.CharField(max_length=100, blank=True)  # "Gratuit", "5€", "10-15€"
    price_value = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    booking_url = models.URLField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    contact_email = models.EmailField(blank=True)
    organizer = models.CharField(max_length=150, blank=True)
    
    # Workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    is_featured = models.BooleanField(default=False)
    source = models.CharField(max_length=20, choices=SOURCE_CHOICES, default='manual')
    
    # Liaison annonceur (sprint 4+)
    business = models.ForeignKey('directory.Business', null=True, blank=True, on_delete=models.SET_NULL)
    is_sponsored = models.BooleanField(default=False)
    
    created_by = models.ForeignKey('core.User', on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['starts_at']
        indexes = [
            models.Index(fields=['starts_at', 'status']),
            models.Index(fields=['commune', 'starts_at']),
            models.Index(fields=['category', 'starts_at']),
        ]
```

## App `directory`

### BusinessCategory (hiérarchique)

```python
class BusinessCategory(models.Model):
    name = models.CharField(max_length=80)
    slug = models.SlugField(unique=True)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.PROTECT, related_name='children')
    icon = models.CharField(max_length=50)
    description = models.TextField(blank=True)
    sort_order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    # Mapping vers schema.org pour SEO
    schema_type = models.CharField(max_length=50, default='LocalBusiness')
    # Restaurant, Store, LodgingBusiness, etc.
```

Hiérarchie suggérée :
- Restauration (Restaurants, Bars, Cafés, Glaciers, Food trucks)
- Commerces alimentaires (Boulangeries, Poissonneries, Primeurs, Caves, Fromagers)
- Artisanat (Maçonnerie, Plomberie, Électricité, Peinture, Menuiserie)
- Bien-être (Coiffure, Esthétique, Massage, Sport)
- Mode et déco (Vêtements, Bijoux, Décoration, Antiquités)
- Loisirs (Locations bateaux, École voile, Manèges, Excursions)
- Hébergement (Hôtels, Campings, Locations saisonnières, Chambres d'hôtes)
- Services (Auto, Banque, Assurance, Immobilier, Santé)

### Business

```python
class Business(models.Model):
    PLAN_CHOICES = [
        ('free', 'Gratuit'),
        ('basic', 'Basic'),
        ('premium', 'Premium'),
    ]
    
    # Identité
    name = models.CharField(max_length=150)
    slug = models.SlugField(unique=True, max_length=180)
    legal_name = models.CharField(max_length=200, blank=True)
    siret = models.CharField(max_length=14, blank=True)
    
    # Classification
    category = models.ForeignKey(BusinessCategory, on_delete=models.PROTECT, related_name='businesses')
    secondary_categories = models.ManyToManyField(
        BusinessCategory,
        related_name='secondary_businesses',
        blank=True,
    )
    
    # Descriptions
    short_description = models.CharField(max_length=200)
    description = models.TextField()
    specialties = models.JSONField(default=list, blank=True)
    
    # Médias
    logo = models.ImageField(upload_to='businesses/logos/', blank=True, null=True)
    cover_image = models.ImageField(upload_to='businesses/covers/', blank=True, null=True)
    photos = models.ManyToManyField('core.Media', blank=True, related_name='businesses')
    
    # Localisation
    address = models.CharField(max_length=255)
    address_complement = models.CharField(max_length=255, blank=True)
    postal_code = models.CharField(max_length=10)
    city = models.CharField(max_length=100)
    location = models.PointField(srid=4326)
    commune = models.ForeignKey('core.Commune', on_delete=models.PROTECT)
    
    # Contact
    phone = models.CharField(max_length=20, blank=True)
    mobile = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    
    # Réseaux sociaux
    facebook_url = models.URLField(blank=True)
    instagram_url = models.URLField(blank=True)
    tiktok_url = models.URLField(blank=True)
    
    # Horaires (JSON pour flexibilité)
    opening_hours = models.JSONField(default=dict, blank=True)
    seasonal_closures = models.JSONField(default=list, blank=True)
    
    # Modèle commercial
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default='free')
    plan_starts_at = models.DateTimeField(null=True, blank=True)
    plan_ends_at = models.DateTimeField(null=True, blank=True)
    stripe_customer_id = models.CharField(max_length=100, blank=True)
    stripe_subscription_id = models.CharField(max_length=100, blank=True)
    
    # Liaison utilisateur (sprint 4+)
    owner = models.ForeignKey('core.User', null=True, blank=True, on_delete=models.SET_NULL, related_name='businesses')
    is_claimed = models.BooleanField(default=False)
    
    # Workflow
    is_published = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    
    # SEO
    meta_description = models.CharField(max_length=160, blank=True)
    
    # Stats agrégées
    view_count = models.PositiveIntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['commune', 'category']),
            models.Index(fields=['is_published', 'plan']),
            models.Index(fields=['plan', 'plan_ends_at']),
        ]
```

Format `opening_hours` :

```json
{
  "monday": [{"open": "09:00", "close": "12:30"}, {"open": "14:00", "close": "19:00"}],
  "tuesday": [{"open": "09:00", "close": "12:30"}, {"open": "14:00", "close": "19:00"}],
  "wednesday": [],
  "thursday": [{"open": "09:00", "close": "19:00"}],
  "friday": [{"open": "09:00", "close": "19:00"}],
  "saturday": [{"open": "10:00", "close": "18:00"}],
  "sunday": []
}
```

Format `seasonal_closures` :

```json
[
  {"from": "2026-01-05", "to": "2026-02-15", "reason": "Fermeture annuelle"},
  {"from": "2026-12-25", "to": "2026-12-26", "reason": "Noël"}
]
```

## App `ads`

### AdCampaign

```python
class AdCampaign(models.Model):
    PLACEMENT_CHOICES = [
        ('home_hero', 'Page d\'accueil — Hero'),
        ('home_sidebar', 'Page d\'accueil — Sidebar'),
        ('article_inline', 'Article — Inline'),
        ('article_sidebar', 'Article — Sidebar'),
        ('directory_top', 'Annuaire — Top'),
        ('directory_inline', 'Annuaire — Inline'),
        ('agenda_top', 'Agenda — Top'),
        ('newsletter', 'Newsletter'),
    ]
    
    business = models.ForeignKey('directory.Business', on_delete=models.CASCADE, related_name='campaigns')
    name = models.CharField(max_length=150)
    
    placement = models.CharField(max_length=30, choices=PLACEMENT_CHOICES)
    
    # Créa
    image = models.ImageField(upload_to='ads/')
    headline = models.CharField(max_length=80, blank=True)
    cta_text = models.CharField(max_length=30, blank=True)
    target_url = models.URLField()
    
    # Ciblage
    target_communes = models.ManyToManyField('core.Commune', blank=True)
    target_categories = models.ManyToManyField('directory.BusinessCategory', blank=True)
    
    # Période
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    
    # Budget / formule
    price_paid = models.DecimalField(max_digits=8, decimal_places=2)
    
    # Stats
    impression_count = models.PositiveIntegerField(default=0)
    click_count = models.PositiveIntegerField(default=0)
    
    is_active = models.BooleanField(default=True)
    is_paid = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
```

### AdImpression / AdClick (analytics)

À matérialiser avec parcimonie pour ne pas exploser la table. Idéal : aggrégation horaire dans une table de stats par campagne.

## App `advertisers`

### Subscription

```python
class Subscription(models.Model):
    STATUS_CHOICES = [
        ('trialing', 'Période d\'essai'),
        ('active', 'Active'),
        ('past_due', 'Impayé'),
        ('cancelled', 'Annulée'),
        ('unpaid', 'Non payée'),
    ]
    
    business = models.ForeignKey('directory.Business', on_delete=models.CASCADE, related_name='subscriptions')
    plan = models.CharField(max_length=20)
    
    stripe_subscription_id = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    
    started_at = models.DateTimeField()
    current_period_start = models.DateTimeField()
    current_period_end = models.DateTimeField()
    cancelled_at = models.DateTimeField(null=True, blank=True)
    
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### Invoice

```python
class Invoice(models.Model):
    business = models.ForeignKey('directory.Business', on_delete=models.PROTECT, related_name='invoices')
    
    invoice_number = models.CharField(max_length=20, unique=True)
    stripe_invoice_id = models.CharField(max_length=100, blank=True)
    
    amount_ht = models.DecimalField(max_digits=8, decimal_places=2)
    tva_amount = models.DecimalField(max_digits=8, decimal_places=2)
    amount_ttc = models.DecimalField(max_digits=8, decimal_places=2)
    
    issued_at = models.DateField()
    due_at = models.DateField()
    paid_at = models.DateField(null=True, blank=True)
    
    pdf_file = models.FileField(upload_to='invoices/%Y/%m/', blank=True)
```

## App `distribution`

### FacebookCredentials

```python
class FacebookCredentials(models.Model):
    """Stockage chiffré du Page Access Token."""
    page_id = models.CharField(max_length=50, unique=True)
    page_name = models.CharField(max_length=150)
    access_token = models.TextField()  # à chiffrer (django-cryptography)
    granted_by = models.ForeignKey('core.User', on_delete=models.PROTECT)
    
    refreshed_at = models.DateTimeField(auto_now=True)
    last_health_check = models.DateTimeField(null=True, blank=True)
    is_valid = models.BooleanField(default=True)
```

### DistributionLog

```python
class DistributionLog(models.Model):
    article = models.ForeignKey('editorial.Article', on_delete=models.CASCADE, related_name='distribution_logs')
    platform = models.CharField(max_length=20)  # 'facebook', 'instagram', 'twitter'
    
    external_id = models.CharField(max_length=100, blank=True)
    success = models.BooleanField()
    error_message = models.TextField(blank=True)
    
    attempted_at = models.DateTimeField(auto_now_add=True)
```

## App `newsletter`

### NewsletterSubscriber

```python
class NewsletterSubscriber(models.Model):
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100, blank=True)
    
    is_active = models.BooleanField(default=True)
    confirmed_at = models.DateTimeField(null=True, blank=True)
    unsubscribed_at = models.DateTimeField(null=True, blank=True)
    
    # Sync Brevo
    brevo_contact_id = models.CharField(max_length=50, blank=True)
    
    # Préférences
    preferred_communes = models.ManyToManyField('core.Commune', blank=True)
    preferred_categories = models.ManyToManyField('editorial.Category', blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    consent_ip = models.GenericIPAddressField(null=True, blank=True)
```

## Notes globales

- **Toujours** indexer les champs filtrés/triés fréquemment
- **Toujours** un `created_at` et `updated_at` sur les modèles métier
- Privilégier `on_delete=PROTECT` pour les FK structurantes
- `on_delete=SET_NULL` pour les FK optionnelles (ex: owner d'un Business)
- `on_delete=CASCADE` uniquement pour les enfants logiques d'un parent
- JSONField pour les structures variables (horaires, recurrence, specialties)
- Toujours migrer avec un nom de migration explicite (`makemigrations -n add_business_subscription`)

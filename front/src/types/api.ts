/**
 * Types correspondant aux serializers Django REST.
 *
 * Si tu modifies un serializer côté back, sync ce fichier en parallèle.
 * À terme : auto-génération via openapi-typescript depuis /api/schema/.
 */

export type ImageVariants = {
  thumbnail: string | null;
  medium: string | null;
  large: string | null;
  original: string | null;
};

export type Author = {
  id: number;
  username: string;
  full_name: string;
  avatar: string | null;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  description: string;
  color: string;
  icon: string;
  sort_order: number;
};

export type Tag = {
  id: number;
  name: string;
  slug: string;
};

export type Commune = {
  id: number;
  name: string;
  slug: string;
  insee_code: string;
  postal_codes: string[];
  department: string;
  intercommunalite: string;
  short_description: string;
  description: string;
  cover_image: ImageVariants | null;
  is_active: boolean;
  is_coastal: boolean;
  sort_order: number;
};

export type ArticleType = "reportage" | "portrait" | "breve" | "tribune" | "dossier";

export type ArticleStatus = "draft" | "scheduled" | "published" | "archived";

export type SponsorMini = {
  id: number;
  name: string;
  slug: string;
  logo: ImageVariants | null;
};

export type SponsorDetail = SponsorMini & {
  short_description: string;
};

export type ArticleListItem = {
  id: number;
  title: string;
  slug: string;
  chapeau: string;
  cover_image: ImageVariants | null;
  category: Category;
  commune: string | null;
  article_type: ArticleType;
  is_featured: boolean;
  status: ArticleStatus;
  author: Author;
  published_at: string | null;
  updated_at: string;
  sponsor: SponsorMini | null;
};

export type ArticleDetail = {
  id: number;
  title: string;
  slug: string;
  chapeau: string;
  body: string;
  cover_image: ImageVariants | null;
  gallery: Media[];
  category: Category;
  tags: Tag[];
  commune: Commune | null;
  location: GeoJSONPoint | null;
  article_type: ArticleType;
  status: ArticleStatus;
  is_featured: boolean;
  author: Author;
  published_at: string | null;
  sponsor: SponsorDetail | null;
  sponsor_disclosure: string;
  meta_title: string;
  meta_description: string;
  view_count: number;
  created_at: string;
  updated_at: string;
};

export type Media = {
  id: number;
  file: ImageVariants | null;
  title: string;
  alt_text: string;
  caption: string;
  credit: string;
  taken_at: string | null;
  created_at: string;
};

export type GeoJSONPoint = {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
};

export type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type SearchResponse = {
  count: number;
  query: string;
  results: ArticleListItem[];
};

// ============================================================================
// Agenda et marchés
// ============================================================================

export type EventKind = "event" | "market";
export type EventStatus = "draft" | "published" | "cancelled" | "archived";
export type EventOccurrenceStatus = "scheduled" | "cancelled" | "postponed";

export type EventCategory = {
  id: number;
  name: string;
  slug: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
};

export type EventOccurrence = {
  id: number;
  starts_at: string;
  ends_at: string;
  is_all_day: boolean;
  status: EventOccurrenceStatus;
  note: string;
};

export type EventListItem = {
  id: number;
  title: string;
  slug: string;
  short_description: string;
  cover_image: ImageVariants | null;
  kind: EventKind;
  category: EventCategory;
  commune_name: string;
  commune_slug: string;
  venue_name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  price: string;
  organizer: string;
  official_url: string;
  source_label: string | null;
  source_cover_image: ImageVariants | null;
  status: EventStatus;
  is_featured: boolean;
  next_occurrence: EventOccurrence | null;
  updated_at: string;
};

export type EventDetail = EventListItem & {
  description: string;
  booking_url: string;
  contact_phone: string;
  contact_email: string;
  organizer: string;
  official_url: string;
  business_slug: string | null;
  business_name: string | null;
  category_id: number;
  commune_id: number;
  business_id: number | null;
  occurrences: EventOccurrence[];
  meta_title: string;
  meta_description: string;
  published_at: string | null;
  created_at: string;
  source_image_url: string;
  source_image_hash: string;
  image_credit: string;
  source_sync_enabled: boolean;
};

export type EventSource = {
  id: number;
  label: string;
  connector: "json_ld" | "crawl4ai" | "ics";
  source_url: string;
  website_url: string;
  commune: number | null;
  commune_name: string | null;
  default_category: number | null;
  default_category_name: string | null;
  default_kind: EventKind;
  max_pages: number;
  is_active: boolean;
  sync_images: boolean;
  rights_note: string;
  last_synced_at: string | null;
  last_status: "never" | "running" | "ok" | "partial" | "error";
  last_error: string;
  pending_count: number;
  crawl4ai_available: boolean;
};

export type EventImportCandidate = {
  id: number;
  source: number;
  source_label: string;
  source_url: string;
  extraction_method: "json_ld" | "mistral" | "ics";
  title: string;
  short_description: string;
  description: string;
  image_url: string;
  image_credit: string;
  starts_at: string | null;
  ends_at: string | null;
  venue_name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  price: string;
  booking_url: string;
  organizer: string;
  commune: number | null;
  commune_name: string | null;
  category: number | null;
  category_name: string | null;
  kind: EventKind;
  status: "pending" | "imported" | "rejected" | "duplicate" | "invalid";
  validation_errors: string[];
  extraction_evidence: string[];
  generation_id: number | null;
  matched_event_slug: string | null;
  first_seen_at: string;
  last_seen_at: string;
};

// ============================================================================
// Découvrir
// ============================================================================

export type PlaceStatus = "draft" | "published" | "archived";

export type PlaceCategory = {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
  is_active: boolean;
};

export type PlaceListItem = {
  id: number;
  title: string;
  slug: string;
  short_description: string;
  cover_image: ImageVariants | null;
  category: PlaceCategory;
  commune_name: string;
  commune_slug: string;
  latitude: number | null;
  longitude: number | null;
  duration: string;
  difficulty: string;
  status: PlaceStatus;
  is_featured: boolean;
  sort_order: number;
  updated_at: string;
};

export type PlaceRelatedItem = {
  id: number;
  title?: string;
  name?: string;
  slug: string;
  short_description: string;
};

export type PlaceDetail = PlaceListItem & {
  description: string;
  address: string;
  accessibility: string;
  best_season: string;
  practical_info: string;
  official_url: string;
  category_id: number;
  commune_id: number;
  related_articles: PlaceRelatedItem[];
  related_businesses: PlaceRelatedItem[];
  related_events: PlaceRelatedItem[];
  related_article_ids: number[];
  related_business_ids: number[];
  related_event_ids: number[];
  meta_title: string;
  meta_description: string;
  published_at: string | null;
  created_at: string;
};

// ============================================================================
// Assistant IA (Mistral + RAG via /api/assistant/ask/)
// ============================================================================

export type AssistantLanguage = "fr" | "en" | "de" | "it" | "es" | "nl";

export type AssistantSourceKind =
  | "business"
  | "article"
  | "mairie"
  | "ot"
  | "wikipedia"
  | "datatourisme"
  | "osm"
  | "tile";

export type AssistantCitation = {
  chunk_id: number;
  title: string;
  source_url: string;
  source_kind: AssistantSourceKind;
  is_premium: boolean;
  /** Latitude WGS84 (string décimale côté API). null si non géolocalisé. */
  latitude?: string | null;
  /** Longitude WGS84 (string décimale côté API). null si non géolocalisé. */
  longitude?: string | null;
};

export type AssistantAskRequest = {
  question: string;
  session_id: string;
  language?: AssistantLanguage;
  commune_slug?: string;
};

export type AssistantAskResponse = {
  answer: string;
  citations: AssistantCitation[];
  session_id: string;
  language: AssistantLanguage;
};

// ============================================================================
// Directory (commerçants)
// ============================================================================

export type BusinessPlan = "free" | "basic" | "premium";

export type CommuneMini = {
  id: number;
  name: string;
  slug: string;
  department: string;
};

export type BusinessCategory = {
  id: number;
  name: string;
  slug: string;
  parent: number | null;
  parent_name: string | null;
  icon: string;
  description: string;
  schema_type: string;
};

export type BusinessListItem = {
  id: number;
  name: string;
  slug: string;
  city: string;
  category: number;
  category_name: string;
  commune: number;
  commune_name: string;
  service_areas_count: number;
  latitude: number | null;
  longitude: number | null;
  logo: ImageVariants | null;
  plan: BusinessPlan;
  is_published: boolean;
  is_featured: boolean;
  is_local_producer: boolean;
};

export type BusinessDetail = {
  id: number;
  name: string;
  slug: string;
  legal_name: string;
  category: BusinessCategory;
  secondary_categories: BusinessCategory[];
  short_description: string;
  description: string;
  specialties: string[];
  logo: ImageVariants | null;
  cover_image: ImageVariants | null;
  address: string;
  address_complement: string;
  postal_code: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  commune: number;
  commune_name: string;
  service_areas: CommuneMini[];
  phone: string;
  mobile: string;
  email: string;
  website: string;
  facebook_url: string;
  instagram_url: string;
  tiktok_url: string;
  opening_hours: Record<string, Array<{ open: string; close: string }>>;
  seasonal_closures: Array<{ from: string; to: string; reason: string }>;
  plan: BusinessPlan;
  is_published: boolean;
  is_featured: boolean;
  is_local_producer: boolean;
  meta_description: string;
  view_count: number;
};

// ============================================================================
// Ads (régie publicitaire)
// ============================================================================

export type AdPlacement =
  | "home_hero"
  | "home_sidebar"
  | "article_inline"
  | "article_sidebar"
  | "directory_top"
  | "directory_inline"
  | "agenda_top"
  | "weather_top"
  | "weather_sidebar"
  | "newsletter";

export type AdServeResponse = {
  id: number;
  placement: AdPlacement;
  image: ImageVariants | null;
  headline: string;
  cta_text: string;
  click_url: string;
  business_slug: string;
  business_name: string;
};

// ============================================================================
// Tiles (grille d'accueil — public)
// ============================================================================

export type TileColorPreset =
  | "camargue"
  | "sel"
  | "terre"
  | "mer"
  | "agrume"
  | "olive"
  | "neutre";

export type TileKind = "internal_route" | "external_url" | "module";

export type TileModuleKey = "news" | "weather" | "businesses";

export type TileCommuneMini = {
  id: number;
  name: string;
  slug: string;
};

/**
 * Sous-tuile (enfant) — version simplifiée, pas de récursion.
 */
export type TileChild = {
  id: number;
  label: string;
  icon: string;
  color: TileColorPreset;
  cover_image: string | null;
  kind: TileKind;
  internal_path: string;
  external_url: string;
  module_key: TileModuleKey | "";
  sort_order: number;
  is_active: boolean;
  span_2x: boolean;
  /** URL de destination résolue côté serializer (selon kind). */
  target_url: string;
};

/**
 * Tuile publique (racine) avec sous-tuiles imbriquées.
 */
export type Tile = TileChild & {
  show_on_home: boolean;
  visible_on_communes: TileCommuneMini[];
  has_children: boolean;
  children: TileChild[];
};

// ============================================================================
// Weather (Open-Meteo proxy via /api/weather/<slug>/)
// ============================================================================

export type WeatherCurrent = {
  temperature: number | null;
  apparent_temperature: number | null;
  humidity: number | null;
  precipitation: number | null;
  weather_code: number | null;
  wind_speed: number | null;
  wind_direction: number | null;
  wind_gusts: number | null;
  is_day: boolean;
  uv_index: number | null;
};

export type WeatherHourlyEntry = {
  time: string;
  temperature: number | null;
  precipitation_probability: number | null;
  precipitation: number | null;
  weather_code: number | null;
  wind_speed: number | null;
};

export type WeatherDailyEntry = {
  date: string;
  weather_code: number | null;
  temperature_min: number | null;
  temperature_max: number | null;
  sunrise: string | null;
  sunset: string | null;
  uv_index_max: number | null;
  precipitation_sum: number | null;
  precipitation_probability_max: number | null;
  wind_speed_max: number | null;
  wind_gusts_max: number | null;
  wind_direction_dominant: number | null;
};

export type WeatherForecast = {
  current: WeatherCurrent;
  hourly: WeatherHourlyEntry[];
  daily: WeatherDailyEntry[];
};

export type MarineCurrent = {
  wave_height: number | null;
  wave_direction: number | null;
  wave_period: number | null;
  wind_wave_height: number | null;
  swell_wave_height: number | null;
  swell_wave_period: number | null;
};

export type MarineDailyEntry = {
  date: string;
  wave_height_max: number | null;
  wave_direction_dominant: number | null;
  wave_period_max: number | null;
};

export type SwimmingIndicator = "green" | "orange" | "red";

export type WeatherMarine = {
  current: MarineCurrent;
  sea_surface_temperature: number | null;
  swimming_indicator: SwimmingIndicator | null;
  swimming_disclaimer: string;
  daily: MarineDailyEntry[];
};

export type WeatherResponse = {
  commune: {
    slug: string;
    name: string;
    is_coastal: boolean;
    latitude: number;
    longitude: number;
  };
  fetched_at: string;
  forecast: WeatherForecast;
  marine: WeatherMarine | null;
};

// ============================================================================
// Utility (numéros utiles + démarches administratives)
// ============================================================================

export type UsefulContactKind = "useful_number" | "procedure";

export type UsefulContactType =
  | "phone"
  | "url"
  | "email"
  | "address"
  | "info";

export type UsefulContactPublic = {
  id: number;
  kind: UsefulContactKind;
  kind_label: string;
  label: string;
  contact_type: UsefulContactType;
  contact_type_label: string;
  value: string;
  description: string;
  category_label: string;
  commune_slug: string | null;
  commune_name: string | null;
  sort_order: number;
};

export type CurrentUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: "reader" | "advertiser" | "editor" | "admin";
  phone: string;
  avatar: string | null;
  is_email_verified: boolean;
  can_publish: boolean;
  is_superuser: boolean;
  is_staff: boolean;
};

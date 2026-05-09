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

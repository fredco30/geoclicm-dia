/** Types côté admin (back-office). */
import type {
  ArticleStatus,
  ImageVariants,
  UsefulContactKind,
  UsefulContactType,
} from "./api";

// ============================================================================
// Assistant IA — sources à crawler (admin only)
// ============================================================================

export type CrawlSourceKind =
  | "business"
  | "article"
  | "mairie"
  | "ot"
  | "wikipedia"
  | "datatourisme"
  | "osm"
  | "tile";

export type CrawlSourceStatus = "" | "ok" | "error" | "partial";

export type AdminCrawlSource = {
  id: number;
  label: string;
  kind: CrawlSourceKind;
  kind_label: string;
  seed_url: string;
  max_depth: number;
  is_active: boolean;
  commune: number | null;
  commune_name: string | null;
  commune_slug: string | null;
  last_crawled_at: string | null;
  last_status: CrawlSourceStatus;
  last_error: string;
  chunk_count: number;
  created_at: string;
  updated_at: string;
};

export type AdminCrawlSourcePayload = {
  label: string;
  kind: CrawlSourceKind;
  seed_url: string;
  max_depth: number;
  is_active: boolean;
  commune: number | null;
};


// ============================================================================
// Tiles (grille d'accueil)
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

type TileCommuneMini = {
  id: number;
  name: string;
  slug: string;
};

export type AdminTile = {
  id: number;
  parent: number | null;
  parent_label: string | null;
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
  show_on_home: boolean;
  visible_on_communes: number[];
  visible_on_communes_detail: TileCommuneMini[];
  span_2x: boolean;
  target_url: string;
  has_children: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminTilePayload = {
  parent: number | null;
  label: string;
  icon: string;
  color: TileColorPreset;
  kind: TileKind;
  internal_path: string;
  external_url: string;
  module_key: TileModuleKey | "";
  sort_order: number;
  is_active: boolean;
  show_on_home: boolean;
  visible_on_communes: number[];
  span_2x: boolean;
};


export type AdminUser = {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: "reader" | "advertiser" | "editor" | "admin";
  phone: string;
  is_active: boolean;
  is_staff: boolean;
  is_superuser: boolean;
  is_email_verified: boolean;
  // Nombre de fiches commerce (Business) dont ce user est owner. Annoté côté
  // serializer Django (Count("businesses") sur User). Permet de voir d'un
  // coup d'œil dans la liste les annonceurs sans fiche rattachée vs ceux
  // qui en gèrent une ou plusieurs.
  business_count: number;
  date_joined: string;
  last_login: string | null;
};

/**
 * Compteurs pour les tabs de la page /admin/settings/users.
 * Endpoint : GET /api/users/counts/
 */
export type AdminUserCounts = {
  all: number;
  team: number;
  advertiser: number;
  reader: number;
  inactive: number;
};

export type AdminUserPayload = {
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: AdminUser["role"];
  phone: string;
  is_active: boolean;
  is_staff: boolean;
  password?: string;
};

export type AdminBusinessCategory = {
  id: number;
  name: string;
  slug: string;
  parent: number | null;
  parent_name: string | null;
  icon: string;
  description: string;
  schema_type: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminBusinessCategoryPayload = {
  name: string;
  parent: number | null;
  icon: string;
  description: string;
  schema_type: string;
  sort_order: number;
  is_active: boolean;
};

export type BusinessPlan = "free" | "basic" | "premium";

export type CommuneMini = {
  id: number;
  name: string;
  slug: string;
  department: string;
};

export type AdminBusinessListItem = {
  id: number;
  name: string;
  slug: string;
  city: string;
  category: number;
  category_name: string;
  commune: number;
  commune_name: string;
  service_areas_count: number;
  owner: number | null;
  owner_username: string | null;
  logo: ImageVariants | null;
  plan: BusinessPlan;
  is_published: boolean;
  is_featured: boolean;
  is_claimed: boolean;
  created_at: string;
  updated_at: string;
};

// Liste des comptes — vue admin /admin/settings/users.
// business_count est annoté côté serializer (Count("businesses") sur User).

export type AdminBusinessDetail = Omit<AdminBusinessListItem, "category"> & {
  // Le serializer detail renvoie l'objet complet (BusinessCategorySerializer),
  // pas seulement l'id comme dans le list serializer.
  category: AdminBusinessCategory;
  legal_name: string;
  siret: string;
  secondary_categories: AdminBusinessCategory[];
  short_description: string;
  description: string;
  specialties: string[];
  cover_image: ImageVariants | null;
  address: string;
  address_complement: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
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
  plan_starts_at: string | null;
  plan_ends_at: string | null;
  meta_description: string;
  view_count: number;
};

export type AdminBusinessPayload = {
  name: string;
  legal_name: string;
  siret: string;
  category: number | null;
  secondary_categories: number[];
  short_description: string;
  description: string;
  specialties: string[];
  address: string;
  address_complement: string;
  postal_code: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  commune: number | null;
  service_areas: number[];
  phone: string;
  mobile: string;
  email: string;
  website: string;
  facebook_url: string;
  instagram_url: string;
  tiktok_url: string;
  opening_hours: Record<string, unknown>;
  seasonal_closures: unknown[];
  plan: BusinessPlan;
  plan_starts_at: string | null;
  plan_ends_at: string | null;
  is_claimed: boolean;
  is_published: boolean;
  is_featured: boolean;
  meta_description: string;
};

// ============================================================================
// Ads (régie publicitaire — back-office)
// ============================================================================

import type { AdPlacement, ImageVariants as IV } from "./api";

export type AdminAdCampaignListItem = {
  id: number;
  name: string;
  business: number;
  business_name: string;
  placement: AdPlacement;
  placement_label: string;
  image: IV | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  is_paid: boolean;
  impression_count: number;
  click_count: number;
  click_through_rate: number;
  created_at: string;
};

export type AdminAdCampaignDetail = AdminAdCampaignListItem & {
  headline: string;
  cta_text: string;
  target_url: string;
  target_communes: number[];
  target_categories: number[];
  price_paid: string;
  updated_at: string;
};

export type AdminAdCampaignPayload = {
  name: string;
  business: number | null;
  placement: AdPlacement;
  headline: string;
  cta_text: string;
  target_url: string;
  target_communes: number[];
  target_categories: number[];
  starts_at: string;
  ends_at: string;
  price_paid: string;
  is_active: boolean;
  is_paid: boolean;
};

// ============================================================================
// Editorial — Catégories d'articles (admin)
// ============================================================================

export type AdminArticleCategory = {
  id: number;
  name: string;
  slug: string;
  description: string;
  color: string; // #RRGGBB
  icon: string;
  sort_order: number;
  is_active: boolean;
  article_count: number;
  created_at: string;
  updated_at: string;
};

export type AdminArticleCategoryPayload = {
  name: string;
  /** Optionnel — auto-généré côté Django depuis name si vide. */
  slug?: string;
  description: string;
  color: string;
  icon: string;
  sort_order: number;
  is_active: boolean;
};


// ============================================================================
// IA Assist — génération de contenu (admin & annonceurs)
// ============================================================================

export type AIBusinessDescribeRequest = {
  /** Mode pré-création : nom + catégorie + commune (+ keywords). */
  name?: string;
  category_id?: number | null;
  commune_id?: number | null;
  keywords?: string[];
  /** Mode complétion d'une fiche existante. */
  business_id?: number | null;
  /** Tonalité de la rédaction. */
  tone?: "pro" | "friendly" | "concise";
};

export type AIBusinessFaqItem = { q: string; a: string };

export type AIBusinessDescribeResponse = {
  short_description: string;
  description: string;
  specialties: string[];
  faq: AIBusinessFaqItem[];
  /** Méta : modèle utilisé, coût estimé en EUR (string décimale), id audit. */
  model: string;
  cost_eur: string;
  generation_id: number;
};


// ============================================================================
// Utility (numéros utiles + démarches)
// ============================================================================

export type AdminUsefulContact = {
  id: number;
  kind: UsefulContactKind;
  kind_label: string;
  label: string;
  contact_type: UsefulContactType;
  contact_type_label: string;
  value: string;
  description: string;
  category_label: string;
  commune: number | null;
  commune_name: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminUsefulContactPayload = {
  kind: UsefulContactKind;
  label: string;
  contact_type: UsefulContactType;
  value: string;
  description: string;
  category_label: string;
  commune: number | null;
  sort_order: number;
  is_active: boolean;
};

export type { ArticleStatus };

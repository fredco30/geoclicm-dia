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

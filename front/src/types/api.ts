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
  author: Author;
  published_at: string | null;
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

/** Types côté admin (back-office). */
import type { ArticleStatus, ImageVariants } from "./api";

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
  date_joined: string;
  last_login: string | null;
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

export type AdminBusinessDetail = AdminBusinessListItem & {
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

export type { ArticleStatus };

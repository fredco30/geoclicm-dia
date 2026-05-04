/** Types côté admin (back-office). */
import type { ArticleStatus } from "./api";

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

export type { ArticleStatus };

/**
 * Réglages du site (identité visuelle), modifiables depuis
 * /admin/settings/site. Lecture côté serveur, mise en cache Next (tag
 * « site-settings », invalidé à l'enregistrement).
 */
import { apiGet } from "@/lib/api";

export type SiteSettings = {
  site_name: string;
  tagline: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
  /** Paiement en ligne ouvert (réglage serveur BILLING_ENABLED). */
  billing_enabled: boolean;
  updated_at?: string;
};

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  site_name: "geoclicMédia",
  tagline: "le littoral camarguais",
  logo_url: null,
  primary_color: "#1a4d6e",
  accent_color: "#a8533a",
  billing_enabled: false,
};

const HEX = /^#[0-9a-f]{6}$/i;

/** Couleur sûre à injecter dans du CSS (sinon valeur par défaut). */
export function safeColor(value: string | undefined, fallback: string): string {
  return value && HEX.test(value) ? value : fallback;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const data = await apiGet<SiteSettings>("/api/site-settings/", {
      revalidate: 3600,
      tags: ["site-settings"],
    });
    return {
      ...DEFAULT_SITE_SETTINGS,
      ...data,
      primary_color: safeColor(data.primary_color, DEFAULT_SITE_SETTINGS.primary_color),
      accent_color: safeColor(data.accent_color, DEFAULT_SITE_SETTINGS.accent_color),
    };
  } catch {
    return DEFAULT_SITE_SETTINGS;
  }
}

/**
 * Helpers météo : codes WMO Open-Meteo, rose des vents, formatage.
 *
 * Codes WMO (World Meteorological Organization) tels que renvoyés par Open-Meteo :
 * 0 = ciel clair, 1-3 = ciel partiellement nuageux, 45-48 = brouillard,
 * 51-67 = pluie/bruine, 71-77 = neige, 80-86 = averses, 95-99 = orage.
 *
 * Doc complète : https://open-meteo.com/en/docs#weathervariables
 */
import type { LucideIcon } from "lucide-react";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudHail,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
  Snowflake,
  CloudMoon,
  Moon,
} from "lucide-react";

export type WeatherIconKey =
  | "sun"
  | "moon"
  | "cloud-sun"
  | "cloud-moon"
  | "cloud"
  | "fog"
  | "drizzle"
  | "rain"
  | "hail"
  | "snowflake"
  | "snow"
  | "thunder";

const ICON_MAP: Record<WeatherIconKey, LucideIcon> = {
  sun: Sun,
  moon: Moon,
  "cloud-sun": CloudSun,
  "cloud-moon": CloudMoon,
  cloud: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  hail: CloudHail,
  snowflake: Snowflake,
  snow: CloudSnow,
  thunder: CloudLightning,
};

export function getWeatherIcon(key: WeatherIconKey): LucideIcon {
  return ICON_MAP[key];
}

export function describeWeatherCode(
  code: number | null | undefined,
  isDay: boolean,
): { label: string; iconKey: WeatherIconKey } {
  if (code === null || code === undefined) {
    return { label: "Conditions inconnues", iconKey: "cloud" };
  }

  // Ciel clair / partiellement nuageux
  if (code === 0) return { label: "Ciel clair", iconKey: isDay ? "sun" : "moon" };
  if (code === 1)
    return { label: "Plutôt clair", iconKey: isDay ? "sun" : "moon" };
  if (code === 2)
    return {
      label: "Partiellement nuageux",
      iconKey: isDay ? "cloud-sun" : "cloud-moon",
    };
  if (code === 3) return { label: "Couvert", iconKey: "cloud" };

  // Brouillard
  if (code === 45 || code === 48) return { label: "Brouillard", iconKey: "fog" };

  // Bruine
  if (code === 51) return { label: "Bruine légère", iconKey: "drizzle" };
  if (code === 53) return { label: "Bruine modérée", iconKey: "drizzle" };
  if (code === 55) return { label: "Bruine dense", iconKey: "drizzle" };
  if (code === 56 || code === 57) return { label: "Bruine verglaçante", iconKey: "drizzle" };

  // Pluie
  if (code === 61) return { label: "Pluie faible", iconKey: "rain" };
  if (code === 63) return { label: "Pluie modérée", iconKey: "rain" };
  if (code === 65) return { label: "Pluie forte", iconKey: "rain" };
  if (code === 66 || code === 67) return { label: "Pluie verglaçante", iconKey: "rain" };

  // Neige
  if (code === 71) return { label: "Neige faible", iconKey: "snow" };
  if (code === 73) return { label: "Neige modérée", iconKey: "snow" };
  if (code === 75) return { label: "Neige forte", iconKey: "snow" };
  if (code === 77) return { label: "Grains de neige", iconKey: "snowflake" };

  // Averses
  if (code === 80) return { label: "Averses faibles", iconKey: "rain" };
  if (code === 81) return { label: "Averses modérées", iconKey: "rain" };
  if (code === 82) return { label: "Averses violentes", iconKey: "rain" };
  if (code === 85 || code === 86) return { label: "Averses de neige", iconKey: "snow" };

  // Orages
  if (code === 95) return { label: "Orage", iconKey: "thunder" };
  if (code === 96 || code === 99) return { label: "Orage avec grêle", iconKey: "hail" };

  return { label: "Conditions inconnues", iconKey: "cloud" };
}

const COMPASS = [
  "N", "NNE", "NE", "ENE",
  "E", "ESE", "SE", "SSE",
  "S", "SSO", "SO", "OSO",
  "O", "ONO", "NO", "NNO",
];

/** 360° → "N", "NE", "E"… (rose des vents 16 directions). */
export function degreesToCompass(deg: number | null | undefined): string {
  if (deg === null || deg === undefined) return "—";
  const idx = Math.round(((deg % 360) / 22.5)) % 16;
  return COMPASS[idx];
}

/** Indice UV → libellé OMS (faible/modéré/élevé/très élevé/extrême). */
export function describeUv(uv: number | null | undefined): string {
  if (uv === null || uv === undefined) return "—";
  if (uv < 3) return `${uv.toFixed(0)} faible`;
  if (uv < 6) return `${uv.toFixed(0)} modéré`;
  if (uv < 8) return `${uv.toFixed(0)} élevé`;
  if (uv < 11) return `${uv.toFixed(0)} très élevé`;
  return `${uv.toFixed(0)} extrême`;
}

/** "2026-05-05" → "lundi 5 mai" */
export function formatDayLabel(isoDate: string, isToday: boolean): string {
  if (isToday) return "Aujourd'hui";
  // Parse manuel : la TZ du serveur SSR (VPS en UTC) n'influence pas le rendu.
  const [year, month, day] = isoDate.split("-").map(Number);
  if (!year || !month || !day) return isoDate;
  // On crée la date en UTC midi (safe contre les sauts d'heure d'été), puis
  // on formate explicitement en UTC pour rester cohérent.
  const d = new Date(Date.UTC(year, month - 1, day, 12));
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return formatter.format(d);
}

/**
 * "2026-05-05T14:00" → "14h"
 *
 * Open-Meteo retourne les timestamps déjà en heure de Paris (paramètre
 * `timezone=Europe/Paris` côté backend) mais SANS offset explicite.
 * `new Date(iso).getHours()` interpréterait le timestamp comme local time
 * du serveur SSR (VPS en UTC), ce qui donne un décalage de 1-2h selon la
 * saison. On parse donc le string par regex pour rester fidèle à la
 * valeur retournée par l'API.
 */
export function formatHourLabel(isoTime: string): string {
  const match = isoTime.match(/T(\d{2}):/);
  if (!match) return isoTime;
  return `${parseInt(match[1], 10)}h`;
}

/**
 * "2026-05-05T06:30" → "06:30"
 *
 * Même rationale que formatHourLabel : on extract HH:MM du string sans
 * passer par new Date(), pour éviter la conversion timezone parasite
 * côté serveur SSR.
 */
export function formatTimeShort(iso: string | null | undefined): string {
  if (!iso) return "—";
  const match = iso.match(/T(\d{2}):(\d{2})/);
  if (!match) return "—";
  return `${match[1]}:${match[2]}`;
}

/**
 * Format un timestamp UTC complet (avec offset Z ou +00:00) en heure de
 * Paris. Utilisé pour `fetched_at` (renvoyé par Django en
 * `datetime.now(UTC).isoformat()` → "2026-05-05T13:45:12.345+00:00").
 *
 * Diffère de formatTimeShort qui s'applique aux timestamps Open-Meteo
 * SANS offset — ici on a un offset explicite, donc Date() parse OK et on
 * formate via Intl avec timeZone=Europe/Paris.
 */
export function formatTimestampParis(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const formatter = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
  return formatter.format(d);
}

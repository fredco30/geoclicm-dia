import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formate une date ISO en français lisible.
 * "2026-05-04T23:26:33+02:00" → "4 mai 2026"
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Date relative (il y a X minutes/heures/jours).
 */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);

  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  return formatDate(iso);
}

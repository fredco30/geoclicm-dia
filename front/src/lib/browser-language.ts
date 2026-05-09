/**
 * Détection de la langue préférée du navigateur, mappée sur les 6 langues
 * supportées par l'assistant IA.
 *
 * Pattern emprunté à city : on regarde navigator.language puis
 * navigator.languages, on prend la première qui matche fr/en/de/it/es/nl.
 * Fallback français si aucune ne matche.
 */
import type { AssistantLanguage } from "@/types/api";

const SUPPORTED: AssistantLanguage[] = ["fr", "en", "de", "it", "es", "nl"];

export function detectBrowserLanguage(): AssistantLanguage {
  if (typeof navigator === "undefined") return "fr";

  const candidates: string[] = [];
  if (navigator.language) candidates.push(navigator.language);
  if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);

  for (const candidate of candidates) {
    const lang = candidate.toLowerCase().split("-")[0] as AssistantLanguage;
    if (SUPPORTED.includes(lang)) return lang;
  }
  return "fr";
}

/** Génère un session_id UUID-like sans dep crypto. */
export function generateSessionId(): string {
  // RFC 4122 v4-ish, 32 chars hex. Suffisant pour anonyme.
  const random = () => Math.random().toString(16).slice(2, 10).padStart(8, "0");
  return `${random()}${random()}${random()}${random()}`;
}

const STORAGE_KEY = "geoclicmedia.assistant.session_id";

export function getOrCreateSessionId(): string {
  if (typeof localStorage === "undefined") return generateSessionId();
  let id = localStorage.getItem(STORAGE_KEY);
  if (!id || id.length < 16) {
    id = generateSessionId();
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* quota exceeded ou private mode — on garde juste en mémoire */
    }
  }
  return id;
}

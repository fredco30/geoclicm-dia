"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import { api } from "@/lib/api";
import {
  detectBrowserLanguage,
  getOrCreateSessionId,
} from "@/lib/browser-language";
import type {
  AssistantCitation,
  AssistantLanguage,
} from "@/types/api";

export type AssistantConvoMessage =
  | {
      role: "user";
      content: string;
      timestamp: number;
    }
  | {
      role: "assistant";
      content: string;
      citations: AssistantCitation[];
      timestamp: number;
    };

type AssistantContextValue = {
  /** True quand le drawer est ouvert. */
  isOpen: boolean;
  /** Liste des messages de la conversation courante (RAM seule). */
  messages: AssistantConvoMessage[];
  /** Langue active (détectée puis modifiable par l'utilisateur). */
  language: AssistantLanguage;
  /** session_id stable depuis localStorage. */
  sessionId: string;
  /** True quand on attend la réponse Mistral. */
  isPending: boolean;
  /** Code d'erreur éventuel : "rate_limit" | "generic" | null. */
  error: string | null;
  /** Slug commune contextuelle (depuis la page courante). */
  communeSlug?: string;

  open: () => void;
  close: () => void;
  toggle: () => void;
  setLanguage: (lang: AssistantLanguage) => void;
  setCommuneSlug: (slug?: string) => void;
  ask: (question: string) => Promise<void>;
  reset: () => void;
};

const AssistantContext = createContext<AssistantContextValue | null>(null);

type ProviderProps = {
  children: React.ReactNode;
  /** Slug commune si on est sur une page commune. */
  initialCommuneSlug?: string;
};

/**
 * Extrait un slug de commune depuis un pathname si on est sur une page
 * contextualisée par commune (page commune, météo). Sinon retourne
 * undefined.
 *
 * Patterns reconnus :
 *   /communes/[slug]
 *   /communes/[slug]/anything
 *   /meteo/[slug]
 */
function extractCommuneFromPath(pathname: string | null): string | undefined {
  if (!pathname) return undefined;
  const match = pathname.match(/^\/(?:communes|meteo)\/([^/?#]+)/);
  return match?.[1];
}

export function AssistantProvider({ children, initialCommuneSlug }: ProviderProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantConvoMessage[]>([]);
  const [language, setLanguageState] = useState<AssistantLanguage>("fr");
  const [sessionId, setSessionId] = useState<string>("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [communeSlug, setCommuneSlugState] = useState<string | undefined>(
    initialCommuneSlug,
  );

  // Auto-détection commune contextuelle selon la page courante.
  // L'utilisateur peut toujours override via setCommuneSlug() si on lui
  // donne un sélecteur dans le drawer (V2).
  useEffect(() => {
    const detected = extractCommuneFromPath(pathname);
    setCommuneSlugState(detected ?? initialCommuneSlug);
  }, [pathname, initialCommuneSlug]);

  // Init côté client uniquement (évite mismatch SSR)
  useEffect(() => {
    setLanguageState(detectBrowserLanguage());
    setSessionId(getOrCreateSessionId());
  }, []);

  // Bloque le scroll body quand drawer ouvert
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  // Échap pour fermer
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  const ask = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || isPending) return;
      if (!sessionId) return;

      setError(null);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: trimmed, timestamp: Date.now() },
      ]);
      setIsPending(true);

      try {
        const response = await api.assistant.ask({
          question: trimmed,
          session_id: sessionId,
          language,
          commune_slug: communeSlug,
        });
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: response.answer,
            citations: response.citations,
            timestamp: Date.now(),
          },
        ]);
      } catch (err) {
        const status = (err as { status?: number })?.status;
        if (status === 429) {
          setError("rate_limit");
        } else {
          setError("generic");
        }
      } finally {
        setIsPending(false);
      }
    },
    [communeSlug, isPending, language, sessionId],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const setLanguage = useCallback((lang: AssistantLanguage) => {
    setLanguageState(lang);
  }, []);
  const setCommuneSlug = useCallback((slug?: string) => {
    setCommuneSlugState(slug);
  }, []);

  const value = useMemo<AssistantContextValue>(
    () => ({
      isOpen, messages, language, sessionId, isPending, error, communeSlug,
      open, close, toggle, setLanguage, setCommuneSlug, ask, reset,
    }),
    [isOpen, messages, language, sessionId, isPending, error, communeSlug,
     open, close, toggle, setLanguage, setCommuneSlug, ask, reset],
  );

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant(): AssistantContextValue {
  const ctx = useContext(AssistantContext);
  if (!ctx) {
    throw new Error("useAssistant must be used inside <AssistantProvider>");
  }
  return ctx;
}

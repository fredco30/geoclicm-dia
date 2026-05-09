"use client";

import { Search } from "lucide-react";

import { useAssistant } from "@/components/assistant/assistant-context";

/**
 * Bouton recherche du Header — ouvre l'AssistantDrawer (Mistral + RAG).
 *
 * Composant client extrait pour ne pas rendre tout le Header en client
 * (le Header reste un server component pour bénéficier du SSR/RSC).
 *
 * Visible sur toutes les pages publiques. Permet de poser une question à
 * l'assistant depuis n'importe quelle page (en complément du
 * SearchTrigger qui n'est présent que sur la home + pages commune).
 */
export function HeaderSearchButton() {
  const { open } = useAssistant();
  return (
    <button
      type="button"
      onClick={open}
      aria-label="Rechercher / poser une question à l'assistant"
      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
      title="Rechercher / poser une question à l'assistant"
    >
      <Search className="h-5 w-5" />
    </button>
  );
}

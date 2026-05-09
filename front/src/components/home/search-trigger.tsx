"use client";

import { Search, Sparkles } from "lucide-react";

import { useAssistant } from "@/components/assistant/assistant-context";

/**
 * Barre "Pose ta question / cherche un sujet" — trigger principal du portail.
 *
 * Cliquer ouvre l'AssistantDrawer (Mistral + RAG). Le composant est rendu
 * partout où on a un AssistantProvider dans l'arbre — le SiteLayout
 * l'enveloppe globalement (cf app/(site)/layout.tsx).
 */
export function SearchTrigger() {
  const { open } = useAssistant();

  return (
    <button
      type="button"
      onClick={open}
      className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm transition hover:border-[#1a4d6e]/40 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4d6e] focus-visible:ring-offset-2"
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1 text-left">
        Pose ta question ou cherche un sujet…
      </span>
      <span className="hidden items-center gap-1 rounded-full bg-[#1a4d6e]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#1a4d6e] sm:inline-flex">
        <Sparkles className="h-3 w-3" aria-hidden />
        IA · Mistral
      </span>
    </button>
  );
}

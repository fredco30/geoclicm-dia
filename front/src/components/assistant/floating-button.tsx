"use client";

import { Sparkles } from "lucide-react";

import { useAssistant } from "./assistant-context";

/**
 * Bouton flottant qui rouvre le drawer de l'assistant à tout moment.
 *
 * Position : bas-droite, au-dessus du FooterFixed mobile (bottom-20 sur
 * mobile, bottom-5 sur desktop). Caché quand le drawer est déjà ouvert
 * pour éviter le doublon visuel.
 */
export function AssistantFloatingButton() {
  const { isOpen, open } = useAssistant();

  if (isOpen) return null;

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Ouvrir l'assistant"
      className="fixed bottom-20 right-4 z-30 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[#1a4d6e] to-[#13384f] px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-slate-900/20 transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4d6e] focus-visible:ring-offset-2 md:bottom-5"
    >
      <Sparkles className="h-4 w-4" aria-hidden />
      <span className="hidden sm:inline">Assistant</span>
    </button>
  );
}

"use client";

import { HelpCircle } from "lucide-react";
import { useHelp } from "./help-context";

/** FAB en bas-droite : caché si la page courante n'a pas de workflow d'aide. */
export function HelpButton() {
  const { workflow, open, setOpen } = useHelp();

  if (!workflow) return null;

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-expanded={open}
      aria-controls="help-drawer"
      className="fixed bottom-5 right-5 z-30 inline-flex items-center gap-2 rounded-full bg-[#1a4d6e] px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-slate-900/20 transition hover:bg-[#13384f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4d6e] focus-visible:ring-offset-2"
      title={`Aide — ${workflow.title}`}
    >
      <HelpCircle className="h-4 w-4" aria-hidden />
      Aide
    </button>
  );
}

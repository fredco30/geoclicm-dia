"use client";

import { useState, type ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";

type Props = {
  children: ReactNode;
  /** Libellé du résumé quand replié (ex: "Catégorie · Commune"). */
  summary?: string;
  /** Nombre de filtres actifs (badge). */
  activeCount?: number;
};

/**
 * Panneau de filtres repliable (mobile-first). Replié par défaut : un bouton
 * "Filtres" + résumé ; l'utilisateur déplie pour accéder au formulaire.
 * Évite d'occuper la moitié du premier écran sur mobile.
 */
export function CollapsibleFilters({ children, summary, activeCount = 0 }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-[#1a4d6e]"
      >
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4" />
          Filtres
          {activeCount > 0 ? (
            <span className="rounded-full bg-[#1a4d6e] px-2 py-0.5 text-xs font-semibold text-white">
              {activeCount}
            </span>
          ) : null}
        </span>
        {summary ? <span className="truncate text-xs text-slate-500">{summary}</span> : null}
      </button>
      {open ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4">{children}</div>
      ) : null}
    </div>
  );
}

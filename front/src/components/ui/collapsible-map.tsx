"use client";

import { useState, type ReactNode } from "react";
import { Map } from "lucide-react";

type Props = {
  children: ReactNode;
  /** Nombre d'éléments géolocalisés (affiché dans le bouton). */
  count: number;
  /** Ouvert par défaut (desktop). */
  defaultOpen?: boolean;
};

/**
 * Carte repliable : visible par défaut mais l'utilisateur peut la masquer.
 * Le bouton reste accessible pour la rouvrir. Utilisé pour /commerces où la
 * carte fonctionne bien et doit rester visible, sans imposer sa hauteur à
 * ceux qui préfèrent la liste.
 */
export function CollapsibleMap({ children, count, defaultOpen = true }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mb-3 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-[#1a4d6e] hover:text-[#1a4d6e]"
      >
        <Map className="h-4 w-4" />
        {open ? "Masquer la carte" : `Voir la carte (${count})`}
      </button>
      {open ? children : null}
    </div>
  );
}

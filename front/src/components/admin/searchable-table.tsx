"use client";

import { useRef, useState, type ReactNode } from "react";
import { Search, X } from "lucide-react";

type Props = {
  /** Le <table> complet, rendu côté serveur. */
  children: ReactNode;
  placeholder?: string;
  /** Sans champ de recherche : seulement le conteneur défilant (petites listes). */
  searchable?: boolean;
};

function norm(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    // « Grau-du-Roi » et « grau du roi » doivent se trouver l'un l'autre.
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Conteneur des listes du back-office.
 *
 * - Recherche instantanée sur tout le texte de la ligne (titre, commune,
 *   statut…), sans accents ni majuscules. Les listes sont déjà chargées en
 *   entier : filtrer les lignes affichées suffit, sans nouvelle requête.
 * - Défilement horizontal sur petit écran au lieu de colonnes coupées.
 */
export function SearchableTable({
  children,
  placeholder = "Rechercher dans la liste…",
  searchable = true,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState<number | null>(null);

  const apply = (value: string) => {
    setQuery(value);
    const wanted = norm(value);
    const rows = ref.current?.querySelectorAll<HTMLTableRowElement>("tbody tr") ?? [];
    let visible = 0;
    rows.forEach((row) => {
      // Cellules séparées par une espace : sans cela « votive » et « Le Grau »
      // se collent en un seul mot.
      const text = Array.from(row.cells, (cell) => cell.textContent ?? "").join(" ");
      const match = !wanted || norm(text).includes(wanted);
      row.hidden = !match;
      if (match) visible += 1;
    });
    setShown(wanted ? visible : null);
  };

  return (
    <div>
      {searchable ? (
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => apply(e.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
              className="h-10 w-full rounded-md border border-slate-300 bg-white pl-9 pr-9 text-sm placeholder:text-slate-400 focus:border-camargue focus:outline-none focus:ring-2 focus:ring-camargue/20 [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button
                type="button"
                onClick={() => apply("")}
                aria-label="Effacer la recherche"
                className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-slate-500 hover:bg-slate-100"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            ) : null}
          </div>
          <p className="text-sm text-slate-500" role="status">
            {shown === null ? "" : `${shown} résultat${shown > 1 ? "s" : ""}`}
          </p>
        </div>
      ) : null}

      <div
        ref={ref}
        className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm [&_table]:min-w-[640px]"
      >
        {children}
        {shown === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Aucune ligne ne correspond à « {query.trim()} ».
          </p>
        ) : null}
      </div>
    </div>
  );
}

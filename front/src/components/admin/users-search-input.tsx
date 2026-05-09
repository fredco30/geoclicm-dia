"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

type Props = {
  initialValue: string;
  placeholder?: string;
};

/**
 * Input de recherche de la page /admin/settings/users.
 *
 * Comportement :
 * - Debounce 300ms avant de pousser dans l'URL (évite de spammer le serveur
 *   à chaque touche).
 * - Met à jour `?search=...` via router.replace (pas de history push).
 * - Reset `page=1` quand le terme change (sinon on resterait sur une page
 *   inexistante de la nouvelle recherche).
 * - Bouton clear "✕" pour vider rapidement.
 */
export function UsersSearchInput({
  initialValue,
  placeholder = "Rechercher email, nom, username…",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(initialValue);
  const isFirstRender = useRef(true);

  // Debounce : pousse dans l'URL 300ms après la dernière saisie.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const handle = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set("search", value.trim());
      } else {
        params.delete("search");
      }
      params.delete("page"); // toujours reset à page 1
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ""}`);
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative max-w-md">
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        aria-hidden
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-slate-300 bg-white py-2 pl-9 pr-9 text-sm placeholder:text-slate-400 focus:border-[#1a4d6e] focus:outline-none focus:ring-1 focus:ring-[#1a4d6e]"
        aria-label={placeholder}
      />
      {value ? (
        <button
          type="button"
          onClick={() => setValue("")}
          aria-label="Effacer la recherche"
          className="absolute right-2 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

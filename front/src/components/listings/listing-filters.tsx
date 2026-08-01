"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CollapsibleFilters } from "@/components/ui/collapsible-filters";
import type { Commune } from "@/types/api";

type Props = {
  basePath: string;
  communes: Commune[];
  values: { commune?: string };
};

export function ListingFilters({ basePath, communes, values }: Props) {
  const router = useRouter();
  const [commune, setCommune] = useState(values.commune ?? "");
  const activeCount = commune ? 1 : 0;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (commune) params.set("commune", commune);
    router.push(params.size ? `${basePath}?${params.toString()}` : basePath);
  };
  const onReset = () => {
    setCommune("");
    router.push(basePath);
  };

  return (
    <CollapsibleFilters summary="Commune" activeCount={activeCount}>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium text-slate-600">
          Commune
          <select
            value={commune}
            onChange={(e) => setCommune(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
          >
            <option value="">Toutes</option>
            {communes
              .filter((c) => c.is_active)
              .map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button type="submit" className="h-10 flex-1 rounded-md bg-[#1a4d6e] px-3 text-sm font-medium text-white">
            Filtrer
          </button>
          <button type="button" onClick={onReset} className="inline-flex h-10 items-center px-2 text-xs text-slate-500 underline">
            Effacer
          </button>
        </div>
      </form>
    </CollapsibleFilters>
  );
}

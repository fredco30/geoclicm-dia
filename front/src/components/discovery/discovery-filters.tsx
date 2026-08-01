"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CollapsibleFilters } from "@/components/ui/collapsible-filters";
import type { Commune, PlaceCategory } from "@/types/api";

type Props = {
  categories: PlaceCategory[];
  communes: Commune[];
  values: { category?: string; commune?: string };
};

export function DiscoveryFilters({ categories, communes, values }: Props) {
  const router = useRouter();
  const [category, setCategory] = useState(values.category ?? "");
  const [commune, setCommune] = useState(values.commune ?? "");
  const activeCount = (category ? 1 : 0) + (commune ? 1 : 0);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (commune) params.set("commune", commune);
    router.push(params.size ? `/decouvrir?${params.toString()}` : "/decouvrir");
  };
  const onReset = () => {
    setCategory("");
    setCommune("");
    router.push("/decouvrir");
  };

  return (
    <CollapsibleFilters summary="Catégorie · Commune" activeCount={activeCount}>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium text-slate-600">
          Catégorie
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
          >
            <option value="">Toutes</option>
            {categories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
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
        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
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

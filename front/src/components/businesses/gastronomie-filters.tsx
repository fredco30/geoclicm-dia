"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CollapsibleFilters } from "@/components/ui/collapsible-filters";
import type { Commune } from "@/types/api";

/**
 * Envies proposees par le filtre Gastronomie. Liste FIXE, alignee sur les
 * libelles ecrits en base par la commande migrate_gastronomie (CRAVINGS) :
 * normalises, sans faute, et stables. Une nouvelle envie ajoutee a la main
 * dans l'admin n'apparaitra ici qu'apres ajout d'une ligne (choix assume).
 */
const CRAVINGS = [
  "Cuisine traditionnelle",
  "Pizzeria",
  "Fruits de mer",
  "Mediterraneen",
  "Vue mer",
  "Italien",
  "Cafe / Salon de the",
  "Tapas",
  "Glacier",
  "Burgers",
  "Creperie",
  "Vins & caveaux",
  "Sushi",
];

type Props = {
  communes: Commune[];
  values: { specialty?: string; commune?: string };
};

/**
 * Filtres de la section Gastronomie (mobile-first) : envie + commune.
 * Soumission → navigation vers /gastronomie?specialty=&commune= (server-render).
 * La categorie "gastronomie" est forcee cote serveur, jamais exposee ici.
 */
export function GastronomieFilters({ communes, values }: Props) {
  const router = useRouter();
  const [specialty, setSpecialty] = useState(values.specialty ?? "");
  const [commune, setCommune] = useState(values.commune ?? "");

  const activeCount = (specialty ? 1 : 0) + (commune ? 1 : 0);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (specialty) params.set("specialty", specialty);
    if (commune) params.set("commune", commune);
    router.push(params.size ? `/gastronomie?${params.toString()}` : "/gastronomie");
  };

  const onReset = () => {
    setSpecialty("");
    setCommune("");
    router.push("/gastronomie");
  };

  return (
    <CollapsibleFilters summary="Envie · Commune" activeCount={activeCount}>
      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium text-slate-600">
          Envie
          <select
            value={specialty}
            onChange={(e) => setSpecialty(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
          >
            <option value="">Toutes</option>
            {CRAVINGS.map((c) => (
              <option key={c} value={c}>
                {c}
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
          <button
            type="submit"
            className="h-10 flex-1 rounded-md bg-[#1a4d6e] px-3 text-sm font-medium text-white"
          >
            Filtrer
          </button>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-10 items-center px-2 text-xs text-slate-500 underline"
          >
            Effacer
          </button>
        </div>
      </form>
    </CollapsibleFilters>
  );
}

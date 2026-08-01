"use client";

import { useState } from "react";
import Link from "next/link";
import { SlidersHorizontal, ChevronDown } from "lucide-react";

import type { Commune, EventCategory } from "@/types/api";

type Props = {
  categories: EventCategory[];
  communes: Commune[];
  values: { category?: string; commune?: string; from?: string; to?: string };
};

/**
 * Filtres de l Agenda replies par defaut (mobile-first) : un seul bouton
 * « Filtres » deplie le formulaire complet. Le bouton indique les filtres
 * actifs. Desktop : meme comportement, replie aussi (la liste prime).
 */
export function AgendaFilters({ categories, communes, values }: Props) {
  const [open, setOpen] = useState(
    Boolean(values.category || values.commune || values.from || values.to),
  );
  const activeCount = [values.category, values.commune, values.from, values.to].filter(
    Boolean,
  ).length;

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:border-[#1a4d6e]"
      >
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-[#1a4d6e]" aria-hidden />
          Filtres
          {activeCount > 0 ? (
            <span className="rounded-full bg-[#1a4d6e] px-2 py-0.5 text-xs font-semibold text-white">
              {activeCount}
            </span>
          ) : null}
        </span>
        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
          Catégorie · Commune · Dates
          <ChevronDown
            className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
            aria-hidden
          />
        </span>
      </button>

      {open ? (
        <form className="mt-3 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
          <label className="text-xs font-medium text-slate-600">
            Catégorie
            <select
              name="category"
              defaultValue={values.category ?? ""}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              <option value="">Toutes</option>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Commune
            <select
              name="commune"
              defaultValue={values.commune ?? ""}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
            >
              <option value="">Toutes</option>
              {communes
                .filter((commune) => commune.is_active)
                .map((commune) => (
                  <option key={commune.id} value={commune.slug}>
                    {commune.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs font-medium text-slate-600">
            Du
            <input
              type="date"
              name="from"
              defaultValue={values.from ?? ""}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-2 text-sm"
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            Au
            <input
              type="date"
              name="to"
              defaultValue={values.to ?? ""}
              className="mt-1 h-10 w-full rounded-md border border-slate-300 px-2 text-sm"
            />
          </label>
          <div className="flex items-end gap-2">
            <button className="h-10 flex-1 rounded-md bg-[#1a4d6e] px-3 text-sm font-medium text-white">
              Filtrer
            </button>
            <Link
              href="/agenda"
              className="inline-flex h-10 items-center px-2 text-xs text-slate-500 underline"
            >
              Effacer
            </Link>
          </div>
        </form>
      ) : null}
    </div>
  );
}

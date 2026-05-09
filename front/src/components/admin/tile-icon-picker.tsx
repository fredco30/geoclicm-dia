"use client";

import { useState } from "react";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Sélecteur d'icône Lucide curaté.
 *
 * On ne propose pas toute la bibliothèque Lucide (1500+ icônes) — juste une
 * liste de ~40 icônes pertinentes pour des tuiles éditoriales et services
 * locaux. Le admin peut quand même renseigner librement le champ icon (texte
 * libre) si une icône n'est pas dans la liste.
 */

const CURATED_ICONS = [
  // Éditorial
  "Newspaper", "FileText", "BookOpen", "Pencil", "MessageSquare",
  // Météo et nature
  "CloudSun", "Cloud", "Sun", "Waves", "Mountain", "TreePine",
  // Commerces et services
  "Store", "ShoppingBag", "ShoppingBasket", "UtensilsCrossed", "Coffee",
  "Hotel", "Wrench", "Stethoscope",
  // Localisation
  "MapPin", "Map", "Compass", "Anchor", "Tent",
  // Agenda et événements
  "Calendar", "CalendarDays", "Clock", "Music", "Camera",
  // Pratique
  "Phone", "Mail", "Tag", "Info", "AlertTriangle", "HelpCircle",
  "Settings", "Search",
  // Citoyen
  "Users", "Building", "Landmark", "Vote",
];

type Props = {
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function TileIconPicker({ value, onChange, className }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [filter, setFilter] = useState("");

  const visibleIcons = filter
    ? CURATED_ICONS.filter((n) => n.toLowerCase().includes(filter.toLowerCase()))
    : showAll
      ? CURATED_ICONS
      : CURATED_ICONS.slice(0, 18);

  const SelectedIcon = (Icons[value as keyof typeof Icons] as LucideIcon | undefined) ?? null;

  return (
    <div className={className}>
      <div className="mb-2 flex items-center gap-2">
        {SelectedIcon ? (
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-[#1a4d6e] text-white">
            <SelectedIcon className="h-5 w-5" />
          </span>
        ) : (
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-dashed border-slate-300 text-xs text-slate-400">
            ?
          </span>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Nom Lucide (ex: Newspaper)"
          className="flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-sm"
        />
      </div>

      <input
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Filtrer les icônes…"
        className="mb-2 w-full rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
      />

      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9">
        {visibleIcons.map((name) => {
          const Icon = Icons[name as keyof typeof Icons] as LucideIcon | undefined;
          if (!Icon) return null;
          const active = value === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => onChange(name)}
              title={name}
              className={
                "inline-flex h-9 w-9 items-center justify-center rounded-md transition " +
                (active
                  ? "bg-[#1a4d6e] text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-[#1a4d6e]")
              }
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>

      {!filter && CURATED_ICONS.length > 18 ? (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 text-xs text-[#1a4d6e] hover:underline"
        >
          {showAll ? "Réduire" : `Voir les ${CURATED_ICONS.length - 18} autres`}
        </button>
      ) : null}
    </div>
  );
}

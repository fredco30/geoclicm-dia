/**
 * Presets de couleurs pour les tuiles.
 *
 * Chaque preset mappe vers des classes Tailwind utilisables côté front
 * public (TileGrid) et back-office (preview formulaire).
 *
 * En sync avec apps/tiles/models.py Tile.ColorPreset (côté Django).
 */
import type { TileColorPreset } from "@/types/admin";

export const TILE_COLOR_PRESETS: Record<
  TileColorPreset,
  { label: string; bg: string; text: string }
> = {
  camargue: {
    label: "Bleu camargue",
    bg: "bg-[#1a4d6e]",
    text: "text-white",
  },
  sel: {
    label: "Sel",
    bg: "bg-[#fbf9f5]",
    text: "text-slate-900",
  },
  terre: {
    label: "Terre cuite",
    bg: "bg-[#a8533a]",
    text: "text-white",
  },
  mer: {
    label: "Mer",
    bg: "bg-cyan-700",
    text: "text-white",
  },
  agrume: {
    label: "Agrume",
    bg: "bg-amber-600",
    text: "text-white",
  },
  olive: {
    label: "Olive",
    bg: "bg-emerald-700",
    text: "text-white",
  },
  neutre: {
    label: "Neutre",
    bg: "bg-slate-600",
    text: "text-white",
  },
};

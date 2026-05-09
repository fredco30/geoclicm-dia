import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import { TileGrid } from "@/components/tiles/tile-grid";

export const revalidate = 300;

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tileId = Number(id);
  if (Number.isNaN(tileId)) return { title: "Tuile introuvable" };
  try {
    const tile = await api.tiles.detail(tileId);
    return {
      title: tile.label,
      description: `${tile.label} — sélection de raccourcis sur geoclicMédia.`,
    };
  } catch {
    return { title: "Tuile introuvable" };
  }
}

/**
 * Page intermédiaire des sous-tuiles.
 *
 * Affichée quand un visiteur clique sur une tuile racine qui a des
 * `children` mais pas d'URL cible directe. Présente la grille des
 * sous-tuiles dans le même style visuel que la home.
 *
 * Cas typique : tuile « Découvrir » avec sous-tuiles « Patrimoine »,
 * « Plages », « Balades », « Sites historiques ».
 */
export default async function TileChildrenPage({ params }: Props) {
  const { id } = await params;
  const tileId = Number(id);
  if (Number.isNaN(tileId)) notFound();

  let tile;
  try {
    tile = await api.tiles.detail(tileId);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  // Si la tuile n'a pas de children, c'est qu'elle a été configurée
  // sans sous-tuile : 404 plutôt que page vide bizarre.
  if (!tile.has_children) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-screen-xl space-y-6 px-4 py-4 sm:py-8">
      <header>
        <Link href="/" className="text-sm text-slate-600 hover:text-[#1a4d6e]">
          ← Accueil
        </Link>
        <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {tile.label}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {tile.children.length} {tile.children.length > 1 ? "rubriques" : "rubrique"} sous {tile.label.toLowerCase()}.
        </p>
      </header>

      <TileGrid
        tiles={tile.children}
        emptyMessage={`Aucune sous-tuile active pour ${tile.label}.`}
      />
    </div>
  );
}

import type { Tile } from "@/types/api";
import { TileItem } from "./tile-item";

type Props = {
  tiles: Tile[];
  pathPrefix?: string;
  className?: string;
};

/**
 * Grille responsive de tuiles racine.
 *
 * Mobile : 3 colonnes
 * Tablette (sm) : 4 colonnes
 * Desktop (lg) : 5 colonnes
 *
 * Une tuile avec `span_2x: true` occupe 2 colonnes.
 */
export function TileGrid({ tiles, pathPrefix, className = "" }: Props) {
  const visible = tiles.filter((t) => t.is_active);

  if (visible.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        Aucune tuile à afficher pour l&apos;instant.
      </div>
    );
  }

  return (
    <div
      className={`grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5 ${className}`}
    >
      {visible.map((tile) => (
        <TileItem
          key={tile.id}
          tile={tile}
          pathPrefix={pathPrefix}
          className={tile.span_2x ? "col-span-2" : undefined}
        />
      ))}
    </div>
  );
}

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { TILE_COLOR_PRESETS } from "@/lib/tile-presets";
import { renderTileIcon } from "@/lib/tile-icons";
import type { Tile, TileChild } from "@/types/api";

type Props = {
  tile: Tile | TileChild;
  /** Préfixe URL si la tuile pointe vers une route interne contextuelle
   *  (ex: depuis une page commune, une tuile « actualités » pourrait être
   *   préfixée /communes/<slug> — pour PR 3+). Default : aucun. */
  pathPrefix?: string;
  className?: string;
};

/**
 * Rend une tuile de la grille d'accueil (ou d'une page commune).
 *
 * Selon `kind` :
 *  - internal_route → <Link href={internal_path}>
 *  - external_url   → <a href target="_blank"> + icône ExternalLink
 *  - module         → <Link href={path module câblé}>
 *
 * Si la tuile a des `children` (sous-tuiles) ET pas d'URL cible directe,
 * elle pointe vers `/tiles/<id>` (page intermédiaire qui affiche la grille
 * des sous-tuiles).
 */
export function TileItem({ tile, pathPrefix = "", className = "" }: Props) {
  const preset = TILE_COLOR_PRESETS[tile.color] ?? TILE_COLOR_PRESETS.camargue;
  const icon = tile.icon
    ? renderTileIcon(tile.icon, {
        className: "h-8 w-8 sm:h-10 sm:w-10",
        "aria-hidden": true,
      })
    : null;

  // Aspect ratio adapté au span : une tuile span_2x doit faire 2 colonnes
  // de large mais 1 ligne de haut (rectangle 2:1) — sans ça, aspect-square
  // la rend carrée et elle prend visuellement 4 cases d'aire au lieu de 2.
  const aspectClass = tile.span_2x ? "aspect-[2/1]" : "aspect-square";

  const baseClasses =
    `group relative flex ${aspectClass} flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-slate-200/70 p-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1a4d6e]`;

  const colorClasses = `${preset.bg} ${preset.text}`;

  const content = (
    <>
      {tile.cover_image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tile.cover_image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-60 transition group-hover:opacity-50"
          loading="lazy"
        />
      ) : null}

      <div className="relative flex flex-col items-center gap-2">
        {icon ?? (
          <span className="h-8 w-8 sm:h-10 sm:w-10" aria-hidden />
        )}
        <span className="px-1 text-sm font-medium leading-tight sm:text-base">
          {tile.label}
        </span>
      </div>

      {tile.kind === "external_url" ? (
        <ExternalLink
          className="absolute right-2 top-2 h-3.5 w-3.5 opacity-70"
          aria-hidden
        />
      ) : null}
    </>
  );

  // Détermination de l'URL cible
  const hasChildren = "has_children" in tile && tile.has_children;
  const targetUrl = tile.target_url;

  // Tuile externe : ouvre dans nouvel onglet, mention transparence
  if (tile.kind === "external_url") {
    if (!targetUrl) {
      return (
        <div
          className={`${baseClasses} ${colorClasses} cursor-not-allowed opacity-50 ${className}`}
          aria-disabled="true"
          title="URL externe manquante"
        >
          {content}
        </div>
      );
    }
    return (
      <a
        href={targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`${baseClasses} ${colorClasses} hover:scale-[1.02] hover:shadow-md ${className}`}
        title={`${tile.label} (ouvre dans un nouvel onglet)`}
      >
        {content}
        <span className="sr-only"> (lien externe)</span>
      </a>
    );
  }

  // Si la tuile a des sous-tuiles mais pas d'URL cible directe, on pointe
  // vers la page intermédiaire `/tiles/<id>` qui affiche la grille des
  // sous-tuiles. Si elle a un target_url ET des children, on privilégie
  // le target_url (cas plus rare : un admin a configuré explicitement
  // une route et un set de sous-tuiles complémentaires).
  const fallbackHref = hasChildren ? `/tiles/${tile.id}` : null;

  // Lien interne ou module câblé
  const href = targetUrl
    ? pathPrefix && targetUrl.startsWith("/")
      ? `${pathPrefix}${targetUrl}`
      : targetUrl
    : fallbackHref ?? "/";

  return (
    <Link
      href={href}
      className={`${baseClasses} ${colorClasses} hover:scale-[1.02] hover:shadow-md ${className}`}
    >
      {content}
    </Link>
  );
}

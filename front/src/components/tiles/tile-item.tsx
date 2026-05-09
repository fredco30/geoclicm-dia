import Link from "next/link";
import { ExternalLink } from "lucide-react";

import { TILE_COLOR_PRESETS } from "@/lib/tile-presets";
import { getTileIcon } from "@/lib/tile-icons";
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
 *  - module         → <Link href={path module câblé>
 *
 * Si la tuile a des `children` (sous-tuiles) ET pas d'URL cible directe,
 * elle pointe vers `/tiles/<id>` (page intermédiaire — implémentée en PR 4).
 * Tant que PR 4 n'est pas mergée, ces tuiles redirigent vers l'URL cible
 * du parent si renseignée, sinon affichent un fallback inactif.
 */
export function TileItem({ tile, pathPrefix = "", className = "" }: Props) {
  const preset = TILE_COLOR_PRESETS[tile.color] ?? TILE_COLOR_PRESETS.camargue;
  const Icon = tile.icon ? getTileIcon(tile.icon) : null;

  const baseClasses =
    "group relative flex aspect-square flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl p-3 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#1a4d6e]";

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
        {Icon ? (
          <Icon className="h-8 w-8 sm:h-10 sm:w-10" aria-hidden />
        ) : (
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

  // Tuile racine avec sous-tuiles → page intermédiaire (PR 4 à venir).
  // Pour V1 PR 2 : on tente le target_url s'il existe (cas modules),
  // sinon on désactive visuellement.
  if (hasChildren && !targetUrl) {
    return (
      <div
        className={`${baseClasses} ${colorClasses} cursor-not-allowed opacity-60 ${className}`}
        aria-disabled="true"
        title="Sous-tuiles bientôt accessibles"
      >
        {content}
      </div>
    );
  }

  // Lien interne ou module câblé
  const href = targetUrl
    ? pathPrefix && targetUrl.startsWith("/")
      ? `${pathPrefix}${targetUrl}`
      : targetUrl
    : "/";

  return (
    <Link
      href={href}
      className={`${baseClasses} ${colorClasses} hover:scale-[1.02] hover:shadow-md ${className}`}
    >
      {content}
    </Link>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Edit, Eye, EyeOff, ExternalLink, Layers } from "lucide-react";

import { getCookieHeader, getCurrentUser } from "@/lib/auth-server";
import { TILE_COLOR_PRESETS } from "@/lib/tile-presets";
import { Button } from "@/components/ui/button";
import type { AdminTile } from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function fetchTiles(): Promise<AdminTile[]> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(`${API_URL}/api/admin/tiles/`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as AdminTile[];
}

const KIND_LABELS: Record<string, string> = {
  internal_route: "Lien interne",
  external_url: "Lien externe",
  module: "Module",
};

export default async function AdminTilesPage() {
  const me = await getCurrentUser();
  if (!me?.can_publish) redirect("/admin");

  const tiles = await fetchTiles();

  // Groupage : tuiles racine d'abord (parent=null), puis on attache les
  // sous-tuiles à leur parent dans l'ordre.
  const roots = tiles.filter((t) => t.parent === null).sort((a, b) => a.sort_order - b.sort_order);
  const childrenByParent = new Map<number, AdminTile[]>();
  for (const t of tiles) {
    if (t.parent === null) continue;
    const arr = childrenByParent.get(t.parent) ?? [];
    arr.push(t);
    childrenByParent.set(t.parent, arr);
  }
  for (const arr of childrenByParent.values()) {
    arr.sort((a, b) => a.sort_order - b.sort_order);
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">
          Tuiles d&apos;accueil{" "}
          <span className="ml-1 text-sm font-normal text-slate-500">
            ({tiles.length})
          </span>
        </h1>
        <Link href="/admin/tiles/new">
          <Button size="sm">
            <Plus className="h-4 w-4" /> Nouvelle tuile
          </Button>
        </Link>
      </div>

      <p className="mb-4 max-w-2xl text-sm text-slate-600">
        Les tuiles forment la grille d&apos;accueil du site (home et pages
        commune). Une tuile racine peut avoir des <strong>sous-tuiles</strong> qui
        s&apos;affichent au clic. Les types « Module » sont câblés sur les
        écrans existants Actualités / Météo / Commerçants.
      </p>

      {tiles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-600">
            Aucune tuile pour l&apos;instant.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Lance la commande <code className="rounded bg-slate-100 px-1">python manage.py seed_tiles</code> pour créer les 10 tuiles initiales,
            ou crée-les une par une via « Nouvelle tuile ».
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {roots.map((tile) => {
            const children = childrenByParent.get(tile.id) ?? [];
            return (
              <TileRow
                key={tile.id}
                tile={tile}
                isChild={false}
              >
                {children.length > 0 ? (
                  <div className="mt-2 space-y-1.5 border-l-2 border-slate-200 pl-4">
                    <p className="text-[11px] uppercase tracking-wider text-slate-400">
                      Sous-tuiles ({children.length})
                    </p>
                    {children.map((c) => (
                      <TileRow key={c.id} tile={c} isChild />
                    ))}
                  </div>
                ) : null}
              </TileRow>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TileRow({
  tile,
  isChild,
  children,
}: {
  tile: AdminTile;
  isChild: boolean;
  children?: React.ReactNode;
}) {
  const preset = TILE_COLOR_PRESETS[tile.color];
  return (
    <div
      className={
        "rounded-xl border bg-white p-3 transition " +
        (isChild
          ? "border-slate-200"
          : "border-slate-300 shadow-sm")
      }
    >
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-md text-xs font-medium ${preset.bg} ${preset.text}`}
          title={`Couleur ${preset.label}`}
        >
          {tile.icon ? tile.icon.slice(0, 3) : "?"}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-900">{tile.label}</span>
            {tile.has_children ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#1a4d6e]/10 px-1.5 py-0.5 text-[10px] font-medium text-[#1a4d6e]">
                <Layers className="h-2.5 w-2.5" />
                avec sous-tuiles
              </span>
            ) : null}
            {tile.span_2x ? (
              <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                large
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
            <span>
              {KIND_LABELS[tile.kind]} :{" "}
              <code className="text-[11px]">{tile.target_url || "—"}</code>
              {tile.kind === "external_url" ? (
                <ExternalLink className="ml-1 inline h-3 w-3" />
              ) : null}
            </span>
            <span>ordre {tile.sort_order}</span>
            {tile.visible_on_communes_detail.length > 0 ? (
              <span>
                {tile.visible_on_communes_detail.length} commune
                {tile.visible_on_communes_detail.length > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-slate-400">toutes communes</span>
            )}
            {!tile.show_on_home ? (
              <span className="text-amber-600">absent home globale</span>
            ) : null}
          </div>
        </div>

        <span className="hidden sm:inline-flex" title={tile.is_active ? "Active" : "Inactive"}>
          {tile.is_active ? (
            <Eye className="h-4 w-4 text-green-600" />
          ) : (
            <EyeOff className="h-4 w-4 text-slate-400" />
          )}
        </span>

        <Link
          href={`/admin/tiles/${tile.id}/edit`}
          className="rounded-md p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Éditer"
        >
          <Edit className="h-4 w-4" />
        </Link>
      </div>

      {children}
    </div>
  );
}

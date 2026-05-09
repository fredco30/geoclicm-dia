import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus } from "lucide-react";

import { getCookieHeader, getCurrentUser } from "@/lib/auth-server";
import { Button } from "@/components/ui/button";
import { TilesAdmin } from "@/components/admin/tiles-admin";
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

export default async function AdminTilesPage() {
  const me = await getCurrentUser();
  if (!me?.can_publish) redirect("/admin");

  const tiles = await fetchTiles();

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
        commune). Une tuile racine peut avoir des <strong>sous-tuiles</strong>{" "}
        qui s&apos;affichent au clic. L&apos;ordre est éditable directement
        en glissant les lignes ci-dessous (sauvegarde automatique).
      </p>

      {tiles.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-sm text-slate-600">
            Aucune tuile pour l&apos;instant.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Lance la commande{" "}
            <code className="rounded bg-slate-100 px-1">
              python manage.py seed_tiles
            </code>{" "}
            pour créer les 10 tuiles initiales, ou crée-les une par une via
            « Nouvelle tuile ».
          </p>
        </div>
      ) : (
        <TilesAdmin initialTiles={tiles} />
      )}
    </div>
  );
}

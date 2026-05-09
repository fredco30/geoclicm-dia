import { redirect } from "next/navigation";

import { getCookieHeader, getCurrentUser } from "@/lib/auth-server";
import { TileForm } from "@/components/admin/tile-form";
import type { Commune } from "@/types/api";
import type { AdminTile } from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function fetchRootTiles(): Promise<AdminTile[]> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(`${API_URL}/api/admin/tiles/`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const all = (await res.json()) as AdminTile[];
  // Seules les tuiles racine peuvent être parentes (1 niveau de profondeur max)
  return all.filter((t) => t.parent === null);
}

async function fetchCommunes(): Promise<Commune[]> {
  const res = await fetch(`${API_URL}/api/communes/`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as Commune[];
}

export default async function NewTilePage() {
  const me = await getCurrentUser();
  if (!me?.can_publish) redirect("/admin");

  const [rootTiles, communes] = await Promise.all([
    fetchRootTiles(),
    fetchCommunes(),
  ]);

  return <TileForm rootTiles={rootTiles} communes={communes} />;
}

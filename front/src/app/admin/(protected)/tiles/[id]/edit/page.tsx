import { notFound, redirect } from "next/navigation";

import { getCookieHeader, getCurrentUser } from "@/lib/auth-server";
import { TileForm } from "@/components/admin/tile-form";
import type { Commune } from "@/types/api";
import type { AdminTile } from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function fetchTile(id: number): Promise<AdminTile | null> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(`${API_URL}/api/admin/tiles/${id}/`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as AdminTile;
}

async function fetchRootTiles(): Promise<AdminTile[]> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(`${API_URL}/api/admin/tiles/`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const all = (await res.json()) as AdminTile[];
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

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditTilePage({ params }: Props) {
  const me = await getCurrentUser();
  if (!me?.can_publish) redirect("/admin");

  const { id } = await params;
  const tileId = Number(id);
  if (Number.isNaN(tileId)) notFound();

  const [tile, rootTiles, communes] = await Promise.all([
    fetchTile(tileId),
    fetchRootTiles(),
    fetchCommunes(),
  ]);

  if (!tile) notFound();

  return <TileForm tile={tile} rootTiles={rootTiles} communes={communes} />;
}

import { notFound, redirect } from "next/navigation";

import { getCookieHeader, getCurrentUser } from "@/lib/auth-server";
import { CrawlSourceForm } from "@/components/admin/crawl-source-form";
import type { Commune } from "@/types/api";
import type { AdminCrawlSource } from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function fetchSource(id: number): Promise<AdminCrawlSource | null> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(`${API_URL}/api/admin/crawl-sources/${id}/`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as AdminCrawlSource;
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

export default async function EditCrawlSourcePage({ params }: Props) {
  const me = await getCurrentUser();
  if (!me?.can_publish) redirect("/admin");

  const { id } = await params;
  const sourceId = Number(id);
  if (Number.isNaN(sourceId)) notFound();

  const [source, communes] = await Promise.all([
    fetchSource(sourceId),
    fetchCommunes(),
  ]);

  if (!source) notFound();

  return <CrawlSourceForm source={source} communes={communes} />;
}

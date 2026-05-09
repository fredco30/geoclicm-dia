import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth-server";
import { CrawlSourceForm } from "@/components/admin/crawl-source-form";
import type { Commune } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function fetchCommunes(): Promise<Commune[]> {
  const res = await fetch(`${API_URL}/api/communes/`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as Commune[];
}

export default async function NewCrawlSourcePage() {
  const me = await getCurrentUser();
  if (!me?.can_publish) redirect("/admin");

  const communes = await fetchCommunes();

  return <CrawlSourceForm communes={communes} />;
}

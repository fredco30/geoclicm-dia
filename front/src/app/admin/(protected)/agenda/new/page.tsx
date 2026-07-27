import { EventForm } from "@/components/admin/event-form";
import { api } from "@/lib/api";
import { getCookieHeader } from "@/lib/auth-server";
import type { BusinessListItem, Paginated } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function fetchBusinesses(): Promise<BusinessListItem[]> {
  const cookieHeader = await getCookieHeader();
  const response = await fetch(`${API_URL}/api/businesses/?ordering=name&page_size=200`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as Paginated<BusinessListItem>;
  return payload.results;
}

type Props = { searchParams: Promise<{ kind?: string }> };

export default async function NewEventPage({ searchParams }: Props) {
  const params = await searchParams;
  const [categories, communes, businesses] = await Promise.all([
    api.events.categories(), api.communes(), fetchBusinesses(),
  ]);
  return <EventForm categories={categories} communes={communes} businesses={businesses} initialKind={params.kind === "market" ? "market" : "event"} />;
}

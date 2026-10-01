import { EventForm } from "@/components/admin/event-form";
import { api } from "@/lib/api";
import { fetchAllPages } from "@/lib/auth-server";
import type { BusinessListItem } from "@/types/api";

async function fetchBusinesses(): Promise<BusinessListItem[]> {
  return (await fetchAllPages<BusinessListItem>("/api/businesses/?ordering=name")) ?? [];
}

type Props = { searchParams: Promise<{ kind?: string }> };

export default async function NewEventPage({ searchParams }: Props) {
  const params = await searchParams;
  const [categories, communes, businesses] = await Promise.all([
    api.events.categories(), api.communes(), fetchBusinesses(),
  ]);
  return <EventForm categories={categories} communes={communes} businesses={businesses} initialKind={params.kind === "market" ? "market" : "event"} />;
}

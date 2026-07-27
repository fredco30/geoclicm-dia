import { notFound } from "next/navigation";

import { EventForm } from "@/components/admin/event-form";
import { api } from "@/lib/api";
import { getCookieHeader } from "@/lib/auth-server";
import type { BusinessListItem, EventDetail, Paginated } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function fetchEvent(slug: string): Promise<EventDetail | null> {
  const cookieHeader = await getCookieHeader();
  const response = await fetch(`${API_URL}/api/admin/events/${slug}/`, { headers: { Cookie: cookieHeader, Accept: "application/json" }, cache: "no-store" });
  return response.ok ? response.json() as Promise<EventDetail> : null;
}

async function fetchBusinesses(): Promise<BusinessListItem[]> {
  const cookieHeader = await getCookieHeader();
  const response = await fetch(`${API_URL}/api/businesses/?ordering=name&page_size=200`, { headers: { Cookie: cookieHeader, Accept: "application/json" }, cache: "no-store" });
  if (!response.ok) return [];
  const payload = (await response.json()) as Paginated<BusinessListItem>;
  return payload.results;
}

type Props = { params: Promise<{ slug: string }> };

export default async function EditEventPage({ params }: Props) {
  const { slug } = await params;
  const [event, categories, communes, businesses] = await Promise.all([
    fetchEvent(slug), api.events.categories(), api.communes(), fetchBusinesses(),
  ]);
  if (!event) notFound();
  return <EventForm event={event} categories={categories} communes={communes} businesses={businesses} />;
}

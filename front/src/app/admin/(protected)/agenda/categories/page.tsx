import { EventCategoriesAdmin } from "@/components/admin/event-categories-admin";
import { getCookieHeader } from "@/lib/auth-server";
import type { EventCategory } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function fetchCategories(): Promise<EventCategory[]> {
  const cookieHeader = await getCookieHeader();
  const response = await fetch(`${API_URL}/api/admin/event-categories/`, { headers: { Cookie: cookieHeader, Accept: "application/json" }, cache: "no-store" });
  return response.ok ? response.json() as Promise<EventCategory[]> : [];
}

export default async function EventCategoriesPage() {
  return <EventCategoriesAdmin initialCategories={await fetchCategories()} />;
}

import { EventCategoriesAdmin } from "@/components/admin/event-categories-admin";
import { getCookieHeader } from "@/lib/auth-server";
import type { PlaceCategory } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";
async function fetchCategories(): Promise<PlaceCategory[]> { const cookie = await getCookieHeader(); const response = await fetch(`${API_URL}/api/admin/place-categories/`, { headers: { Cookie: cookie, Accept: "application/json" }, cache: "no-store" }); return response.ok ? response.json() as Promise<PlaceCategory[]> : []; }
export default async function PlaceCategoriesPage() { return <EventCategoriesAdmin initialCategories={await fetchCategories()} apiBase="/api/admin/place-categories" backHref="/admin/decouvrir" title="Catégories Découvrir" supportsDescription />; }

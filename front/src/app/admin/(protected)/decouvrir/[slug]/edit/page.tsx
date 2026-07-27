import { notFound } from "next/navigation";
import { PlaceForm } from "@/components/admin/place-form";
import { api } from "@/lib/api";
import { getCookieHeader } from "@/lib/auth-server";
import { getDiscoveryRelationOptions } from "@/lib/discovery-admin-data";
import type { PlaceDetail } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";
async function fetchPlace(slug: string): Promise<PlaceDetail | null> { const cookie = await getCookieHeader(); const response = await fetch(`${API_URL}/api/admin/places/${slug}/`, { headers: { Cookie: cookie, Accept: "application/json" }, cache: "no-store" }); return response.ok ? response.json() as Promise<PlaceDetail> : null; }
type Props = { params: Promise<{ slug: string }> };
export default async function EditPlacePage({ params }: Props) { const { slug } = await params; const [place, categories, communes, options] = await Promise.all([fetchPlace(slug), api.discovery.categories(), api.communes(), getDiscoveryRelationOptions()]); if (!place) notFound(); return <PlaceForm place={place} categories={categories} communes={communes} articles={options.articles} businesses={options.businesses} events={options.events} />; }

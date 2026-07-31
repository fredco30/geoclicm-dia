import { notFound } from "next/navigation";
import { ListingForm } from "@/components/admin/listing-form";
import { getCookieHeader } from "@/lib/auth-server";
import type { Commune, ListingCategory, ListingDetail } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function get<T>(path: string): Promise<T | null> {
  const cookie = await getCookieHeader();
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Cookie: cookie, Accept: "application/json" },
    cache: "no-store",
  });
  if (res.status === 404) return null;
  return res.ok ? (res.json() as Promise<T>) : null;
}

export default async function EditListingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [listing, categories, communes] = await Promise.all([
    get<ListingDetail>(`/api/admin/listings/${slug}/`),
    get<ListingCategory[]>("/api/listing-categories/"),
    get<Commune[]>("/api/communes/"),
  ]);
  if (!listing) notFound();
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Modifier l&apos;annonce</h1>
      <ListingForm listing={listing} categories={categories ?? []} communes={communes ?? []} />
    </div>
  );
}

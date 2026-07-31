import { ListingForm } from "@/components/admin/listing-form";
import { getCookieHeader } from "@/lib/auth-server";
import type { Commune, ListingCategory } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function get<T>(path: string): Promise<T> {
  const cookie = await getCookieHeader();
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Cookie: cookie, Accept: "application/json" },
    cache: "no-store",
  });
  return res.ok ? (res.json() as Promise<T>) : ([] as unknown as T);
}

export default async function NewListingPage() {
  const [categories, communes] = await Promise.all([
    get<ListingCategory[]>("/api/listing-categories/"),
    get<Commune[]>("/api/communes/"),
  ]);
  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Nouvelle annonce</h1>
      <ListingForm categories={categories} communes={communes} />
    </div>
  );
}

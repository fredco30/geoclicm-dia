import Link from "next/link";
import { getCookieHeader } from "@/lib/auth-server";
import { AdCampaignForm } from "@/components/admin/ad-campaign-form";
import { Button } from "@/components/ui/button";
import type { Commune, Paginated } from "@/types/api";
import type {
  AdminBusinessCategory,
  AdminBusinessListItem,
} from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function fetchMyBusinesses(): Promise<AdminBusinessListItem[]> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(
    `${API_URL}/api/advertiser/businesses/?ordering=name`,
    {
      headers: { Cookie: cookieHeader, Accept: "application/json" },
      cache: "no-store",
    },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as Paginated<AdminBusinessListItem>;
  return data.results;
}

async function fetchCommunes(): Promise<Commune[]> {
  const res = await fetch(`${API_URL}/api/communes/`, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return (await res.json()) as Commune[];
}

async function fetchCategories(): Promise<AdminBusinessCategory[]> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(`${API_URL}/api/business-categories/`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export default async function NewMyCampaignPage() {
  const [businesses, communes, categories] = await Promise.all([
    fetchMyBusinesses(),
    fetchCommunes(),
    fetchCategories(),
  ]);

  // Si l'annonceur n'a pas encore de fiche, on bloque la création de campagne
  if (businesses.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-8 text-center">
          <h1 className="font-serif text-xl font-semibold text-amber-900">
            Crée d&apos;abord ta fiche commerce
          </h1>
          <p className="mt-2 text-sm text-amber-800">
            Une campagne publicitaire est rattachée à une fiche commerce
            (logo, nom, lien). Tu n&apos;as pas encore de fiche, crées-en
            une avant de lancer ta première campagne.
          </p>
          <Link href="/advertiser/fiches/new" className="mt-4 inline-block">
            <Button size="md">Créer ma fiche</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <AdCampaignForm
        mode="advertiser"
        businesses={businesses}
        communes={communes}
        categories={categories}
      />
    </div>
  );
}

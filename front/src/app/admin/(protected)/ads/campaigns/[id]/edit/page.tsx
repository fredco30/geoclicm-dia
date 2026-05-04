import { notFound, redirect } from "next/navigation";
import { getCookieHeader, getCurrentUser } from "@/lib/auth-server";
import { AdCampaignForm } from "@/components/admin/ad-campaign-form";
import type { Commune, Paginated } from "@/types/api";
import type {
  AdminAdCampaignDetail,
  AdminBusinessCategory,
  AdminBusinessListItem,
} from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

type Props = { params: Promise<{ id: string }> };

async function fetchCampaign(id: string): Promise<AdminAdCampaignDetail | null> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(`${API_URL}/api/ad-campaigns/${id}/`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as AdminAdCampaignDetail;
}

async function fetchBusinesses(): Promise<AdminBusinessListItem[]> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(
    `${API_URL}/api/businesses/?ordering=name&page_size=200`,
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

export default async function EditAdCampaignPage({ params }: Props) {
  const me = await getCurrentUser();
  if (!me?.can_publish) redirect("/admin");

  const { id } = await params;
  const [campaign, businesses, communes, categories] = await Promise.all([
    fetchCampaign(id),
    fetchBusinesses(),
    fetchCommunes(),
    fetchCategories(),
  ]);

  if (!campaign) notFound();

  return (
    <AdCampaignForm
      campaign={campaign}
      businesses={businesses}
      communes={communes}
      categories={categories}
    />
  );
}

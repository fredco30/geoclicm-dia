import type { Metadata } from "next";
import { makeListingDetailPage } from "@/components/listings/listing-detail-page";
import { api } from "@/lib/api";

export const revalidate = 600;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  try {
    const listing = await api.listings.detail((await params).slug);
    return { title: listing.title, description: listing.short_description };
  } catch {
    return { title: "Annonce introuvable" };
  }
}

export default makeListingDetailPage({ basePath: "/locations-annuelles", backLabel: "Locations annuelles" });

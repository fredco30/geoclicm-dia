import type { Metadata } from "next";
import Link from "next/link";
import { PlaceCard } from "@/components/discovery/place-card";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api";

export const revalidate = 300;
export const metadata: Metadata = { title: "Découvrir le territoire", description: "Patrimoine, nature, plages, balades et savoir-faire du littoral camarguais." };
type Props = { searchParams: Promise<{ page?: string; category?: string; commune?: string }> };
export default async function DiscoveryPage({ searchParams }: Props) {
  const params = await searchParams; const page = Math.max(1, Number(params.page) || 1);
  const [places, categories, communes] = await Promise.all([api.discovery.list({ page, category: params.category, commune: params.commune }), api.discovery.categories(), api.communes()]);
  const query = new URLSearchParams(); if (params.category) query.set("category", params.category); if (params.commune) query.set("commune", params.commune); const baseUrl = query.size ? `/decouvrir?${query}` : "/decouvrir";
  return <div className="mx-auto max-w-screen-xl px-4 py-6 sm:py-10"><header className="mb-8 border-b border-slate-200 pb-6"><Link href="/" className="text-sm text-slate-600">← Accueil</Link><h1 className="mt-3 font-serif text-3xl font-semibold sm:text-5xl">Découvrir le territoire</h1><p className="mt-2 max-w-2xl text-slate-600">Des lieux et parcours choisis, reliés aux histoires, rendez-vous et acteurs locaux.</p></header><form className="mb-7 flex flex-wrap items-end gap-3 rounded-xl border bg-white p-4"><label className="min-w-48 flex-1 text-xs font-medium text-slate-600">Catégorie<select name="category" defaultValue={params.category ?? ""} className="mt-1 h-10 w-full rounded-md border px-2 text-sm"><option value="">Toutes</option>{categories.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label><label className="min-w-48 flex-1 text-xs font-medium text-slate-600">Commune<select name="commune" defaultValue={params.commune ?? ""} className="mt-1 h-10 w-full rounded-md border px-2 text-sm"><option value="">Toutes</option>{communes.filter((item) => item.is_active).map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label><button className="h-10 rounded-md bg-[#1a4d6e] px-4 text-sm font-medium text-white">Filtrer</button><Link href="/decouvrir" className="inline-flex h-10 items-center px-2 text-xs text-slate-500 underline">Effacer</Link></form>{places.results.length ? <><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{places.results.map((place) => <PlaceCard key={place.id} place={place} />)}</div><Pagination currentPage={page} totalCount={places.count} pageSize={20} baseUrl={baseUrl} /></> : <p className="rounded-xl border border-dashed p-10 text-center text-slate-500">Aucun lieu publié pour ces critères.</p>}</div>;
}

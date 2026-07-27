import type { Metadata } from "next";
import Link from "next/link";

import { BusinessCard } from "@/components/businesses/business-card";
import { EventCard } from "@/components/events/event-card";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Marchés et producteurs locaux",
  description: "Jours de marchés et producteurs locaux du littoral camarguais.",
};

type Props = { searchParams: Promise<{ commune?: string; from?: string; market_page?: string; producer_page?: string }> };

function baseUrl(params: { commune?: string; from?: string }, keep?: Record<string, string>): string {
  const query = new URLSearchParams();
  if (params.commune) query.set("commune", params.commune);
  if (params.from) query.set("from", params.from);
  for (const [key, value] of Object.entries(keep ?? {})) query.set(key, value);
  return query.size ? `/marches?${query.toString()}` : "/marches";
}

export default async function MarketsPage({ searchParams }: Props) {
  const params = await searchParams;
  const marketPage = Math.max(1, Number(params.market_page) || 1);
  const producerPage = Math.max(1, Number(params.producer_page) || 1);
  const [markets, producers, communes] = await Promise.all([
    api.events.list({ kind: "market", commune: params.commune, from: params.from, page: marketPage }),
    api.businesses.list({ local_producer: true, commune: params.commune, page: producerPage }),
    api.communes(),
  ]);

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:py-10">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <Link href="/" className="text-sm text-slate-600 hover:text-[#1a4d6e]">← Accueil</Link>
        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Marchés &amp; producteurs</h1>
        <p className="mt-2 max-w-2xl text-slate-600">Retrouvez les prochains marchés et les professionnels qui produisent réellement sur le territoire.</p>
      </header>
      <form className="mb-9 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="min-w-52 flex-1 text-xs font-medium text-slate-600">Commune<select name="commune" defaultValue={params.commune ?? ""} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"><option value="">Toutes</option>{communes.filter((commune) => commune.is_active).map((commune) => <option key={commune.id} value={commune.slug}>{commune.name}</option>)}</select></label>
        <label className="min-w-44 text-xs font-medium text-slate-600">À partir du<input name="from" type="date" defaultValue={params.from ?? ""} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-2 text-sm" /></label>
        <button className="h-10 rounded-md bg-[#1a4d6e] px-4 text-sm font-medium text-white">Filtrer</button>
        <Link href="/marches" className="inline-flex h-10 items-center px-2 text-xs text-slate-500 underline">Effacer</Link>
      </form>

      <section>
        <div className="mb-4 flex items-end justify-between"><div><h2 className="font-serif text-2xl font-semibold text-slate-900">Prochains marchés</h2><p className="text-sm text-slate-500">Les horaires exceptionnels et annulations sont gérés date par date.</p></div></div>
        {markets.results.length ? <><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{markets.results.map((market) => <EventCard key={market.id} event={market} />)}</div><Pagination currentPage={marketPage} totalCount={markets.count} pageSize={20} pageParam="market_page" baseUrl={baseUrl(params, producerPage > 1 ? { producer_page: String(producerPage) } : undefined)} /></> : <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">Aucun marché à venir pour ces critères.</p>}
      </section>

      <section className="mt-12 border-t border-slate-200 pt-9">
        <div className="mb-4"><h2 className="font-serif text-2xl font-semibold text-slate-900">Producteurs locaux</h2><p className="text-sm text-slate-500">Ces fiches sont qualifiées individuellement par l’équipe éditoriale.</p></div>
        {producers.results.length ? <><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{producers.results.map((producer) => <BusinessCard key={producer.id} business={producer} />)}</div><Pagination currentPage={producerPage} totalCount={producers.count} pageSize={20} pageParam="producer_page" baseUrl={baseUrl(params, marketPage > 1 ? { market_page: String(marketPage) } : undefined)} /></> : <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500">Aucun producteur publié pour ces critères.</p>}
      </section>
    </div>
  );
}

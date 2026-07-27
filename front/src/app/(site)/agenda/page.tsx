import type { Metadata } from "next";
import Link from "next/link";

import { AdSlot } from "@/components/ads/ad-slot";
import { EventCard } from "@/components/events/event-card";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Agenda local",
  description: "Sorties, fêtes, culture, sport et rendez-vous du littoral camarguais.",
};

type Props = { searchParams: Promise<{ page?: string; category?: string; commune?: string; from?: string; to?: string }> };

export default async function AgendaPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const [events, categories, communes] = await Promise.all([
    api.events.list({ page, category: params.category, commune: params.commune, from: params.from, to: params.to }),
    api.events.categories(),
    api.communes(),
  ]);
  const filterParams = new URLSearchParams();
  if (params.category) filterParams.set("category", params.category);
  if (params.commune) filterParams.set("commune", params.commune);
  if (params.from) filterParams.set("from", params.from);
  if (params.to) filterParams.set("to", params.to);
  const baseUrl = filterParams.size ? `/agenda?${filterParams.toString()}` : "/agenda";

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-6 sm:py-10">
      <header className="mb-8 border-b border-slate-200 pb-6">
        <Link href="/" className="text-sm text-slate-600 hover:text-[#1a4d6e]">← Accueil</Link>
        <h1 className="mt-3 font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">Agenda local</h1>
        <p className="mt-2 max-w-2xl text-slate-600">Tous les rendez-vous à venir : culture, fêtes, sport, vie associative et marchés.</p>
      </header>

      <form className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs font-medium text-slate-600">Catégorie<select name="category" defaultValue={params.category ?? ""} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"><option value="">Toutes</option>{categories.map((category) => <option key={category.id} value={category.slug}>{category.name}</option>)}</select></label>
        <label className="text-xs font-medium text-slate-600">Commune<select name="commune" defaultValue={params.commune ?? ""} className="mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"><option value="">Toutes</option>{communes.filter((commune) => commune.is_active).map((commune) => <option key={commune.id} value={commune.slug}>{commune.name}</option>)}</select></label>
        <label className="text-xs font-medium text-slate-600">Du<input type="date" name="from" defaultValue={params.from ?? ""} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-2 text-sm" /></label>
        <label className="text-xs font-medium text-slate-600">Au<input type="date" name="to" defaultValue={params.to ?? ""} className="mt-1 h-10 w-full rounded-md border border-slate-300 px-2 text-sm" /></label>
        <div className="flex items-end gap-2"><button className="h-10 flex-1 rounded-md bg-[#1a4d6e] px-3 text-sm font-medium text-white">Filtrer</button><Link href="/agenda" className="inline-flex h-10 items-center px-2 text-xs text-slate-500 underline">Effacer</Link></div>
      </form>

      <div className="mb-7"><AdSlot placement="agenda_top" communeSlug={params.commune} /></div>

      {events.results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-600">Aucun rendez-vous ne correspond à ces critères.</div>
      ) : (
        <><div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{events.results.map((event) => <EventCard key={event.id} event={event} />)}</div><Pagination currentPage={page} totalCount={events.count} pageSize={20} baseUrl={baseUrl} /></>
      )}
    </div>
  );
}

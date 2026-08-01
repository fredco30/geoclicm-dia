import type { Metadata } from "next";
import { AdSlot } from "@/components/ads/ad-slot";
import { AgendaFeatured } from "@/components/events/agenda-featured";
import { EventRow } from "@/components/events/event-row";
import { AgendaFilters } from "@/components/events/agenda-filters";
import { AgendaMapExplorer } from "@/components/events/agenda-map-explorer";
import { Pagination } from "@/components/ui/pagination";
import { api } from "@/lib/api";
import type { EventListItem } from "@/types/api";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Agenda local",
  description: "Sorties, fêtes, culture, sport et rendez-vous du littoral camarguais.",
};

function monthKey(iso: string): string {
  // Clé ISO "YYYY-MM" (tri/fiable), indépendante du format d'affichage localisé.
  const parts = new Intl.DateTimeFormat("fr-FR", { year: "numeric", month: "2-digit", timeZone: "Europe/Paris" }).formatToParts(new Date(iso));
  const year = parts.find((p) => p.type === "year")?.value ?? "";
  const month = parts.find((p) => p.type === "month")?.value ?? "";
  return `${year}-${month}`;
}

// Certaines occurrences en prod ont un starts_at vide/invalide : on ne groupe
// par mois que si la date est exploitable, sinon on renvoie null (groupe "à venir").
function safeMonthKey(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : monthKey(iso);
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  const label = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(new Date(Number(year), Number(month) - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

type Props = { searchParams: Promise<{ page?: string; category?: string; commune?: string; from?: string; to?: string; event?: string }> };

export default async function AgendaPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const eventFilters = { category: params.category, commune: params.commune, from: params.from, to: params.to };
  const [events, mapEvents, categories, communes] = await Promise.all([
    api.events.list({ page, ...eventFilters }),
    api.events.map(eventFilters),
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
      <header className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-4">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Agenda</h1>
        <p className="text-sm text-slate-500">{events.count} rendez-vous à venir</p>
      </header>

      <AgendaFilters
        categories={categories}
        communes={communes}
        values={{ category: params.category, commune: params.commune, from: params.from, to: params.to }}
      />

      <div className="mb-7"><AdSlot placement="agenda_top" communeSlug={params.commune} /></div>

      <AgendaMapExplorer events={mapEvents} initialSelectedSlug={params.event} />

      {events.results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center text-slate-600">Aucun rendez-vous ne correspond à ces critères.</div>
      ) : (
        <>
          <AgendaFeatured communeSlug={params.commune} />
          <EventGroups events={events.results} />
          <Pagination currentPage={page} totalCount={events.count} pageSize={20} baseUrl={baseUrl} />
        </>
      )}
    </div>
  );
}

function EventGroups({ events }: { events: EventListItem[] }) {
  const groups = new Map<string, EventListItem[]>();
  for (const event of events) {
    const occ = event.next_occurrence;
    const key = (occ && safeMonthKey(occ.starts_at)) || "à venir";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(event);
  }
  return (
    <div>
      {Array.from(groups.entries()).map(([key, items]) => (
        <section key={key} className="mb-6">
          <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
            {key === "à venir" ? "Sans date précise" : monthLabel(key)}
          </h2>
          <div className="flex flex-col gap-2">
            {items.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";

import { occurrenceSummary } from "@/lib/event-dates";
import type { EventListItem } from "@/types/api";

export function EventCard({ event }: { event: EventListItem }) {
  return (
    <article className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/agenda/${event.slug}`}>
        {event.cover_image?.medium ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.cover_image.medium} alt="" className="aspect-[16/9] w-full object-cover" />
        ) : (
          <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-camargue/10 to-terracotta/10">
            <CalendarDays className="h-10 w-10 text-camargue/60" />
          </div>
        )}
        <div className="p-4">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full px-2 py-0.5 font-medium text-white" style={{ backgroundColor: event.category.color }}>{event.category.name}</span>
            {event.kind === "market" && event.category.name.toLowerCase() !== "marché" ? <span className="rounded-full bg-amber-100 px-2 py-0.5 font-medium text-amber-900">Marché</span> : null}
          </div>
          <h2 className="font-serif text-xl font-semibold text-slate-900 group-hover:text-camargue">{event.title}</h2>
          {event.next_occurrence ? (
            <p className="mt-3 flex items-start gap-2 text-sm font-medium text-terracotta"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0" /> {occurrenceSummary(event.next_occurrence)}</p>
          ) : null}
          <p className="mt-1 flex items-start gap-2 text-sm text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {Array.from(new Set([event.venue_name, event.commune_name].filter(Boolean))).join(", ")}</p>
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-slate-600">{event.short_description}</p>
          {event.price ? <p className="mt-3 text-xs font-medium text-slate-700">{event.price}</p> : null}
        </div>
      </Link>
    </article>
  );
}

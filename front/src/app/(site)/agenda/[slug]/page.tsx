import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, Download, ExternalLink, Mail, MapPin, Phone } from "lucide-react";

import { ArticleBody } from "@/components/articles/article-body";
import { ApiError, api } from "@/lib/api";
import type { EventDetail, EventOccurrence } from "@/types/api";

export const revalidate = 300;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const event = await api.events.detail((await params).slug);
    return { title: event.meta_title || event.title, description: event.meta_description || event.short_description, openGraph: { title: event.title, description: event.short_description, images: event.cover_image?.large ? [event.cover_image.large] : undefined } };
  } catch { return { title: "Événement introuvable" }; }
}

function formatOccurrence(occurrence: EventOccurrence): string {
  const start = new Date(occurrence.starts_at);
  const end = new Date(occurrence.ends_at);
  const date = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Paris" }).format(start);
  if (occurrence.is_all_day) return `${date} — toute la journée`;
  const time = (value: Date) => new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(value);
  return `${date}, de ${time(start)} à ${time(end)}`;
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  let event: EventDetail;
  try { event = await api.events.detail(slug); } catch (error) { if (error instanceof ApiError && error.status === 404) notFound(); throw error; }
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";
  const upcoming = event.occurrences.filter((item) => new Date(item.ends_at) >= new Date()).sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  return (
    <article className="mx-auto max-w-screen-lg px-4 py-6 sm:py-10">
      <Link href="/agenda" className="text-sm text-slate-600 hover:text-[#1a4d6e]">← Agenda</Link>
      <header className="mt-5 grid gap-7 lg:grid-cols-[minmax(0,1fr),320px]">
        <div>
          <div className="mb-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full px-2 py-1 font-medium text-white" style={{ backgroundColor: event.category.color }}>{event.category.name}</span>{event.kind === "market" ? <span className="rounded-full bg-amber-100 px-2 py-1 font-medium text-amber-900">Marché</span> : null}</div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">{event.title}</h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-700">{event.short_description}</p>
        </div>
        <aside className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Prochaines dates</h2>
          <div className="mt-3 space-y-3">{upcoming.map((occurrence) => <div key={occurrence.id} className={occurrence.status === "cancelled" ? "text-red-700 line-through" : "text-slate-700"}><p className="flex gap-2 text-sm"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0" /> {formatOccurrence(occurrence)}</p>{occurrence.note ? <p className="ml-6 text-xs">{occurrence.note}</p> : null}</div>)}</div>
          <a href={`${apiUrl}/api/events/${event.slug}/calendar.ics`} className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-[#1a4d6e] underline"><Download className="h-4 w-4" /> Ajouter au calendrier</a>
        </aside>
      </header>

      {event.cover_image?.large ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.cover_image.large} alt="" className="mt-8 max-h-[560px] w-full rounded-2xl object-cover" />
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr),280px]">
        <ArticleBody content={event.description} />
        <aside className="space-y-3 rounded-xl bg-slate-50 p-5 text-sm text-slate-700">
          <h2 className="font-semibold text-slate-900">Informations pratiques</h2>
          <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> <span>{event.venue_name}<br />{event.address}<br />{event.commune_name}</span></p>
          {event.price ? <p><strong>Tarif :</strong> {event.price}</p> : null}
          {event.organizer ? <p><strong>Organisateur :</strong> {event.organizer}</p> : null}
          {event.contact_phone ? <a href={`tel:${event.contact_phone}`} className="flex items-center gap-2 underline"><Phone className="h-4 w-4" /> {event.contact_phone}</a> : null}
          {event.contact_email ? <a href={`mailto:${event.contact_email}`} className="flex items-center gap-2 underline"><Mail className="h-4 w-4" /> {event.contact_email}</a> : null}
          {event.booking_url ? <a href={event.booking_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-md bg-[#a8533a] px-3 py-2 font-medium text-white"><ExternalLink className="h-4 w-4" /> Réserver</a> : null}
          {event.official_url ? <a href={event.official_url} target="_blank" rel="noopener noreferrer" className="block text-[#1a4d6e] underline">Site officiel</a> : null}
          {event.business_slug ? <Link href={`/commerces/${event.business_slug}`} className="block text-[#1a4d6e] underline">Voir {event.business_name} dans l’annuaire</Link> : null}
        </aside>
      </div>
    </article>
  );
}

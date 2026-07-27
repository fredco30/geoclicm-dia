import Link from "next/link";
import { CalendarDays, Edit, Eye, MapPin, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCookieHeader } from "@/lib/auth-server";
import type { EventDetail } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "bg-slate-100 text-slate-700" },
  published: { label: "Publié", className: "bg-green-100 text-green-800" },
  cancelled: { label: "Annulé", className: "bg-red-100 text-red-800" },
  archived: { label: "Archivé", className: "bg-slate-100 text-slate-500" },
};

async function fetchEvents(): Promise<EventDetail[]> {
  const cookieHeader = await getCookieHeader();
  const response = await fetch(`${API_URL}/api/admin/events/`, {
    headers: { Cookie: cookieHeader, Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) return [];
  return response.json() as Promise<EventDetail[]>;
}

function formatOccurrence(value: string | undefined): string {
  if (!value) return "Aucune date à venir";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date(value));
}

export default async function AgendaAdminPage() {
  const events = await fetchEvents();

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Agenda</h1>
          <p className="text-sm text-slate-500">
            Événements et marchés partagent les mêmes dates, filtres et règles de publication.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/agenda/categories"><Button variant="secondary" size="sm">Catégories</Button></Link>
          <Link href="/admin/agenda/new"><Button size="sm"><Plus className="h-4 w-4" /> Nouvel événement</Button></Link>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-sm text-slate-600">
          Aucun événement. Commence par créer un brouillon puis ajoute au moins une date avant publication.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-600">
              <tr><th className="px-3 py-2">Titre</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Prochaine date</th><th className="px-3 py-2">Commune</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {events.map((event) => {
                const status = STATUS_LABELS[event.status] ?? STATUS_LABELS.draft;
                return (
                  <tr key={event.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2"><div className="font-medium text-slate-900">{event.title}</div><div className="text-xs text-slate-500">{event.category.name}</div></td>
                    <td className="px-3 py-2"><span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-800">{event.kind === "market" ? "Marché" : "Événement"}</span></td>
                    <td className="px-3 py-2 text-slate-600"><span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {formatOccurrence(event.next_occurrence?.starts_at)}</span></td>
                    <td className="px-3 py-2 text-slate-600"><span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {event.commune_name}</span></td>
                    <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.className}`}>{status.label}</span></td>
                    <td className="px-3 py-2 text-right"><div className="inline-flex gap-1">{event.status === "published" ? <Link href={`/agenda/${event.slug}`} target="_blank" className="rounded-md p-2 text-slate-600 hover:bg-slate-100" aria-label="Voir"><Eye className="h-4 w-4" /></Link> : null}<Link href={`/admin/agenda/${event.slug}/edit`} className="rounded-md p-2 text-slate-600 hover:bg-slate-100" aria-label="Éditer"><Edit className="h-4 w-4" /></Link></div></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

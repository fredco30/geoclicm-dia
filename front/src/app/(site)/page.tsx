import { api } from "@/lib/api";
import { UneCarousel } from "@/components/home/une-carousel";
import { SearchTrigger } from "@/components/home/search-trigger";
import { TileGrid } from "@/components/tiles/tile-grid";
import Link from "next/link";
import { AdSlot } from "@/components/ads/ad-slot";
import { EventRow } from "@/components/events/event-row";
import { isOngoing } from "@/lib/event-dates";

export const revalidate = 60;

/**
 * Home v2 — pattern « city » :
 *  1. Bandeau "À la une" (carrousel articles featured / récents)
 *  2. Barre de recherche / question (stub vers /recherche, drawer IA en PR 7)
 *  3. Trois prochains rendez-vous de l'Agenda (masqué s'il n'y en a pas)
 *  3 bis. Grille de tuiles thématiques actives
 *  4. Encart publicitaire home_sidebar (préservé pour la régie)
 *
 * Pages détail (article, commune, commerce, météo) restent inchangées.
 */
export default async function HomePage() {
  const [articlesData, tiles, eventsData] = await Promise.all([
    api.articles.list({ ordering: "-published_at" }).catch(() => null),
    api.tiles.list({ onHome: true }).catch(() => []),
    api.events.list().catch(() => null),
  ]);
  // Les trois prochains rendez-vous datés : les périodes en cours (expos,
  // marchés à l'année) restent dans l'Agenda, elles n'ont rien d'imminent.
  const upcoming = (eventsData?.results ?? [])
    .filter((event) => event.next_occurrence && !isOngoing(event.next_occurrence))
    .slice(0, 3);

  const articles = articlesData?.results ?? [];
  // Ordre : les featured d'abord, puis les autres récents. 5 max.
  const sortedForUne = [
    ...articles.filter((a) => a.is_featured),
    ...articles.filter((a) => !a.is_featured),
  ].slice(0, 5);

  return (
    <div className="mx-auto max-w-screen-xl space-y-6 px-4 py-4 sm:py-8">
      <h1 className="sr-only">
        geoclicMédia — le média local du littoral camarguais
      </h1>
      <UneCarousel articles={sortedForUne} />

      <SearchTrigger />

      {upcoming.length > 0 ? (
        <section aria-labelledby="upcoming-title">
          <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
            <h2 id="upcoming-title" className="font-serif text-lg font-semibold text-slate-900">
              Prochains rendez-vous
            </h2>
            <Link href="/agenda" className="text-sm text-camargue hover:underline">
              Tout l&apos;agenda →
            </Link>
          </div>
          <div className="grid gap-2 lg:grid-cols-3">
            {upcoming.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        </section>
      ) : null}

      <TileGrid tiles={tiles} />

      {/* Encart publicitaire — préservé pour la régie en attendant les
          placements home_grid_inline éventuels d'une PR future. */}
      <div className="pt-2">
        <AdSlot placement="home_sidebar" />
      </div>
    </div>
  );
}

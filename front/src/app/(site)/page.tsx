import { api } from "@/lib/api";
import { UneCarousel } from "@/components/home/une-carousel";
import { SearchTrigger } from "@/components/home/search-trigger";
import { TileGrid } from "@/components/tiles/tile-grid";
import { AdSlot } from "@/components/ads/ad-slot";

export const revalidate = 60;

/**
 * Home v2 — pattern « city » :
 *  1. Bandeau "À la une" (carrousel articles featured / récents)
 *  2. Barre de recherche / question (stub vers /recherche, drawer IA en PR 7)
 *  3. Grille de tuiles thématiques (Actualités, Météo, Commerçants, Agenda…)
 *  4. Encart publicitaire home_sidebar (préservé pour la régie)
 *
 * Pages détail (article, commune, commerce, météo) restent inchangées.
 */
export default async function HomePage() {
  const [articlesData, tiles] = await Promise.all([
    api.articles.list({ ordering: "-published_at" }).catch(() => null),
    api.tiles.list({ onHome: true }).catch(() => []),
  ]);

  const articles = articlesData?.results ?? [];
  // Ordre : les featured d'abord, puis les autres récents. 5 max.
  const sortedForUne = [
    ...articles.filter((a) => a.is_featured),
    ...articles.filter((a) => !a.is_featured),
  ].slice(0, 5);

  return (
    <div className="mx-auto max-w-screen-xl space-y-6 px-4 py-4 sm:py-8">
      <UneCarousel articles={sortedForUne} />

      <SearchTrigger />

      <TileGrid tiles={tiles} />

      {/* Encart publicitaire — préservé pour la régie en attendant les
          placements home_grid_inline éventuels d'une PR future. */}
      <div className="pt-2">
        <AdSlot placement="home_sidebar" />
      </div>
    </div>
  );
}

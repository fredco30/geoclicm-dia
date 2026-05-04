import Link from "next/link";
import { api } from "@/lib/api";
import { ArticleCard } from "@/components/articles/article-card";
import { CategoryBadge } from "@/components/articles/category-badge";
import { BusinessFeaturedSection } from "@/components/businesses/business-featured-section";
import { AdSlot } from "@/components/ads/ad-slot";

export const revalidate = 60;

export default async function HomePage() {
  const [articlesData, categories, featuredBusinessesData] = await Promise.all([
    api.articles.list({ ordering: "-published_at" }).catch(() => null),
    api.categories().catch(() => []),
    api.businesses
      .list({ is_featured: true, ordering: "name" })
      .catch(() => null),
  ]);

  const articles = articlesData?.results ?? [];
  const featured = articles.find((a) => a.is_featured) ?? articles[0] ?? null;
  const rest = articles.filter((a) => a.id !== featured?.id);
  const featuredBusinesses = (featuredBusinessesData?.results ?? []).slice(0, 4);

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-4 sm:py-10">
      {/* HERO À LA UNE */}
      {featured ? <Hero featured={featured} /> : <EmptyHero />}

      {/* CATÉGORIES — scroll horizontal mobile, wrap desktop */}
      {categories.length > 0 ? (
        <section className="mt-6 sm:mt-10" aria-label="Rubriques">
          <h2 className="sr-only">Rubriques</h2>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 scrollbar-thin sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/categories/${c.slug}`}
                className="inline-flex shrink-0 items-center rounded-full border-[1.5px] bg-[#fbf9f5] px-3 py-1.5 text-sm font-medium transition hover:bg-white"
                style={{ borderColor: c.color, color: c.color }}
              >
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* GRILLE DES DERNIERS ARTICLES */}
      {rest.length > 0 ? (
        <section className="mt-10 sm:mt-14" aria-label="Derniers articles">
          <h2 className="mb-4 font-serif text-xl font-semibold tracking-tight text-slate-900 sm:mb-6 sm:text-2xl">
            Derniers articles
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {rest.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ENCART HOME — entre grille articles et commerces partenaires */}
      <div className="mt-10 sm:mt-14">
        <AdSlot placement="home_sidebar" />
      </div>

      {/* COMMERCES PARTENAIRES (si fiches mises en avant publiées) */}
      <BusinessFeaturedSection
        title="Commerces partenaires"
        subtitle="Les acteurs locaux mis en avant ce mois-ci sur le territoire camarguais."
        businesses={featuredBusinesses}
        seeAllHref="/commerces"
      />

      {articles.length === 0 ? <EmptyState /> : null}
    </div>
  );
}

/**
 * HERO — deux layouts :
 * - Mobile (<sm) : image edge-to-edge en haut, texte dessous sur fond off-white (lisibilité max).
 * - Desktop (≥sm) : image avec letterbox+blur background + texte surimprimé (effet magazine).
 */
function Hero({ featured }: { featured: NonNullable<Awaited<ReturnType<typeof api.articles.list>>["results"][number]> }) {
  const cover = featured.cover_image?.large;

  return (
    <article className="overflow-hidden rounded-2xl bg-slate-900 text-white shadow-md">
      {/* === MOBILE LAYOUT (image puis texte) === */}
      <div className="sm:hidden">
        <Link href={`/articles/${featured.slug}`} className="group block">
          <div className="relative aspect-[16/10] bg-slate-800">
            {cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={cover}
                alt={featured.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-[#1a4d6e] to-[#2c6a93]" />
            )}
          </div>
          <div className="bg-slate-900 p-5">
            <CategoryBadge category={featured.category} className="mb-3" />
            <h1 className="font-serif text-3xl font-semibold leading-[1.15] tracking-tight">
              {featured.title}
            </h1>
            {featured.chapeau ? (
              <p className="mt-2 text-base leading-snug text-slate-200">
                {featured.chapeau}
              </p>
            ) : null}
          </div>
        </Link>
      </div>

      {/* === DESKTOP LAYOUT (letterbox + blur + surimpression) === */}
      <Link
        href={`/articles/${featured.slug}`}
        className="group hidden sm:block"
      >
        <div className="relative aspect-[2/1]">
          {cover ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-50"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover}
                alt={featured.title}
                className="absolute inset-0 h-full w-full object-contain transition group-hover:opacity-95"
              />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a4d6e] to-[#2c6a93]" />
          )}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <CategoryBadge category={featured.category} className="mb-3" />
            <h1 className="font-serif text-5xl font-semibold leading-[1.1] tracking-tight drop-shadow-md md:text-6xl">
              {featured.title}
            </h1>
            {featured.chapeau ? (
              <p className="mt-3 max-w-2xl font-serif text-lg italic text-slate-100 drop-shadow">
                {featured.chapeau}
              </p>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}

function EmptyHero() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-600">
      <h1 className="font-serif text-2xl font-semibold text-slate-900">geoclicMédia</h1>
      <p className="mt-2">
        Les premiers articles arrivent bientôt. En attendant, l&apos;équipe
        rédactionnelle prépare une couverture complète du territoire.
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-600">
      <p>
        Aucun article publié pour l&apos;instant. Connecte-toi à l&apos;administration pour publier le premier.
      </p>
    </div>
  );
}

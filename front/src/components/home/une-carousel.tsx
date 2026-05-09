"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play } from "lucide-react";

import { CategoryBadge } from "@/components/articles/category-badge";
import type { ArticleListItem } from "@/types/api";

const AUTO_INTERVAL_MS = 6000; // défilement auto toutes les 6 secondes

type Props = {
  articles: ArticleListItem[];
};

/**
 * Carrousel "À la une" avec défilement automatique, pattern « city ».
 *
 * Comportement :
 *  - Auto-advance toutes les 6 secondes (configurable via AUTO_INTERVAL_MS).
 *  - Pause au survol (desktop) ou au focus (clavier/lecteur d'écran).
 *  - Bouton pause manuel persistant en haut-droite du carrousel.
 *  - Indicateurs (puces) cliquables sous le carrousel pour aller direct à
 *    un slide.
 *  - Scroll-snap maintenu — l'utilisateur peut toujours faire défiler à la
 *    main et la pause auto se déclenche pendant 12s pour ne pas l'embêter.
 *  - Si moins de 2 articles, on n'affiche ni l'autoplay ni les indicateurs
 *    (rien à faire défiler).
 */
export function UneCarousel({ articles }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const userInteractionUntil = useRef<number>(0);

  const total = articles.length;
  const canCycle = total > 1;

  // Auto-advance — désactivé si pause manuelle, hover, ou interaction récente.
  useEffect(() => {
    if (!canCycle || isPaused || hovered) return;
    const handle = setInterval(() => {
      // Si l'utilisateur a scrollé manuellement il y a moins de 12s,
      // on suspend l'auto-advance pour ne pas le contredire.
      if (Date.now() < userInteractionUntil.current) return;
      setCurrentIndex((i) => (i + 1) % total);
    }, AUTO_INTERVAL_MS);
    return () => clearInterval(handle);
  }, [canCycle, isPaused, hovered, total]);

  // Scroll programmatique vers le slide courant à chaque changement d'index.
  useEffect(() => {
    const card = cardRefs.current[currentIndex];
    if (!card) return;
    card.scrollIntoView({
      behavior: "smooth",
      inline: "start",
      block: "nearest",
    });
  }, [currentIndex]);

  // Synchronisation : si l'utilisateur scrolle manuellement (swipe mobile),
  // on détecte quel slide est le plus visible et on synchronise currentIndex.
  // Repousse aussi userInteractionUntil pour ne pas auto-advance dans la
  // foulée.
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !canCycle) return;

    let scrollTimer: number | null = null;
    const onScroll = () => {
      userInteractionUntil.current = Date.now() + 12_000;
      if (scrollTimer !== null) window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        // Trouve la carte la plus alignée à gauche du container
        const containerLeft = container.scrollLeft;
        let bestIdx = 0;
        let bestDist = Infinity;
        cardRefs.current.forEach((card, i) => {
          if (!card) return;
          const dist = Math.abs(card.offsetLeft - containerLeft);
          if (dist < bestDist) {
            bestDist = dist;
            bestIdx = i;
          }
        });
        setCurrentIndex(bestIdx);
      }, 150);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
      if (scrollTimer !== null) window.clearTimeout(scrollTimer);
    };
  }, [canCycle]);

  if (total === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        Les premiers articles arriveront bientôt sur geoclicMédia.
      </div>
    );
  }

  return (
    <section
      aria-label="À la une"
      aria-roledescription="carousel"
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={(e) => {
        // Ne désactive le hover que si le focus part vraiment du carrousel.
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
          setHovered(false);
        }
      }}
    >
      <div
        ref={containerRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4"
        style={{ scrollbarWidth: "thin" }}
      >
        {articles.map((a, i) => (
          <div
            key={a.id}
            ref={(el) => {
              cardRefs.current[i] = el;
            }}
            aria-roledescription="slide"
            aria-label={`Article ${i + 1} sur ${total}`}
            className="w-[88%] shrink-0 snap-start sm:w-[64%] md:w-[48%] lg:w-[40%]"
          >
            <UneCard article={a} />
          </div>
        ))}
      </div>

      {canCycle ? (
        <>
          {/* Bouton pause/play en overlay */}
          <button
            type="button"
            onClick={() => setIsPaused((v) => !v)}
            aria-label={isPaused ? "Reprendre le défilement" : "Mettre en pause le défilement"}
            className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur transition hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            {isPaused ? (
              <Play className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <Pause className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>

          {/* Indicateurs (puces) */}
          <div
            className="mt-1 flex items-center justify-center gap-1.5"
            role="tablist"
            aria-label="Sélectionner un article"
          >
            {articles.map((a, i) => {
              const isActive = i === currentIndex;
              return (
                <button
                  key={a.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-label={`Aller à l'article ${i + 1}`}
                  onClick={() => setCurrentIndex(i)}
                  className={
                    "h-1.5 rounded-full transition-all " +
                    (isActive
                      ? "w-6 bg-[#1a4d6e]"
                      : "w-1.5 bg-slate-300 hover:bg-slate-400")
                  }
                />
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}

function UneCard({ article }: { article: ArticleListItem }) {
  const cover = article.cover_image?.large ?? article.cover_image?.medium;

  return (
    <Link
      href={`/articles/${article.slug}`}
      className="group relative block overflow-hidden rounded-2xl bg-slate-900 text-white shadow-md"
    >
      <div className="relative aspect-[16/10]">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt={article.title}
            className="absolute inset-0 h-full w-full object-cover transition group-hover:opacity-95"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#1a4d6e] to-[#2c6a93]" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
          <CategoryBadge category={article.category} className="mb-2" />
          <h2 className="font-serif text-xl font-semibold leading-tight drop-shadow sm:text-2xl">
            {article.title}
          </h2>
          {article.chapeau ? (
            <p className="mt-1 line-clamp-2 text-sm text-slate-100/95 drop-shadow sm:text-base">
              {article.chapeau}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

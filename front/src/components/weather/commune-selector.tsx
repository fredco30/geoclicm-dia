import Link from "next/link";
import type { Commune } from "@/types/api";

type Props = {
  communes: Commune[];
  activeSlug: string;
};

export function CommuneSelector({ communes, activeSlug }: Props) {
  return (
    <nav aria-label="Choisir une commune" className="overflow-x-auto">
      <ul className="flex gap-2 pb-1 text-sm">
        {communes.map((c) => {
          const active = c.slug === activeSlug;
          return (
            <li key={c.slug} className="shrink-0">
              <Link
                href={`/meteo/${c.slug}`}
                aria-current={active ? "page" : undefined}
                className={
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 transition " +
                  (active
                    ? "bg-[#1a4d6e] text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:ring-[#1a4d6e]")
                }
              >
                {c.name}
                {c.is_coastal ? (
                  <span
                    aria-hidden
                    className={
                      active
                        ? "rounded bg-white/20 px-1 text-[10px] font-medium"
                        : "rounded bg-cyan-100 px-1 text-[10px] font-medium text-cyan-700"
                    }
                    title="Commune côtière"
                  >
                    mer
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

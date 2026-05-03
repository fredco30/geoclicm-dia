import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  baseUrl: string;
};

export function Pagination({ currentPage, totalCount, pageSize, baseUrl }: Props) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) return null;

  const buildUrl = (page: number): string => {
    const sep = baseUrl.includes("?") ? "&" : "?";
    return page === 1 ? baseUrl : `${baseUrl}${sep}page=${page}`;
  };

  const pages = pagesAround(currentPage, totalPages);

  return (
    <nav
      className="mt-8 flex items-center justify-center gap-1"
      aria-label="Pagination"
    >
      {currentPage > 1 ? (
        <Link
          href={buildUrl(currentPage - 1)}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-4 w-4" /> Précédent
        </Link>
      ) : null}

      {pages.map((p, i) =>
        p === null ? (
          <span key={`gap-${i}`} className="px-2 text-slate-400">
            …
          </span>
        ) : p === currentPage ? (
          <span
            key={p}
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-md bg-[#1a4d6e] px-3 text-sm font-semibold text-white"
            aria-current="page"
          >
            {p}
          </span>
        ) : (
          <Link
            key={p}
            href={buildUrl(p)}
            className="inline-flex h-9 min-w-9 items-center justify-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {p}
          </Link>
        ),
      )}

      {currentPage < totalPages ? (
        <Link
          href={buildUrl(currentPage + 1)}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          aria-label="Page suivante"
        >
          Suivant <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </nav>
  );
}

function pagesAround(current: number, total: number): (number | null)[] {
  const range = 2;
  const pages: (number | null)[] = [];
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || (p >= current - range && p <= current + range)) {
      pages.push(p);
    } else if (pages[pages.length - 1] !== null) {
      pages.push(null);
    }
  }
  return pages;
}

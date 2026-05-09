import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  currentPage: number;
  totalCount: number;
  pageSize: number;
  /** SearchParams courants à conserver entre les pages. */
  baseQueryParams: Record<string, string>;
};

/**
 * Pagination simple Previous/Next avec indicateur « Page X / Y ».
 *
 * Pour la page /admin/settings/users : préserve les paramètres role,
 * search, ordering en plus de page.
 */
export function UsersPagination({
  currentPage,
  totalCount,
  pageSize,
  baseQueryParams,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalPages <= 1) return null;

  const buildQuery = (page: number) => {
    const params = new URLSearchParams(baseQueryParams);
    if (page > 1) params.set("page", String(page));
    else params.delete("page");
    return params.toString();
  };

  const prevQs = buildQuery(currentPage - 1);
  const nextQs = buildQuery(currentPage + 1);

  return (
    <nav
      aria-label="Pagination"
      className="mt-4 flex items-center justify-between text-sm"
    >
      <span className="text-slate-500">
        Page <strong className="text-slate-800">{currentPage}</strong> /{" "}
        {totalPages} ({totalCount} comptes)
      </span>
      <div className="flex items-center gap-1">
        {currentPage > 1 ? (
          <Link
            href={`/admin/settings/users${prevQs ? `?${prevQs}` : ""}`}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50"
            rel="prev"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            Précédent
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-400">
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
            Précédent
          </span>
        )}
        {currentPage < totalPages ? (
          <Link
            href={`/admin/settings/users${nextQs ? `?${nextQs}` : ""}`}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-700 hover:bg-slate-50"
            rel="next"
          >
            Suivant
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-400">
            Suivant
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}

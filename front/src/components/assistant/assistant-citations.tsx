import { ExternalLink } from "lucide-react";

import type { AssistantCitation } from "@/types/api";

type Props = {
  citations: AssistantCitation[];
  label: string;
};

const SOURCE_LABELS: Record<string, string> = {
  business: "Commerce",
  article: "Article",
  mairie: "Mairie",
  ot: "Office de tourisme",
  wikipedia: "Wikipedia",
  datatourisme: "DataTourisme",
  osm: "OpenStreetMap",
  tile: "Rubrique",
};

export function AssistantCitations({ citations, label }: Props) {
  if (citations.length === 0) return null;

  return (
    <div className="mt-3 border-t border-slate-200 pt-3">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <ol className="space-y-1 text-xs">
        {citations.map((c) => {
          const sourceLabel = SOURCE_LABELS[c.source_kind] ?? c.source_kind;
          const isInternal =
            c.source_url.startsWith("/") &&
            !c.source_url.startsWith("//");
          return (
            <li key={c.chunk_id} className="flex items-start gap-1.5">
              <span className="mt-0.5 inline-flex shrink-0 items-center rounded bg-slate-100 px-1 py-0.5 text-[10px] font-medium text-slate-600">
                {sourceLabel}
              </span>
              {c.source_url ? (
                <a
                  href={c.source_url}
                  target={isInternal ? undefined : "_blank"}
                  rel={isInternal ? undefined : "noopener noreferrer"}
                  className="inline-flex items-start gap-1 text-slate-600 hover:text-[#1a4d6e] hover:underline"
                >
                  <span className="line-clamp-2">{c.title}</span>
                  {!isInternal ? (
                    <ExternalLink
                      className="mt-0.5 h-3 w-3 shrink-0 opacity-50"
                      aria-hidden
                    />
                  ) : null}
                  {c.is_premium ? (
                    <span
                      className="rounded bg-amber-100 px-1 text-[9px] font-semibold uppercase text-amber-800"
                      title="Partenaire premium"
                    >
                      ⭐ Partenaire
                    </span>
                  ) : null}
                </a>
              ) : (
                <span className="text-slate-600">{c.title}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * Primitives de présentation utilisées dans les workflows d'aide.
 *
 * Les workflows sont des composants React (pas du markdown), ce qui permet
 * d'utiliser ces primitives pour un rendu riche et cohérent : callouts
 * colorés, étapes numérotées, raccourcis clavier, listes de champs...
 */
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
} from "lucide-react";

/* ------------------------------------------------------------------------ */
/* Callouts colorés                                                          */
/* ------------------------------------------------------------------------ */

export function Tip({ children }: { children: ReactNode }) {
  return (
    <div className="my-3 flex gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

export function Warning({ children }: { children: ReactNode }) {
  return (
    <div className="my-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
      <AlertTriangle
        className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
        aria-hidden
      />
      <div>{children}</div>
    </div>
  );
}

export function KeyTip({ children }: { children: ReactNode }) {
  return (
    <div className="my-3 flex gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
      <Lightbulb
        className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
        aria-hidden
      />
      <div>{children}</div>
    </div>
  );
}

export function Done({ children }: { children: ReactNode }) {
  return (
    <div className="my-3 flex gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
      <CheckCircle2
        className="mt-0.5 h-4 w-4 shrink-0 text-slate-500"
        aria-hidden
      />
      <div>{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Mise en avant inline                                                      */
/* ------------------------------------------------------------------------ */

/** Pour citer un nom de bouton, un libellé de champ. */
export function UI({ children }: { children: ReactNode }) {
  return (
    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.8125em] text-slate-800 ring-1 ring-slate-200">
      {children}
    </span>
  );
}

/** Pour un raccourci clavier (Ctrl+S, etc.). */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[0.75em] text-slate-700 shadow-[0_1px_0_0_rgb(203_213_225)]">
      {children}
    </kbd>
  );
}

/** Pour citer une route (`/admin/articles/new`). */
export function Path({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-[#1a4d6e]/5 px-1.5 py-0.5 font-mono text-[0.8125em] text-[#1a4d6e]">
      {children}
    </code>
  );
}

/* ------------------------------------------------------------------------ */
/* Listes structurées                                                        */
/* ------------------------------------------------------------------------ */

/** Liste « champs à remplir » avec libellé + description. */
export function FieldList({
  items,
}: {
  items: { label: string; description: ReactNode; required?: boolean }[];
}) {
  return (
    <dl className="my-3 space-y-2 rounded-lg border border-slate-200 bg-white p-3 text-sm">
      {items.map((it) => (
        <div key={it.label} className="grid grid-cols-[auto_1fr] gap-x-3">
          <dt className="font-semibold text-slate-800">
            {it.label}
            {it.required ? (
              <span className="ml-1 text-[#a8533a]" aria-label="obligatoire">
                *
              </span>
            ) : null}
          </dt>
          <dd className="text-slate-600">{it.description}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Étape interne courte (sub-step à l'intérieur d'un Step). */
export function SubSteps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="my-2 list-decimal space-y-1.5 pl-5 text-sm text-slate-700 marker:text-[#1a4d6e] marker:font-semibold">
      {items.map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------------ */
/* Bloc d'étape numérotée (utilisé par WorkflowRenderer)                     */
/* ------------------------------------------------------------------------ */

export function StepBlock({
  number,
  title,
  icon: Icon,
  active = false,
  children,
  anchorId,
}: {
  number: number;
  title: string;
  icon?: LucideIcon;
  active?: boolean;
  children: ReactNode;
  anchorId: string;
}) {
  return (
    <section
      id={anchorId}
      aria-current={active ? "step" : undefined}
      className={
        "rounded-xl border p-4 transition " +
        (active
          ? "border-[#1a4d6e] bg-[#1a4d6e]/5 shadow-sm"
          : "border-slate-200 bg-white")
      }
    >
      <header className="mb-3 flex items-center gap-3">
        <span
          className={
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold " +
            (active
              ? "bg-[#1a4d6e] text-white"
              : "bg-slate-100 text-slate-600")
          }
        >
          {number}
        </span>
        <h3 className="flex items-center gap-2 font-serif text-base font-semibold text-slate-900">
          {Icon ? <Icon className="h-4 w-4 text-[#1a4d6e]" aria-hidden /> : null}
          {title}
        </h3>
      </header>
      <div className="space-y-2 text-sm leading-relaxed text-slate-700">
        {children}
      </div>
    </section>
  );
}

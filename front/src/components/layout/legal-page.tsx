import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  title: string;
  lastUpdate?: string;
  children: ReactNode;
};

export function LegalPage({ title, lastUpdate, children }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-slate-600 hover:text-[#1a4d6e]">
        ← Accueil
      </Link>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
        {title}
      </h1>
      {lastUpdate ? (
        <p className="mt-2 text-sm text-slate-500">
          Dernière mise à jour : {lastUpdate}
        </p>
      ) : null}
      <div className="mt-8 space-y-6 text-slate-700 leading-relaxed [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_a]:text-[#1a4d6e] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1">
        {children}
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";

/** Écran d'erreur partagé par les error.tsx (site public et back-office). */
export function ErrorState({
  reset,
  homeHref,
  homeLabel,
}: {
  reset: () => void;
  homeHref: string;
  homeLabel: string;
}) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="font-serif text-2xl font-semibold text-slate-900 sm:text-3xl">
        Un problème est survenu
      </h1>
      <p className="mt-3 text-slate-600">
        Le contenu n&apos;a pas pu être chargé. Réessayez dans un instant.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-camargue px-4 py-2 font-medium text-white hover:bg-camargue-dark"
        >
          Réessayer
        </button>
        <Link href={homeHref} className="rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50">
          {homeLabel}
        </Link>
      </div>
    </div>
  );
}

/** Indicateur de chargement discret pour les loading.tsx. */
export function LoadingState() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" role="status" aria-live="polite">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-camargue" aria-hidden />
      <span className="sr-only">Chargement…</span>
    </div>
  );
}

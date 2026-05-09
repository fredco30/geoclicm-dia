import Link from "next/link";
import { Search, Sparkles } from "lucide-react";

/**
 * Barre "Pose ta question / cherche un sujet" — trigger principal du portail.
 *
 * En PR 2 (présent) : c'est un Link vers /recherche pour préserver la
 * navigation existante.
 * En PR 7 (à venir) : ce sera un button qui ouvre le drawer Assistant IA
 * avec la question pré-remplie ou suggestions contextuelles.
 *
 * L'icône Sparkles annonce déjà visuellement l'arrivée de l'assistant IA
 * pour préparer les utilisateurs.
 */
export function SearchTrigger() {
  return (
    <Link
      href="/recherche"
      className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm transition hover:border-[#1a4d6e]/40 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4d6e] focus-visible:ring-offset-2"
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1 text-left">
        Pose ta question ou cherche un sujet…
      </span>
      <span className="hidden items-center gap-1 rounded-full bg-[#1a4d6e]/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#1a4d6e] sm:inline-flex">
        <Sparkles className="h-3 w-3" aria-hidden />
        IA bientôt
      </span>
    </Link>
  );
}

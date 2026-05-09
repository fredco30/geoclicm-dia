import Link from "next/link";

import { MobileNav } from "./mobile-nav";
import { HeaderSearchButton } from "./header-search-button";

/**
 * Header sobre — pattern « city » :
 *  - Logo geoclicMédia (lien home)
 *  - Bouton recherche qui ouvre l'AssistantDrawer (Mistral + RAG)
 *  - Drawer mobile (raccourci communes + liens légaux)
 *
 * La navigation principale (rubriques éditoriales, météo, commerces) se
 * fait désormais via la grille de tuiles de la home et des pages commune.
 * Le footer fixe mobile (Accueil + Recherche) complète l'expérience tactile.
 */
export function Header() {
  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight text-[#1a4d6e]"
          aria-label="Accueil geoclicMédia"
        >
          <span
            className="inline-block h-7 w-7 rounded-full bg-[#1a4d6e]"
            aria-hidden
          />
          <span className="font-serif text-lg font-semibold tracking-tight sm:text-xl">
            geoclicMédia
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <HeaderSearchButton />
          <MobileNav />
        </div>
      </div>
    </header>
  );
}

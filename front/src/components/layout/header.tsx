import Link from "next/link";

import { MobileNav } from "./mobile-nav";
import { HeaderSearchButton } from "./header-search-button";
import { HeaderNav } from "./header-nav";
import { BrandMark } from "./brand-mark";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * Header sobre — pattern « city » :
 *  - Logo geoclicMédia (lien home)
 *  - Rubriques principales sur écran large (HeaderNav)
 *  - Bouton recherche qui ouvre l'AssistantDrawer (Mistral + RAG)
 *  - Drawer (rubriques, communes, liens légaux) sous le breakpoint lg
 *
 * Les tuiles de la home restent le point d'entrée principal ; le footer
 * fixe mobile donne accès aux rubriques clés et à l'assistant.
 */
export async function Header() {
  const site = await getSiteSettings();
  return (
    <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight text-camargue"
          aria-label={`Accueil ${site.site_name}`}
        >
          <BrandMark
            name={site.site_name}
            logoUrl={site.logo_url}
            nameClassName="font-serif text-lg font-semibold tracking-tight sm:text-xl"
          />
        </Link>

        <HeaderNav />

        <div className="flex items-center gap-1">
          <HeaderSearchButton />
          <MobileNav siteName={site.site_name} logoUrl={site.logo_url} />
        </div>
      </div>
    </header>
  );
}

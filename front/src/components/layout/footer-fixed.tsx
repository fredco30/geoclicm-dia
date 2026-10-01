"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Sparkles, Store } from "lucide-react";

import { useAssistant } from "@/components/assistant/assistant-context";
import { isActivePath } from "@/lib/site-nav";

/**
 * Barre de navigation fixe mobile (sous le breakpoint md) : Accueil,
 * Agenda, Commerces et Assistant. L'assistant (recherche en langage
 * naturel) remplace l'ancien bouton « Recherche » qui ne cherchait que dans
 * les articles ; la recherche d'articles reste accessible depuis le menu.
 *
 * Le main content a un padding-bottom équivalent (cf (site)/layout.tsx).
 */
export function FooterFixed() {
  const pathname = usePathname();
  const { open } = useAssistant();
  const itemClass = (active: boolean) =>
    `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
      active ? "text-camargue" : "text-slate-600 hover:bg-slate-50 hover:text-camargue"
    }`;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 md:hidden"
      aria-label="Navigation principale mobile"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {[
        { href: "/", label: "Accueil", icon: Home },
        { href: "/agenda", label: "Agenda", icon: CalendarDays },
        { href: "/commerces", label: "Commerces", icon: Store },
      ].map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : isActivePath(pathname, href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={itemClass(active)}>
            <Icon className="h-5 w-5" aria-hidden />
            <span>{label}</span>
          </Link>
        );
      })}
      <button type="button" onClick={open} className={itemClass(false)}>
        <Sparkles className="h-5 w-5" aria-hidden />
        <span>Assistant</span>
      </button>
    </nav>
  );
}

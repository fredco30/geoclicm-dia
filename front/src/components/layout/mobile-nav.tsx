"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Menu, X, Search, Home, BookOpen, Landmark, User as UserIcon,
  Newspaper, Image as ImageIcon, MapPin, MessageSquare, Fish, Mail, Store, CloudSun,
} from "lucide-react";

type MenuLink = {
  href: string;
  label: string;
  icon?: React.ReactNode;
};

const RUBRIQUES: MenuLink[] = [
  { href: "/", label: "À la une", icon: <Home className="h-4 w-4" /> },
  { href: "/categories/memoire-vivante", label: "Mémoire vivante", icon: <BookOpen className="h-4 w-4" /> },
  { href: "/categories/patrimoine", label: "Patrimoine", icon: <Landmark className="h-4 w-4" /> },
  { href: "/categories/peche-et-traditions", label: "Pêche et traditions", icon: <Fish className="h-4 w-4" /> },
  { href: "/categories/portraits", label: "Portraits", icon: <UserIcon className="h-4 w-4" /> },
  { href: "/categories/reportages", label: "Reportages", icon: <Newspaper className="h-4 w-4" /> },
  { href: "/categories/archives-photos", label: "Archives photos", icon: <ImageIcon className="h-4 w-4" /> },
  { href: "/categories/bons-plans", label: "Bons plans", icon: <MapPin className="h-4 w-4" /> },
  { href: "/categories/tribune-libre", label: "Tribune libre", icon: <MessageSquare className="h-4 w-4" /> },
];

const TERRITOIRE: MenuLink[] = [
  { href: "/communes/le-grau-du-roi", label: "Le Grau-du-Roi" },
  { href: "/communes/aigues-mortes", label: "Aigues-Mortes" },
  { href: "/communes/la-grande-motte", label: "La Grande-Motte" },
  { href: "/communes/saint-laurent-d-aigouze", label: "Saint-Laurent-d'Aigouze" },
  { href: "/communes/marsillargues", label: "Marsillargues" },
  { href: "/communes/lunel", label: "Lunel" },
  { href: "/communes/vauvert", label: "Vauvert" },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // createPortal nécessite document → on attend le client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Bloquer le scroll du body quand ouvert
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Fermer avec Échap
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const close = () => setOpen(false);

  // Drawer + backdrop rendus dans <body> via createPortal pour échapper aux
  // stacking contexts créés par les parents (header avec backdrop-blur, etc.).
  const drawer = (
    <>
      {/* Backdrop */}
      <div
        onClick={close}
        className={`fixed inset-0 z-[100] bg-black/50 transition-opacity md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />

      {/* Drawer */}
      <aside
        id="mobile-nav-panel"
        className={`fixed inset-y-0 right-0 z-[110] w-80 max-w-[85vw] overflow-y-auto bg-white shadow-2xl transition-transform duration-200 md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <Link
            href="/"
            onClick={close}
            className="flex items-center gap-2 font-semibold text-[#1a4d6e]"
          >
            <span className="inline-block h-7 w-7 rounded-full bg-[#1a4d6e]" aria-hidden />
            geoclicMédia
          </Link>
          <button
            type="button"
            onClick={close}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-4">
          {/* Recherche prominente */}
          <Link
            href="/recherche"
            onClick={close}
            className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-500 hover:border-[#1a4d6e]"
          >
            <Search className="h-4 w-4" />
            Rechercher un article…
          </Link>

          {/* Météo — accès direct */}
          <Link
            href="/meteo"
            onClick={close}
            className="flex items-center gap-2 rounded-md border border-[#1a4d6e]/30 bg-[#1a4d6e]/5 px-3 py-2 text-sm font-medium text-[#1a4d6e] hover:bg-[#1a4d6e]/10"
          >
            <CloudSun className="h-4 w-4" />
            Météo et état de la mer
          </Link>

          {/* Rubriques */}
          <nav aria-label="Rubriques">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Rubriques
            </h2>
            <ul className="space-y-0.5">
              {RUBRIQUES.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={close}
                    className="flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 hover:text-[#1a4d6e]"
                  >
                    {l.icon}
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Annuaire */}
          <nav aria-label="Annuaire">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Annuaire
            </h2>
            <ul className="space-y-0.5">
              <li>
                <Link
                  href="/commerces"
                  onClick={close}
                  className="flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium text-[#a8533a] hover:bg-[#a8533a]/10"
                >
                  <Store className="h-4 w-4" />
                  Commerces du territoire
                </Link>
              </li>
            </ul>
          </nav>

          {/* Territoire */}
          <nav aria-label="Le territoire">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Le territoire
            </h2>
            <ul className="space-y-0.5">
              {TERRITOIRE.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={close}
                    className="flex items-center gap-3 rounded-md px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-[#1a4d6e]"
                  >
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer du menu — légales */}
          <div className="border-t border-slate-200 pt-4 text-xs text-slate-500">
            <Link
              href="/contact"
              onClick={close}
              className="mb-2 inline-flex items-center gap-1 hover:text-[#1a4d6e]"
            >
              <Mail className="h-3 w-3" /> Contact
            </Link>
            <div className="space-x-2">
              <Link href="/mentions-legales" onClick={close} className="hover:underline">
                Mentions
              </Link>
              <span>·</span>
              <Link href="/cgu" onClick={close} className="hover:underline">
                CGU
              </Link>
              <span>·</span>
              <Link href="/politique-confidentialite" onClick={close} className="hover:underline">
                Confidentialité
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 md:hidden"
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
      >
        <Menu className="h-5 w-5" />
      </button>
      {mounted ? createPortal(drawer, document.body) : null}
    </>
  );
}

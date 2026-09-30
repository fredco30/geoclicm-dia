"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Mail, MapPin, Menu, Smartphone, X, Home as HomeIcon } from "lucide-react";

import { useAssistant } from "@/components/assistant/assistant-context";
import { useMounted } from "@/lib/use-mounted";
import { COMMUNES_NAV, MAIN_NAV, SECONDARY_NAV } from "@/lib/site-nav";

/**
 * Drawer mobile simplifié — pattern « city ».
 *
 * Rubriques principales et secondaires, communes du territoire, assistant,
 * installation de l'application et liens légaux. Affiché sous le
 * breakpoint lg (au-delà, l'en-tête porte les rubriques principales).
 */
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const mounted = useMounted();
  const { open: openAssistant } = useAssistant();

  // Bloquer le scroll body quand le drawer est ouvert
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

  // Échap pour fermer
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
      <div
        onClick={close}
        className={`fixed inset-0 z-[100] bg-black/50 transition-opacity lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />

      <aside
        id="mobile-nav-panel"
        className={`fixed inset-y-0 right-0 z-[110] w-80 max-w-[85vw] overflow-y-auto bg-white shadow-2xl transition-transform duration-200 lg:hidden ${
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
            <span
              className="inline-block h-7 w-7 rounded-full bg-[#1a4d6e]"
              aria-hidden
            />
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
          {/* Accueil prominent */}
          <Link
            href="/"
            onClick={close}
            className="flex items-center gap-2 rounded-md bg-[#1a4d6e] px-3 py-2 text-sm font-medium text-white hover:bg-[#13384f]"
          >
            <HomeIcon className="h-4 w-4" />
            Retour à l&apos;accueil
          </Link>

          {/* Rubriques */}
          <nav aria-label="Rubriques">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Rubriques
            </h2>
            <ul className="grid grid-cols-2 gap-0.5">
              {[...MAIN_NAV, ...SECONDARY_NAV].map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={close}
                    className="block rounded-md px-2.5 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-[#1a4d6e]"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Communes du territoire — raccourci pratique */}
          <nav aria-label="Le territoire">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Le territoire
            </h2>
            <ul className="space-y-0.5">
              {COMMUNES_NAV.map((l) => (
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

          {/* Astuce assistant IA */}
          <div className="rounded-md border border-[#1a4d6e]/20 bg-[#1a4d6e]/5 p-3 text-xs text-slate-600">
            <p>
              <strong className="text-[#1a4d6e]">💡 Astuce</strong> — pour
              trouver un commerce, une activité ou une info pratique, utilisez
              l&apos;assistant IA.
            </p>
            <button
              type="button"
              onClick={() => {
                close();
                openAssistant();
              }}
              className="mt-2 text-[#1a4d6e] underline hover:no-underline"
            >
              Ouvrir l&apos;assistant
            </button>
          </div>

          {/* Installer l'application — point d'entrée permanent, accessible
              même si le bandeau d'invitation a été masqué. Le composant
              <InstallPrompt /> du layout écoute cet événement et adapte
              l'action selon la plate-forme (tutoriel iOS, prompt natif
              Android, copie d'URL sur Chrome-iOS). */}
          <button
            type="button"
            onClick={() => {
              close();
              window.dispatchEvent(new CustomEvent("gm:open-install"));
            }}
            className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-[#1a4d6e]"
            aria-label="Installer l'application sur votre téléphone ou ordinateur"
          >
            <Smartphone className="h-4 w-4" aria-hidden />
            Installer l&apos;application
          </button>

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
              <Link
                href="/mentions-legales"
                onClick={close}
                className="hover:underline"
              >
                Mentions
              </Link>
              <span>·</span>
              <Link href="/cgu" onClick={close} className="hover:underline">
                CGU
              </Link>
              <span>·</span>
              <Link
                href="/politique-confidentialite"
                onClick={close}
                className="hover:underline"
              >
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
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 lg:hidden"
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

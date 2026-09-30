"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CalendarDays,
  Compass,
  CreditCard,
  FileText,
  Home,
  Inbox,
  LayoutDashboard,
  LayoutGrid,
  Megaphone,
  Menu,
  Newspaper,
  Phone,
  Plus,
  Settings,
  Sparkles,
  Store,
  Tags,
  X,
} from "lucide-react";

import { LogoutButton } from "@/components/admin/logout-button";

// Les icônes sont désignées par une clé : le layout (server component) ne
// peut pas transmettre de composants à ce composant client.
const ICONS = {
  articles: FileText,
  plus: Plus,
  tags: Tags,
  agenda: CalendarDays,
  discover: Compass,
  store: Store,
  listings: Newspaper,
  ads: Megaphone,
  tiles: LayoutGrid,
  phone: Phone,
  ai: Sparkles,
  settings: Settings,
  home: Home,
  inbox: Inbox,
  dashboard: LayoutDashboard,
  billing: CreditCard,
  stats: BarChart3,
} as const;

export type NavIcon = keyof typeof ICONS;

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  /** Pastille de compteur (masquée si 0 ou absente). */
  badge?: number;
  /** Lien non cliquable (fonction prévue). */
  disabled?: boolean;
  /** Petit libellé à droite (ex : « prévu »). */
  hint?: string;
  /** Ouvre dans un nouvel onglet (ex : voir le site). */
  external?: boolean;
};

export type NavSection = { title?: string; items: NavItem[] };

type Props = {
  sections: NavSection[];
  brandHref: string;
  brandLabel: string;
  userName: string;
  userMeta: string;
  logoutRedirect: string;
  children: React.ReactNode;
};

/** Lien actif = correspondance la plus longue (évite que /admin s'allume partout). */
function findActiveHref(pathname: string, sections: NavSection[]): string | null {
  let best: string | null = null;
  for (const section of sections) {
    for (const item of section.items) {
      if (item.disabled || item.external) continue;
      const match = pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (match && (!best || item.href.length > best.length)) best = item.href;
    }
  }
  return best;
}

/**
 * Coquille commune back-office / espace annonceur : barre latérale sur
 * tablette et ordinateur, barre supérieure + tiroir de navigation sur mobile.
 */
export function BackofficeShell({
  sections,
  brandHref,
  brandLabel,
  userName,
  userMeta,
  logoutRedirect,
  children,
}: Props) {
  const pathname = usePathname();
  // Le tiroir est lié à la page où il a été ouvert : toute navigation le
  // referme sans effet supplémentaire.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean) => setOpenOn(value ? pathname : null);
  const activeHref = findActiveHref(pathname, sections);

  // Échap pour fermer + blocage du scroll de la page derrière le tiroir.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenOn(null);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const totalBadge = sections
    .flatMap((s) => s.items)
    .reduce((sum, item) => sum + (item.badge ?? 0), 0);

  const nav = (
    <nav className="flex flex-col gap-4 text-sm">
      {sections.map((section, i) => (
        <div key={section.title ?? i} className="flex flex-col gap-0.5">
          {section.title ? (
            <div className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {section.title}
            </div>
          ) : null}
          {section.items.map((item) => (
            <NavLink key={item.href} item={item} active={item.href === activeHref} />
          ))}
        </div>
      ))}
    </nav>
  );

  const userBlock = (
    <div className="border-t border-slate-200 pt-3">
      <div className="mb-2 px-2 text-xs">
        <div className="truncate font-semibold text-slate-700">{userName}</div>
        <div className="truncate text-slate-400">{userMeta}</div>
      </div>
      <LogoutButton redirectTo={logoutRedirect} />
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      {/* Mobile : barre supérieure */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-3 sm:hidden">
        <Link href={brandHref} className="flex items-center gap-2 text-[#1a4d6e]">
          <span className="inline-block h-7 w-7 rounded-full bg-[#1a4d6e]" aria-hidden />
          <span className="font-semibold">{brandLabel}</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-md text-slate-700 hover:bg-slate-100"
          aria-label="Ouvrir le menu"
          aria-expanded={open}
          aria-controls="backoffice-nav-panel"
        >
          <Menu className="h-5 w-5" />
          {totalBadge > 0 ? (
            <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-[#a8533a] ring-2 ring-white" aria-hidden />
          ) : null}
        </button>
      </header>

      {/* Mobile : tiroir */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity sm:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden
      />
      <aside
        id="backoffice-nav-panel"
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col overflow-y-auto bg-white p-3 shadow-2xl transition-transform duration-200 sm:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!open}
        inert={!open}
      >
        <div className="mb-4 flex items-center justify-between px-2">
          <span className="font-semibold text-[#1a4d6e]">{brandLabel}</span>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
            aria-label="Fermer le menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1">{nav}</div>
        <div className="mt-4">{userBlock}</div>
      </aside>

      {/* Tablette / ordinateur : barre latérale fixe */}
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 overflow-y-auto border-r border-slate-200 bg-white p-3 sm:flex sm:flex-col">
        <Link href={brandHref} className="mb-5 flex items-center gap-2 px-2 text-[#1a4d6e]">
          <span className="inline-block h-7 w-7 rounded-full bg-[#1a4d6e]" aria-hidden />
          <span className="font-semibold">{brandLabel}</span>
        </Link>
        <div className="flex-1">{nav}</div>
        <div className="mt-4">{userBlock}</div>
      </aside>

      <main className="min-h-screen min-w-0 flex-1 bg-slate-50 px-4 py-4 sm:px-6 sm:py-6">
        {children}
      </main>
    </div>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = ICONS[item.icon];
  const content = (
    <>
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="truncate">{item.label}</span>
      {item.badge ? (
        <span className="ml-auto rounded-full bg-[#a8533a] px-1.5 py-0.5 text-[11px] font-semibold leading-none text-white">
          {item.badge > 999 ? "999+" : item.badge}
        </span>
      ) : item.hint ? (
        <span className="ml-auto text-[10px] text-slate-400">{item.hint}</span>
      ) : null}
    </>
  );

  if (item.disabled) {
    return (
      <span className="flex items-center gap-2 rounded-md px-2.5 py-2 text-slate-400 sm:py-1.5">
        {content}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      target={item.external ? "_blank" : undefined}
      aria-current={active ? "page" : undefined}
      className={`flex items-center gap-2 rounded-md px-2.5 py-2 sm:py-1.5 ${
        active
          ? "bg-[#1a4d6e]/10 font-medium text-[#1a4d6e]"
          : "text-slate-700 hover:bg-slate-100"
      }`}
    >
      {content}
    </Link>
  );
}

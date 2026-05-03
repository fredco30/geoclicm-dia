import Link from "next/link";
import { Search, Menu } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="flex items-center gap-2 font-semibold tracking-tight text-[#1a4d6e]"
          aria-label="Accueil geoclicMédia"
        >
          <span className="inline-block h-7 w-7 rounded-full bg-[#1a4d6e]" aria-hidden />
          <span className="text-base sm:text-lg">geoclicMédia</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Principale">
          <NavLink href="/">À la une</NavLink>
          <NavLink href="/categories/memoire-vivante">Mémoire</NavLink>
          <NavLink href="/categories/patrimoine">Patrimoine</NavLink>
          <NavLink href="/categories/portraits">Portraits</NavLink>
          <NavLink href="/categories/reportages">Reportages</NavLink>
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href="/recherche"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
            aria-label="Rechercher"
          >
            <Search className="h-5 w-5" />
          </Link>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 md:hidden"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </Link>
  );
}

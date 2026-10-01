"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { MAIN_NAV, isActivePath } from "@/lib/site-nav";

/** Rubriques principales dans l'en-tête (écrans larges). */
export function HeaderNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Rubriques" className="hidden items-center gap-1 lg:flex">
      {MAIN_NAV.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "bg-camargue/10 text-camargue"
                : "text-slate-700 hover:bg-slate-100 hover:text-camargue"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

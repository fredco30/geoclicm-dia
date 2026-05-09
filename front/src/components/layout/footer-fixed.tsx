import Link from "next/link";
import { Home, Search } from "lucide-react";

/**
 * Footer fixe mobile (Accueil / Recherche), pattern style « city ».
 *
 * Visible uniquement sous le breakpoint md (desktop garde le footer
 * éditorial standard). En PR 8 cleanup, on pourra y ajouter un bouton Menu
 * qui ouvrira le drawer du MobileNav (actuellement déclenché depuis le
 * header).
 *
 * Le main content doit avoir un padding-bottom équivalent à la hauteur du
 * footer (cf layout (site)/layout.tsx) pour ne pas masquer les derniers
 * contenus.
 */
export function FooterFixed() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85 md:hidden"
      aria-label="Navigation principale mobile"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <FooterButton href="/" icon={<Home className="h-5 w-5" />} label="Accueil" />
      <FooterButton href="/recherche" icon={<Search className="h-5 w-5" />} label="Recherche" />
    </nav>
  );
}

function FooterButton({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-[#1a4d6e]"
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

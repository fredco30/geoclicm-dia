import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Store, Megaphone, BarChart3 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-server";
import { LogoutButton } from "@/components/admin/logout-button";

export const dynamic = "force-dynamic";

export default async function AdvertiserProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/advertiser/login");
  }
  // Annonceur, éditeur ou admin peuvent accéder à leur espace.
  // (Editor/admin = équipe geoclicMédia qui gère pour le compte d'un commerçant)
  if (user.role === "reader") {
    redirect("/advertiser/login?error=forbidden");
  }

  return (
    <div className="flex">
      <aside className="sticky top-0 hidden h-screen w-56 shrink-0 border-r border-slate-200 bg-white p-3 sm:flex sm:flex-col">
        <div className="mb-5 px-2">
          <div className="text-xs uppercase tracking-wider text-slate-500">
            Espace annonceur
          </div>
          <div className="mt-0.5 truncate font-medium text-slate-800">
            {user.full_name}
          </div>
          <div className="truncate text-xs text-slate-500">{user.email}</div>
        </div>
        <nav className="flex flex-col gap-0.5 text-sm">
          <NavLink
            href="/advertiser"
            icon={<LayoutDashboard className="h-4 w-4" />}
          >
            Tableau de bord
          </NavLink>
          <NavLink
            href="/advertiser/fiches"
            icon={<Store className="h-4 w-4" />}
          >
            Mes fiches
          </NavLink>
          <NavLink
            href="/advertiser/campagnes"
            icon={<Megaphone className="h-4 w-4" />}
          >
            Mes campagnes
          </NavLink>
          <NavLink
            href="/advertiser/stats"
            icon={<BarChart3 className="h-4 w-4" />}
            disabled
          >
            Statistiques
            <span className="ml-auto text-[10px] text-slate-400">bientôt</span>
          </NavLink>
        </nav>
        <div className="mt-auto pt-4">
          <LogoutButton />
        </div>
      </aside>
      <main className="min-h-screen flex-1 bg-slate-50 px-4 py-4 sm:px-6 sm:py-6">
        {children}
      </main>
    </div>
  );
}

function NavLink({
  href,
  icon,
  children,
  disabled = false,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-slate-400">
        {icon}
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-slate-700 hover:bg-slate-100"
    >
      {icon}
      {children}
    </Link>
  );
}

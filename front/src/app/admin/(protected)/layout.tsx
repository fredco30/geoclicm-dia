import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Plus, Home, Settings, Tags, Store, Megaphone } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-server";
import { getRoleLabel } from "@/lib/roles";
import { LogoutButton } from "@/components/admin/logout-button";
import { HelpProvider } from "@/components/help/help-context";
import { HelpButton } from "@/components/help/help-button";
import { HelpDrawer } from "@/components/help/help-drawer";

export const dynamic = "force-dynamic";

export default async function AdminProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }
  if (!user.can_publish) {
    redirect("/admin/login?error=forbidden");
  }

  // Seul un superuser (ou role admin) accède aux paramètres comptes
  const canManageUsers = user.is_superuser || user.role === "admin";

  return (
    <HelpProvider>
    <div className="flex">
      {/* Sidebar — full height, fixe à gauche, sans bord externe (admin remplit toute la viewport) */}
      <aside className="sticky top-0 hidden h-screen w-52 shrink-0 border-r border-slate-200 bg-white p-3 sm:flex sm:flex-col">
        <Link
          href="/admin"
          className="mb-5 flex items-center gap-2 px-2 text-[#1a4d6e]"
        >
          <span className="inline-block h-7 w-7 rounded-full bg-[#1a4d6e]" />
          <span className="font-semibold">geoclicMédia</span>
        </Link>
        <nav className="flex flex-col gap-0.5 text-sm">
          <NavLink href="/admin" icon={<FileText className="h-4 w-4" />}>
            Articles
          </NavLink>
          <NavLink href="/admin/articles/new" icon={<Plus className="h-4 w-4" />}>
            Nouvel article
          </NavLink>
          <NavLink href="/admin/directory/businesses" icon={<Store className="h-4 w-4" />}>
            Commerçants
          </NavLink>
          <NavLink href="/admin/directory/categories" icon={<Tags className="h-4 w-4" />}>
            Catégories commerçants
          </NavLink>
          <NavLink href="/admin/regie/campagnes" icon={<Megaphone className="h-4 w-4" />}>
            Régie publicitaire
          </NavLink>
          {canManageUsers ? (
            <NavLink
              href="/admin/settings/users"
              icon={<Settings className="h-4 w-4" />}
            >
              Comptes &amp; droits
            </NavLink>
          ) : null}
          <NavLink href="/" icon={<Home className="h-4 w-4" />} external>
            Voir le site
          </NavLink>
        </nav>
        <div className="mt-auto pt-4">
          <div className="mb-2 px-2 text-xs">
            <div className="font-semibold text-slate-700">{user.full_name}</div>
            <div className="text-slate-400">{getRoleLabel(user)}</div>
          </div>
          <LogoutButton />
        </div>
      </aside>

      {/* Main : pleine largeur (jusqu'à l'écran), padding compact */}
      <main className="min-h-screen flex-1 bg-slate-50 px-4 py-4 sm:px-6 sm:py-6">
        {children}
      </main>
      <HelpButton />
      <HelpDrawer />
    </div>
    </HelpProvider>
  );
}

function NavLink({
  href,
  icon,
  external,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  external?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-slate-700 hover:bg-slate-100"
    >
      {icon}
      {children}
    </Link>
  );
}

import { redirect } from "next/navigation";
import { fetchPendingCounts, getCurrentUser } from "@/lib/auth-server";
import { getRoleLabel } from "@/lib/roles";
import { BackofficeShell, type NavSection } from "@/components/admin/backoffice-shell";
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
  const pending = await fetchPendingCounts();

  const sections: NavSection[] = [
    {
      items: [
        { href: "/admin", label: "Articles", icon: "articles" },
        { href: "/admin/articles/new", label: "Nouvel article", icon: "plus" },
      ],
    },
    {
      title: "À valider",
      items: [
        { href: "/admin/agenda/imports", label: "Agenda", icon: "inbox", badge: pending?.events },
        { href: "/admin/decouvrir/imports", label: "Découvrir", icon: "inbox", badge: pending?.places },
        { href: "/admin/directory/imports", label: "Commerçants", icon: "inbox", badge: pending?.businesses },
        { href: "/admin/annonces/imports", label: "Annonces", icon: "inbox", badge: pending?.listings },
        {
          href: "/admin/directory/businesses?pending_changes=1",
          label: "Fiches modifiées",
          icon: "store",
          badge: pending?.business_changes,
        },
      ],
    },
    {
      title: "Contenus",
      items: [
        { href: "/admin/agenda", label: "Agenda & marchés", icon: "agenda" },
        { href: "/admin/decouvrir", label: "Découvrir", icon: "discover" },
        { href: "/admin/directory/businesses", label: "Commerçants", icon: "store" },
        { href: "/admin/annonces", label: "Annonces", icon: "listings" },
        { href: "/admin/utility", label: "Pratique", icon: "phone" },
      ],
    },
    {
      title: "Réglages",
      items: [
        { href: "/admin/articles/categories", label: "Catégories articles", icon: "tags" },
        { href: "/admin/directory/categories", label: "Catégories commerçants", icon: "tags" },
        { href: "/admin/regie/campagnes", label: "Régie publicitaire", icon: "ads" },
        { href: "/admin/tiles", label: "Tuiles d'accueil", icon: "tiles" },
        { href: "/admin/assistant/sources", label: "Sources IA", icon: "ai" },
        ...(canManageUsers
          ? [{ href: "/admin/settings/users", label: "Comptes & droits", icon: "settings" as const }]
          : []),
        { href: "/", label: "Voir le site", icon: "home", external: true },
      ],
    },
  ];

  return (
    <HelpProvider>
      <BackofficeShell
        sections={sections}
        brandHref="/admin"
        brandLabel="geoclicMédia"
        userName={user.full_name}
        userMeta={getRoleLabel(user)}
        logoutRedirect="/admin/login"
      >
        {children}
      </BackofficeShell>
      <HelpButton />
      <HelpDrawer />
    </HelpProvider>
  );
}

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { BackofficeShell, type NavSection } from "@/components/admin/backoffice-shell";
import { HelpProvider } from "@/components/help/help-context";
import { HelpButton } from "@/components/help/help-button";
import { HelpDrawer } from "@/components/help/help-drawer";

export const dynamic = "force-dynamic";

const SECTIONS: NavSection[] = [
  {
    items: [
      { href: "/advertiser", label: "Tableau de bord", icon: "dashboard" },
      { href: "/advertiser/fiches", label: "Mes fiches", icon: "store" },
      { href: "/advertiser/campagnes", label: "Mes campagnes", icon: "ads" },
      { href: "/advertiser/abonnement", label: "Abonnement", icon: "billing" },
      { href: "/advertiser/stats", label: "Statistiques", icon: "stats", disabled: true, hint: "prévu" },
      { href: "/", label: "Voir le site", icon: "home", external: true },
    ],
  },
];

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
    <HelpProvider>
      <BackofficeShell
        sections={SECTIONS}
        brandHref="/advertiser"
        brandLabel="Espace annonceur"
        userName={user.full_name}
        userMeta={user.email}
        logoutRedirect="/advertiser/login"
      >
        {children}
      </BackofficeShell>
      <HelpButton />
      <HelpDrawer />
    </HelpProvider>
  );
}

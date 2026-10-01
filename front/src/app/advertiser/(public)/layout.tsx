import Link from "next/link";
import { BrandMark } from "@/components/layout/brand-mark";
import { getSiteSettings } from "@/lib/site-settings";

/**
 * En-tête des pages publiques de la zone annonceur (connexion, inscription).
 * Les pages connectées ont leur propre navigation (BackofficeShell).
 */
export default async function AdvertiserPublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const site = await getSiteSettings();
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
          <Link
            href="/advertiser"
            className="flex items-center gap-2 font-semibold text-camargue"
            aria-label={`Espace annonceur ${site.site_name}`}
          >
            <BrandMark
              name={site.site_name}
              logoUrl={site.logo_url}
              nameClassName="font-serif text-lg sm:text-xl"
            />
            <span className="font-serif text-lg text-slate-400 sm:text-xl">— Annonceurs</span>
          </Link>
          <Link
            href="/"
            className="text-sm text-slate-600 hover:text-camargue"
          >
            ← Site public
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

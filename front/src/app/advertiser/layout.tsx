import Link from "next/link";

/**
 * Layout commun à toute la zone annonceur (login, register, dashboard).
 *
 * Pas de check auth ici — il est fait dans le sous-layout (protected) qui
 * englobe les pages nécessitant un compte connecté. Les pages login et
 * register sont accessibles sans auth.
 */
export default function AdvertiserLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-14 max-w-screen-xl items-center justify-between px-4">
          <Link
            href="/advertiser"
            className="flex items-center gap-2 font-semibold text-[#1a4d6e]"
            aria-label="Espace annonceur geoclicMédia"
          >
            <span className="inline-block h-7 w-7 rounded-full bg-[#a8533a]" aria-hidden />
            <span className="font-serif text-lg sm:text-xl">
              geoclicMédia <span className="text-slate-400">— Annonceurs</span>
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm text-slate-600 hover:text-[#1a4d6e]"
          >
            ← Site public
          </Link>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

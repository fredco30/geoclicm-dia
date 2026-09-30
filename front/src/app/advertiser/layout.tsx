/**
 * Layout commun à toute la zone annonceur.
 *
 * Pas de check auth ici — il est fait dans le sous-layout (protected). Les
 * pages login et register (groupe (public)) portent leur propre en-tête.
 */
export default function AdvertiserLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen bg-slate-50">{children}</div>;
}

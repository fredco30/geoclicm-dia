import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-screen-xl px-4 py-10 text-sm text-slate-600">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <div className="mb-3 flex items-center gap-2 font-semibold text-[#1a4d6e]">
              <span className="inline-block h-6 w-6 rounded-full bg-[#1a4d6e]" aria-hidden />
              geoclicMédia
            </div>
            <p className="text-slate-600">
              Le média local indépendant du littoral camarguais.
            </p>
          </div>

          <div>
            <h3 className="mb-3 font-semibold text-slate-900">Rubriques</h3>
            <ul className="space-y-1.5">
              <li><FooterLink href="/categories/memoire-vivante">Mémoire vivante</FooterLink></li>
              <li><FooterLink href="/categories/patrimoine">Patrimoine</FooterLink></li>
              <li><FooterLink href="/categories/portraits">Portraits</FooterLink></li>
              <li><FooterLink href="/categories/reportages">Reportages</FooterLink></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-semibold text-slate-900">Le territoire</h3>
            <ul className="space-y-1.5">
              <li><FooterLink href="/communes/le-grau-du-roi">Le Grau-du-Roi</FooterLink></li>
              <li><FooterLink href="/communes/aigues-mortes">Aigues-Mortes</FooterLink></li>
              <li><FooterLink href="/communes/la-grande-motte">La Grande-Motte</FooterLink></li>
              <li><FooterLink href="/communes/lunel">Lunel</FooterLink></li>
              <li><FooterLink href="/communes/vauvert">Vauvert</FooterLink></li>
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-semibold text-slate-900">Informations</h3>
            <ul className="space-y-1.5">
              <li><FooterLink href="/contact">Contact</FooterLink></li>
              <li><FooterLink href="/mentions-legales">Mentions légales</FooterLink></li>
              <li><FooterLink href="/politique-confidentialite">Politique de confidentialité</FooterLink></li>
              <li><FooterLink href="/cgu">CGU</FooterLink></li>
              <li><FooterLink href="/suppression-donnees">Suppression de données</FooterLink></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6 text-xs text-slate-500">
          © {new Date().getFullYear()} geoclicMédia. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="hover:text-[#1a4d6e] hover:underline">
      {children}
    </Link>
  );
}

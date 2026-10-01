import Link from "next/link";

import { COMMUNES_NAV, MAIN_NAV, SECONDARY_NAV } from "@/lib/site-nav";
import { getSiteSettings } from "@/lib/site-settings";
import { BrandMark } from "./brand-mark";

export async function Footer() {
  const site = await getSiteSettings();
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50">
      <div className="mx-auto max-w-screen-xl px-4 py-10 text-sm text-slate-600">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <BrandMark
              name={site.site_name}
              logoUrl={site.logo_url}
              size={24}
              className="mb-3 text-camargue"
              nameClassName="font-serif text-lg font-semibold"
            />
            <p className="text-slate-600">
              Le média local indépendant du littoral camarguais.
            </p>
          </div>

          <div>
            <h3 className="mb-3 font-semibold text-slate-900">Explorer</h3>
            <ul className="space-y-1.5">
              {[...MAIN_NAV, ...SECONDARY_NAV.slice(0, 3)].map((l) => (
                <li key={l.href}><FooterLink href={l.href}>{l.label}</FooterLink></li>
              ))}
            </ul>
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
              {COMMUNES_NAV.map((l) => (
                <li key={l.href}><FooterLink href={l.href}>{l.label}</FooterLink></li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-3 font-semibold text-slate-900">Informations</h3>
            <ul className="space-y-1.5">
              <li><FooterLink href="/contact">Contact</FooterLink></li>
              <li><FooterLink href="/tarifs">Commerçants : nos formules</FooterLink></li>
              <li><FooterLink href="/numeros-utiles">Numéros utiles</FooterLink></li>
              <li><FooterLink href="/demarches">Démarches</FooterLink></li>
              <li><FooterLink href="/mentions-legales">Mentions légales</FooterLink></li>
              <li><FooterLink href="/politique-confidentialite">Politique de confidentialité</FooterLink></li>
              <li><FooterLink href="/cgu">CGU</FooterLink></li>
              <li><FooterLink href="/suppression-donnees">Suppression de données</FooterLink></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-200 pt-6 text-xs text-slate-500">
          © {new Date().getFullYear()} {site.site_name}. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="hover:text-camargue hover:underline">
      {children}
    </Link>
  );
}

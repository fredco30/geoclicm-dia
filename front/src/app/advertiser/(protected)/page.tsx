import Link from "next/link";
import { Store, Megaphone } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-server";

export default async function AdvertiserDashboardPage() {
  const user = await getCurrentUser();
  // Le layout (protected) garantit user non-null + role≠reader

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        Bienvenue, {user!.first_name || user!.full_name} 👋
      </h1>
      <p className="mt-2 max-w-prose text-slate-600">
        Ton espace annonceur est prêt. Pour l&apos;instant, la création de
        fiche et de campagne se fait avec l&apos;aide de l&apos;équipe
        éditoriale — contacte-nous pour démarrer.
      </p>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href="/advertiser/fiches"
          className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-terracotta hover:shadow-md"
        >
          <div className="mb-2 flex items-center gap-2 text-terracotta">
            <Store className="h-5 w-5" />
            <h2 className="font-serif text-lg font-semibold text-slate-900 group-hover:text-terracotta">
              Ma fiche commerce
            </h2>
          </div>
          <p className="text-sm text-slate-600">
            Crée une fiche détaillée (description, horaires, photos) pour
            apparaître dans l&apos;annuaire et sur la carte du territoire.
          </p>
          <p className="mt-3 text-xs font-medium text-terracotta">
            Gérer mes fiches →
          </p>
        </Link>
        <Link
          href="/advertiser/campagnes"
          className="group rounded-xl border border-slate-200 bg-white p-5 transition hover:border-terracotta hover:shadow-md"
        >
          <div className="mb-2 flex items-center gap-2 text-terracotta">
            <Megaphone className="h-5 w-5" />
            <h2 className="font-serif text-lg font-semibold text-slate-900 group-hover:text-terracotta">
              Mes campagnes pub
            </h2>
          </div>
          <p className="text-sm text-slate-600">
            Diffuse des encarts publicitaires sur les pages clés du média :
            home, articles, annuaire.
          </p>
          <p className="mt-3 text-xs font-medium text-terracotta">
            Gérer mes campagnes →
          </p>
        </Link>
      </div>

      <div className="mt-8 rounded-xl bg-[#fbf9f5] p-5 ring-1 ring-terracotta/30">
        <h2 className="font-serif text-lg font-semibold text-slate-900">
          Besoin d&apos;aide ?
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Pendant la phase pilote 2026, l&apos;inscription et la
          diffusion des campagnes sont gratuites. L&apos;équipe geoclicMédia
          valide chaque fiche et campagne sous 24h ouvrées.
        </p>
        <Link
          href="/contact"
          className="mt-3 inline-block rounded-md bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta-dark"
        >
          Nous contacter
        </Link>
      </div>
    </div>
  );
}

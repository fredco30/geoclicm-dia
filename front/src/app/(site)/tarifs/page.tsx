import type { Metadata } from "next";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { getCurrentUser } from "@/lib/auth-server";

export const metadata: Metadata = {
  title: "Tarifs commerçants — geoclicMédia",
  description:
    "Trois formules pour rejoindre l'annuaire des commerçants du littoral camarguais : Gratuit, Basic 79€/an, Premium 149€/an. Phase pilote été 2026 entièrement gratuite.",
};

const PLANS = [
  {
    key: "free",
    name: "Gratuit",
    price: "0 €",
    period: "à vie",
    tagline: "Apparaître dans l'annuaire",
    features: [
      { ok: true, label: "Fiche dans l'annuaire des commerces" },
      { ok: true, label: "Géolocalisation sur la carte" },
      { ok: true, label: "Boutons navigation (Maps, Waze, Street View)" },
      { ok: true, label: "Lien direct depuis les pages communes" },
      { ok: false, label: "Mise en avant sur la home" },
      { ok: false, label: "Encarts publicitaires" },
      { ok: false, label: "Articles partenaires" },
    ],
    cta: "Créer ma fiche gratuite",
    href: "/advertiser/register",
    color: "slate",
  },
  {
    key: "basic",
    name: "Basic",
    price: "79 €",
    period: "par an",
    tagline: "Visibilité renforcée",
    features: [
      { ok: true, label: "Tout du plan Gratuit, plus :" },
      { ok: true, label: "1 encart pub local (commune ou catégorie)" },
      { ok: true, label: "Photos et galerie illimitées" },
      { ok: true, label: "Stats consultations + clics" },
      { ok: true, label: "Support prioritaire" },
      { ok: false, label: "Mise en avant sur la home" },
      { ok: false, label: "Articles partenaires" },
    ],
    cta: "Choisir Basic",
    href: "/advertiser/abonnement?plan=basic",
    color: "[#1a4d6e]",
    highlight: false,
  },
  {
    key: "premium",
    name: "Premium",
    price: "149 €",
    period: "par an",
    tagline: "Mise en avant éditoriale",
    features: [
      { ok: true, label: "Tout du plan Basic, plus :" },
      { ok: true, label: "Plusieurs encarts pub multi-territoires" },
      { ok: true, label: "★ Badge « Partenaire » sur la fiche" },
      { ok: true, label: "Mise en avant sur la home" },
      { ok: true, label: "1 article partenaire / an offert" },
      { ok: true, label: "Newsletter mensuelle (encart dédié)" },
    ],
    cta: "Choisir Premium",
    href: "/advertiser/abonnement?plan=premium",
    color: "[#a8533a]",
    highlight: true,
  },
];

export default async function TarifsPage() {
  const user = await getCurrentUser();
  // Si pas connecté, le CTA payant redirige vers /advertiser/register?next=...
  const isLogged = user !== null;

  return (
    <div className="mx-auto max-w-screen-xl px-4 py-10 sm:py-16">
      <header className="mx-auto mb-12 max-w-2xl text-center">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#a8533a]">
          Tarifs commerçants
        </p>
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
          Choisis ta formule
        </h1>
        <p className="mt-4 text-slate-600">
          Trois plans pour rejoindre l&apos;annuaire des commerçants du
          littoral camarguais. Aucun engagement, résiliation à tout moment.
        </p>
        <div className="mt-4 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900 ring-1 ring-amber-300">
          🎁 Phase pilote été 2026 : tous les plans 100 % gratuits
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isPremium = plan.key === "premium";
          const ctaHref = isLogged || plan.key === "free"
            ? plan.href
            : `/advertiser/register?next=${encodeURIComponent(plan.href)}`;
          return (
            <div
              key={plan.key}
              className={
                "flex flex-col rounded-2xl border bg-white p-6 transition " +
                (plan.highlight
                  ? "border-[#a8533a] shadow-lg ring-2 ring-[#a8533a]/20"
                  : "border-slate-200 shadow-sm hover:shadow-md")
              }
            >
              {plan.highlight ? (
                <div className="mb-3 inline-flex w-fit items-center rounded-full bg-[#a8533a] px-3 py-1 text-xs font-medium text-white">
                  ★ Recommandé
                </div>
              ) : null}
              <h2 className="font-serif text-2xl font-semibold text-slate-900">
                {plan.name}
              </h2>
              <p className="mt-1 text-sm text-slate-600">{plan.tagline}</p>
              <div className="mt-4">
                <span className="font-serif text-4xl font-semibold text-slate-900">
                  {plan.price}
                </span>
                <span className="ml-1 text-sm text-slate-500">{plan.period}</span>
              </div>

              <ul className="mt-6 flex-1 space-y-2 text-sm">
                {plan.features.map((f, i) => (
                  <li
                    key={i}
                    className={
                      "flex items-start gap-2 " +
                      (f.ok ? "text-slate-700" : "text-slate-400 line-through")
                    }
                  >
                    {f.ok ? (
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                    ) : (
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />
                    )}
                    <span>{f.label}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={ctaHref}
                className={
                  "mt-6 inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-medium transition " +
                  (isPremium
                    ? "bg-[#a8533a] text-white hover:bg-[#8e4530]"
                    : plan.key === "basic"
                      ? "bg-[#1a4d6e] text-white hover:bg-[#163d57]"
                      : "bg-slate-100 text-slate-900 hover:bg-slate-200")
                }
              >
                {plan.cta}
              </Link>
            </div>
          );
        })}
      </div>

      <p className="mx-auto mt-12 max-w-2xl text-center text-sm text-slate-500">
        Tu as une question sur le bon plan pour ton commerce ?{" "}
        <Link href="/contact" className="text-[#1a4d6e] underline hover:text-[#a8533a]">
          Contacte-nous
        </Link>
        , on t&apos;aide à choisir.
      </p>
    </div>
  );
}

import Link from "next/link";
import { CheckCircle, AlertCircle } from "lucide-react";
import { getCookieHeader } from "@/lib/auth-server";
import { getSiteSettings } from "@/lib/site-settings";
import {
  CheckoutButton,
  PortalButton,
} from "@/components/advertiser/subscription-buttons";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { Paginated } from "@/types/api";
import type { AdminBusinessDetail } from "@/types/admin";

export const dynamic = "force-dynamic";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

type Props = {
  searchParams: Promise<{ plan?: string; checkout?: string; business?: string }>;
};

async function fetchMyBusinesses(): Promise<AdminBusinessDetail[]> {
  const cookieHeader = await getCookieHeader();
  const res = await fetch(
    `${API_URL}/api/advertiser/businesses/?ordering=name`,
    {
      headers: { Cookie: cookieHeader, Accept: "application/json" },
      cache: "no-store",
    },
  );
  if (!res.ok) return [];
  const data = (await res.json()) as Paginated<AdminBusinessDetail>;
  return data.results;
}

const PLAN_LABEL: Record<string, string> = {
  free: "Gratuit",
  basic: "Basic — 79€/an",
  premium: "Premium — 149€/an",
};

export default async function AbonnementPage({ searchParams }: Props) {
  const sp = await searchParams;
  const [businesses, site] = await Promise.all([fetchMyBusinesses(), getSiteSettings()]);
  // Phase pilote : aucun paiement en ligne, demande à l'équipe par email.
  const billingOpen = site.billing_enabled;
  // Un abonnement est rattaché à UNE fiche : ?business=<id> choisit la
  // fiche, la première par défaut.
  const business =
    businesses.find((b) => String(b.id) === sp.business) ?? businesses[0];

  if (!business) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-amber-700" />
          <h1 className="font-serif text-xl font-semibold text-amber-900">
            Crée ta fiche commerce avant de souscrire
          </h1>
          <p className="mt-2 text-sm text-amber-800">
            Un abonnement Basic ou Premium est rattaché à une fiche
            commerce. Crée ta fiche en quelques minutes pour pouvoir choisir
            ta formule.
          </p>
          <Link href="/advertiser/fiches/new" className="mt-4 inline-block">
            <Button>Créer ma fiche</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isFree = business.plan === "free";

  return (
    <div className="mx-auto max-w-3xl">
      {sp.checkout === "success" ? (
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-green-50 p-4 ring-1 ring-green-200">
          <CheckCircle className="h-5 w-5 shrink-0 text-green-700" />
          <div>
            <p className="font-medium text-green-900">Paiement reçu — merci !</p>
            <p className="text-sm text-green-800">
              Ton abonnement est activé. Le statut peut prendre quelques
              secondes à se mettre à jour ci-dessous.
            </p>
          </div>
        </div>
      ) : null}

      <h1 className="font-serif text-2xl font-semibold text-slate-900 sm:text-3xl">
        Mon abonnement
      </h1>
      {businesses.length > 1 ? (
        <nav aria-label="Choix de la fiche" className="mt-3 flex flex-wrap gap-2">
          {businesses.map((b) => (
            <Link
              key={b.id}
              href={`/advertiser/abonnement?business=${b.id}${sp.plan ? `&plan=${sp.plan}` : ""}`}
              aria-current={b.id === business.id ? "page" : undefined}
              className={`rounded-full px-3 py-1 text-sm ring-1 ${
                b.id === business.id
                  ? "bg-camargue text-white ring-camargue"
                  : "bg-white text-slate-700 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {b.name}
              <span className="ml-1 opacity-70">· {PLAN_LABEL[b.plan]?.split(" ")[0] ?? b.plan}</span>
            </Link>
          ))}
        </nav>
      ) : (
        <p className="mt-1 text-sm text-slate-600">
          Pour la fiche : <span className="font-medium">{business.name}</span>
        </p>
      )}

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-500">
              Formule actuelle
            </p>
            <p className="mt-1 font-serif text-2xl font-semibold text-slate-900">
              {PLAN_LABEL[business.plan] || business.plan}
            </p>
            {!isFree && business.plan_ends_at ? (
              <p className="mt-1 text-sm text-slate-600">
                {billingOpen ? "Renouvellement le" : "Active jusqu’au"} {formatDate(business.plan_ends_at)}
              </p>
            ) : null}
          </div>
          {!isFree && billingOpen ? (
            <PortalButton businessId={business.id} />
          ) : null}
        </div>
      </div>

      {isFree ? (
        <div className="mt-8">
          <h2 className="font-serif text-xl font-semibold text-slate-900">
            Passer à un plan payant
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Active la mise en avant et les encarts publicitaires pour ta fiche.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <PlanCard
              name="Basic"
              price="79 €/an"
              tagline="Encart publicitaire local + support prioritaire"
              business={business}
              plan="basic"
              billingOpen={billingOpen}
              suggested={sp.plan === "basic"}
            />
            <PlanCard
              name="Premium"
              price="149 €/an"
              tagline="Mise en avant annuaire + multi-encarts + badge Partenaire + article partenaire"
              business={business}
              plan="premium"
              billingOpen={billingOpen}
              suggested={sp.plan === "premium"}
              highlight
            />
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/tarifs" className="underline hover:text-terracotta">
              Voir le détail complet des plans
            </Link>
          </p>
        </div>
      ) : (
        <p className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-700 ring-1 ring-slate-200">
          {billingOpen
            ? "Vous pouvez mettre à jour votre moyen de paiement, télécharger vos factures ou résilier votre abonnement via le portail de paiement (bouton ci-dessus)."
            : "Votre formule a été activée par l’équipe pendant la phase pilote. Pour la modifier, écrivez-nous à annonceurs@geoclic.fr."}
        </p>
      )}
    </div>
  );
}

function PlanCard({
  name,
  price,
  tagline,
  business,
  plan,
  billingOpen,
  suggested = false,
  highlight = false,
}: {
  name: string;
  price: string;
  tagline: string;
  business: AdminBusinessDetail;
  plan: "basic" | "premium";
  billingOpen: boolean;
  suggested?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "flex flex-col rounded-xl border bg-white p-5 transition " +
        (highlight
          ? "border-terracotta shadow-md ring-2 ring-terracotta/20"
          : suggested
            ? "border-camargue shadow-md ring-2 ring-camargue/20"
            : "border-slate-200 shadow-sm hover:shadow-md")
      }
    >
      <h3 className="font-serif text-lg font-semibold text-slate-900">{name}</h3>
      <p className="mt-1 font-serif text-2xl font-semibold text-slate-900">
        {price}
      </p>
      <p className="mt-2 text-sm text-slate-600">{tagline}</p>
      {billingOpen ? (
        <CheckoutButton
          plan={plan}
          businessId={business.id}
          className="mt-4"
          variant={highlight ? "primary" : "secondary"}
        >
          Choisir {name}
        </CheckoutButton>
      ) : (
        <>
          <a
            href={`mailto:annonceurs@geoclic.fr?subject=${encodeURIComponent(`Formule ${name} — ${business.name}`)}&body=${encodeURIComponent(`Bonjour,\n\nJe souhaite activer la formule ${name} pour ma fiche « ${business.name} ».\n\nMerci !`)}`}
            className={`mt-4 inline-flex w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition ${
              highlight ? "bg-camargue text-white hover:bg-camargue-dark" : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
            }`}
          >
            Demander la formule {name}
          </a>
          <p className="mt-2 text-center text-xs text-slate-500">
            Offerte pendant la phase pilote, activée par l’équipe geoclicMédia.
          </p>
        </>
      )}
    </div>
  );
}

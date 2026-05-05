import Link from "next/link";
import { CheckCircle, AlertCircle } from "lucide-react";
import { getCookieHeader } from "@/lib/auth-server";
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
  searchParams: Promise<{ plan?: string; checkout?: string }>;
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
  const businesses = await fetchMyBusinesses();
  // Pour la v1 : 1 user = 1 fiche → on prend la 1ère
  const business = businesses[0];

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
      <p className="mt-1 text-sm text-slate-600">
        Pour la fiche : <span className="font-medium">{business.name}</span>
      </p>

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
                Renouvellement le {formatDate(business.plan_ends_at)}
              </p>
            ) : null}
          </div>
          {!isFree ? (
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
              tagline="Encart pub local + photos illimitées + stats"
              business={business}
              plan="basic"
              suggested={sp.plan === "basic"}
            />
            <PlanCard
              name="Premium"
              price="149 €/an"
              tagline="Mise en avant home + multi-encarts + article partenaire"
              business={business}
              plan="premium"
              suggested={sp.plan === "premium"}
              highlight
            />
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/tarifs" className="underline hover:text-[#a8533a]">
              Voir le détail complet des plans
            </Link>
          </p>
        </div>
      ) : (
        <p className="mt-6 rounded-xl bg-slate-50 p-5 text-sm text-slate-700 ring-1 ring-slate-200">
          Tu peux mettre à jour ton moyen de paiement, télécharger tes
          factures ou annuler ton abonnement via le portail Stripe (bouton
          ci-dessus).
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
  suggested = false,
  highlight = false,
}: {
  name: string;
  price: string;
  tagline: string;
  business: AdminBusinessDetail;
  plan: "basic" | "premium";
  suggested?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "flex flex-col rounded-xl border bg-white p-5 transition " +
        (highlight
          ? "border-[#a8533a] shadow-md ring-2 ring-[#a8533a]/20"
          : suggested
            ? "border-[#1a4d6e] shadow-md ring-2 ring-[#1a4d6e]/20"
            : "border-slate-200 shadow-sm hover:shadow-md")
      }
    >
      <h3 className="font-serif text-lg font-semibold text-slate-900">{name}</h3>
      <p className="mt-1 font-serif text-2xl font-semibold text-slate-900">
        {price}
      </p>
      <p className="mt-2 text-sm text-slate-600">{tagline}</p>
      <CheckoutButton
        plan={plan}
        businessId={business.id}
        className="mt-4"
        variant={highlight ? "primary" : "secondary"}
      >
        Choisir {name}
      </CheckoutButton>
    </div>
  );
}

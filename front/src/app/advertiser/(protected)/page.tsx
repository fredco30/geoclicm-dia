import Link from "next/link";
import { Check, Clock } from "lucide-react";
import { getCookieHeader, getCurrentUser } from "@/lib/auth-server";
import type { Paginated } from "@/types/api";
import type { AdminAdCampaignListItem, AdminBusinessListItem } from "@/types/admin";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

async function fetchMine<T>(path: string): Promise<T[]> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { Cookie: await getCookieHeader(), Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return [];
  return ((await res.json()) as Paginated<T>).results;
}

type StepState = "done" | "waiting" | "todo";

type Step = {
  title: string;
  state: StepState;
  text: string;
  action?: { href: string; label: string };
};

/**
 * Tableau de bord annonceur : indique où en est le commerçant (fiche créée,
 * relue, en ligne, campagne) et la prochaine chose à faire, au lieu de deux
 * raccourcis identiques pour tout le monde.
 */
export default async function AdvertiserDashboardPage() {
  const [user, businesses, campaigns] = await Promise.all([
    getCurrentUser(),
    fetchMine<AdminBusinessListItem>("/api/advertiser/businesses/?ordering=name"),
    fetchMine<AdminAdCampaignListItem>("/api/advertiser/ad-campaigns/"),
  ]);
  // Le layout (protected) garantit user non-null + role≠reader

  const first = businesses[0];
  const online = businesses.find((b) => b.is_published);
  const hasPendingChanges = businesses.some((b) => b.is_published && b.has_pending_changes);

  const steps: Step[] = [
    first
      ? {
          title: "Créer votre fiche commerce",
          state: "done",
          text:
            businesses.length > 1
              ? `${businesses.length} fiches créées.`
              : `Fiche « ${first.name} » créée.`,
          action: { href: "/advertiser/fiches", label: "Voir mes fiches" },
        }
      : {
          title: "Créer votre fiche commerce",
          state: "todo",
          text: "Description, adresse, horaires, logo et photo : comptez cinq minutes.",
          action: { href: "/advertiser/fiches/new", label: "Créer ma fiche" },
        },
    !first
      ? {
          title: "Relecture par l'équipe",
          state: "todo",
          text: "Chaque fiche est relue avant sa mise en ligne, sous 24 h ouvrées.",
        }
      : online
        ? {
            title: "Fiche en ligne",
            state: hasPendingChanges ? "waiting" : "done",
            text: hasPendingChanges
              ? "Votre fiche est visible. Vos dernières modifications sont en cours de relecture : la version précédente reste affichée en attendant."
              : "Votre fiche est visible dans l'annuaire et sur la carte.",
            action: { href: `/commerces/${online.slug}`, label: "Voir ma fiche publique" },
          }
        : {
            title: "Relecture par l'équipe",
            state: "waiting",
            text: "Votre fiche est en cours de relecture (24 h ouvrées). Vous n'avez rien à faire ; vous pouvez encore la compléter.",
            action: { href: `/advertiser/fiches/${first.slug}/edit`, label: "Compléter ma fiche" },
          },
    campaigns.length > 0
      ? {
          title: "Campagne publicitaire",
          state: "done",
          text: `${campaigns.length} campagne${campaigns.length > 1 ? "s" : ""} créée${campaigns.length > 1 ? "s" : ""}.`,
          action: { href: "/advertiser/campagnes", label: "Voir mes campagnes" },
        }
      : {
          title: "Aller plus loin : une campagne publicitaire",
          state: "todo",
          text: "Facultatif. Un encart sur l'accueil, les articles ou l'annuaire, gratuit pendant la phase pilote.",
          action: first
            ? { href: "/advertiser/campagnes/new", label: "Créer une campagne" }
            : undefined,
        },
  ];
  // La prochaine action à mener : première étape encore « à faire » qui en propose une.
  const nextIndex = steps.findIndex((step) => step.state === "todo" && step.action);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        Bienvenue, {user!.first_name || user!.full_name} 👋
      </h1>
      <p className="mt-2 max-w-prose text-slate-600">
        {first
          ? "Voici où en est votre présence sur le site."
          : "Trois étapes pour apparaître sur le site. Commencez par votre fiche commerce."}
      </p>

      <ol className="mt-8 space-y-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className={`flex gap-4 rounded-xl border bg-white p-5 ${
              index === nextIndex ? "border-terracotta shadow-md" : "border-slate-200"
            }`}
          >
            <StepBadge state={step.state} number={index + 1} />
            <div className="min-w-0 flex-1">
              <h2 className="font-serif text-lg font-semibold text-slate-900">{step.title}</h2>
              <p className="mt-1 text-sm text-slate-600">{step.text}</p>
              {step.action ? (
                <Link
                  href={step.action.href}
                  className={
                    index === nextIndex
                      ? "mt-3 inline-block rounded-md bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta-dark"
                      : "mt-3 inline-block text-sm font-medium text-terracotta hover:underline"
                  }
                >
                  {step.action.label}
                  {index === nextIndex ? "" : " →"}
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-xl bg-salt p-5 ring-1 ring-terracotta/30">
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

function StepBadge({ state, number }: { state: StepState; number: number }) {
  if (state === "done") {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
        <Check className="h-5 w-5" aria-hidden />
        <span className="sr-only">Fait</span>
      </span>
    );
  }
  if (state === "waiting") {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800">
        <Clock className="h-5 w-5" aria-hidden />
        <span className="sr-only">En attente</span>
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">
      {number}
    </span>
  );
}

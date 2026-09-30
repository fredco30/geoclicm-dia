import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth-server";
import { AdvertiserLoginForm } from "@/components/advertiser/login-form";
import { LoginForbiddenBanner } from "@/components/advertiser/login-forbidden-banner";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connexion annonceur — geoclicMédia",
  robots: { index: false, follow: false },
};

export default async function AdvertiserLoginPage() {
  const user = await getCurrentUser();

  // Redirige uniquement les utilisateurs autorisés à entrer dans l'espace
  // annonceur. Sinon (rôle reader), on reste sur la page login pour éviter
  // la boucle de redirections /advertiser ↔ /advertiser/login.
  if (user && user.role !== "reader") {
    redirect("/advertiser");
  }

  // Cas spécial : reader connecté → affiche un bandeau explicite + bouton
  // déconnexion, plus le formulaire au cas où il veut se ré-authentifier
  // avec un autre compte.
  const isForbiddenReader = user !== null && user.role === "reader";

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <div className="mb-6 text-center">
        <h1 className="font-serif text-2xl font-semibold text-slate-900">
          Espace annonceur
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Connecte-toi pour gérer ta fiche commerce et tes campagnes.
        </p>
      </div>

      {isForbiddenReader ? (
        <LoginForbiddenBanner email={user.email} />
      ) : null}

      <Suspense fallback={null}>
        <AdvertiserLoginForm />
      </Suspense>
    </div>
  );
}

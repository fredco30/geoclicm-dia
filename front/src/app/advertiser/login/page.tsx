import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth-server";
import { AdvertiserLoginForm } from "@/components/advertiser/login-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connexion annonceur — geoclicMédia",
  robots: { index: false, follow: false },
};

export default async function AdvertiserLoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/advertiser");
  }

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
      <Suspense fallback={null}>
        <AdvertiserLoginForm />
      </Suspense>
    </div>
  );
}

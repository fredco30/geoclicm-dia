import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import { AdvertiserRegisterForm } from "@/components/advertiser/register-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Inscription annonceur — geoclicMédia",
  robots: { index: false, follow: false },
};

export default async function AdvertiserRegisterPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/advertiser");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="mb-6 text-center">
        <h1 className="font-serif text-2xl font-semibold text-slate-900">
          Inscription annonceur
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Crée ton compte pour publier ta fiche commerce et lancer des
          campagnes publicitaires sur geoclicMédia.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Inscription gratuite — phase pilote été 2026.
        </p>
      </div>
      <AdvertiserRegisterForm />
    </div>
  );
}

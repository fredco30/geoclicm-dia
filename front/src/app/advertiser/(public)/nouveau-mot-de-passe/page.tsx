import type { Metadata } from "next";
import Link from "next/link";

import { NewPasswordForm } from "@/components/advertiser/password-forms";

export const metadata: Metadata = {
  title: "Nouveau mot de passe",
  robots: { index: false, follow: false },
  // Le lien contient un jeton : ne jamais le transmettre à un autre site.
  referrer: "no-referrer",
};

type Props = { searchParams: Promise<{ uid?: string; token?: string }> };

/** Page d'arrivée du lien reçu par email. */
export default async function NewPasswordPage({ searchParams }: Props) {
  const { uid, token } = await searchParams;

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <div className="mb-6 text-center">
        <h1 className="font-serif text-2xl font-semibold text-slate-900">Nouveau mot de passe</h1>
        <p className="mt-1 text-sm text-slate-600">Choisissez le mot de passe de votre compte.</p>
      </div>

      {uid && token ? (
        <NewPasswordForm uid={uid} token={token} />
      ) : (
        <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
          <p>Ce lien est incomplet. Ouvrez-le depuis l&apos;email reçu, ou refaites une demande.</p>
          <Link href="/advertiser/mot-de-passe-oublie" className="font-medium text-camargue underline">
            Refaire une demande
          </Link>
        </div>
      )}
    </div>
  );
}

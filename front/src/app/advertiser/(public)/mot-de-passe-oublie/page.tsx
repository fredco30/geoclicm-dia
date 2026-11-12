import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/advertiser/password-forms";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Mot de passe oublié",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ from?: string }> };

/** Commune aux annonceurs et à la rédaction (?from=admin pour le lien retour). */
export default async function ForgotPasswordPage({ searchParams }: Props) {
  const [{ from }, site] = await Promise.all([searchParams, getSiteSettings()]);
  const loginHref = from === "admin" ? "/admin/login" : "/advertiser/login";

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <div className="mb-6 text-center">
        <h1 className="font-serif text-2xl font-semibold text-slate-900">Mot de passe oublié</h1>
        <p className="mt-1 text-sm text-slate-600">
          {site.password_reset_enabled
            ? "Indiquez l'adresse email de votre compte : nous vous envoyons un lien pour choisir un nouveau mot de passe."
            : "Nous vous en créons un nouveau sur simple demande."}
        </p>
      </div>

      {site.password_reset_enabled ? (
        <ForgotPasswordForm loginHref={loginHref} />
      ) : (
        // Aucun serveur d'envoi d'emails configuré : réinitialisation par l'équipe.
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
          <p>
            Écrivez-nous depuis l&apos;adresse email de votre compte, nous vous
            répondons sous 24 h ouvrées avec un nouveau mot de passe.
          </p>
          <a
            href="mailto:contact@geoclic.fr?subject=Mot%20de%20passe%20oubli%C3%A9"
            className="inline-flex w-full items-center justify-center rounded-md bg-camargue px-4 py-2.5 font-medium text-white hover:bg-camargue-dark"
          >
            Écrire à contact@geoclic.fr
          </a>
          <p className="text-center">
            <Link href={loginHref} className="text-slate-600 hover:text-camargue hover:underline">
              Retour à la connexion
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}

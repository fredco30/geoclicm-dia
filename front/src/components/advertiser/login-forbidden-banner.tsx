"use client";

import { AlertTriangle } from "lucide-react";
import { LogoutButton } from "@/components/admin/logout-button";

type Props = {
  email: string;
};

/**
 * Bandeau affiché sur /advertiser/login quand l'utilisateur courant est
 * connecté avec un rôle insuffisant (reader). Évite que l'utilisateur reste
 * coincé sans comprendre pourquoi il ne peut pas accéder à l'espace annonceur.
 */
export function LoginForbiddenBanner({ email }: Props) {
  return (
    <div
      role="alert"
      className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
          aria-hidden
        />
        <div>
          <p className="font-semibold">Accès refusé à l&apos;espace annonceur</p>
          <p className="mt-1">
            Votre compte <span className="font-mono">{email}</span> est connecté
            avec un rôle <strong>Lecteur</strong>, qui ne donne pas accès à
            cette section. Pour gérer une fiche commerce, votre rôle doit être
            mis à niveau en <em>Annonceur</em> par l&apos;équipe geoclicMédia.
          </p>
          <p className="mt-2">
            Vous pouvez aussi vous déconnecter pour vous identifier avec un
            autre compte.
          </p>
          <div className="mt-3">
            <LogoutButton redirectTo="/advertiser/login" variant="inline" />
          </div>
          <p className="mt-3 text-xs text-amber-800">
            Demande de mise à niveau :{" "}
            <a
              href="mailto:contact@geoclic.fr"
              className="underline hover:no-underline"
            >
              contact@geoclic.fr
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { AlertTriangle } from "lucide-react";
import { LogoutButton } from "@/components/admin/logout-button";

type Props = {
  email: string;
  /** Libellé humain du rôle courant (ex: "Lecteur", "Annonceur"). */
  currentRoleLabel: string;
};

/**
 * Bandeau affiché sur /admin/login quand l'utilisateur courant est connecté
 * avec un rôle insuffisant pour publier (reader ou advertiser). Évite que
 * l'utilisateur reste coincé en lui proposant un bouton de déconnexion clair
 * et l'adresse de contact pour demander une mise à niveau.
 */
export function LoginForbiddenBanner({ email, currentRoleLabel }: Props) {
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
          <p className="font-semibold">
            Accès refusé à l&apos;administration
          </p>
          <p className="mt-1">
            Votre compte <span className="font-mono">{email}</span> est connecté
            avec un rôle <strong>{currentRoleLabel}</strong>, qui ne permet pas
            de publier sur geoclicMédia. Pour rédiger ou modifier des articles,
            votre rôle doit être mis à niveau en <em>Rédacteur</em> ou{" "}
            <em>Administrateur</em>.
          </p>
          <p className="mt-2">
            Vous pouvez aussi vous déconnecter pour vous identifier avec un
            autre compte (par exemple un compte rédacteur partagé).
          </p>
          <div className="mt-3">
            <LogoutButton redirectTo="/admin/login" variant="inline" />
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

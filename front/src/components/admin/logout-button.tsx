"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";
import { useState } from "react";

type Props = {
  /** Chemin vers lequel rediriger après déconnexion. Default: /admin/login. */
  redirectTo?: string;
  /** Style alternatif pour les contextes hors-sidebar (ex: bouton inline). */
  variant?: "sidebar" | "inline";
};

export function LogoutButton({ redirectTo = "/admin/login", variant = "sidebar" }: Props = {}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    setBusy(true);
    try {
      await auth.logout();
    } catch {
      /* ignore */
    }
    router.push(redirectTo);
    router.refresh();
  };

  const className =
    variant === "inline"
      ? "inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      : "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50";

  return (
    <button type="button" onClick={handleLogout} disabled={busy} className={className}>
      <LogOut className="h-4 w-4" />
      {busy ? "Déconnexion..." : "Déconnexion"}
    </button>
  );
}

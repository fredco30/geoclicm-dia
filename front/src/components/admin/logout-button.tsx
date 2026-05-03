"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    setBusy(true);
    try {
      await auth.logout();
    } catch {
      /* ignore */
    }
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={busy}
      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
    >
      <LogOut className="h-4 w-4" />
      {busy ? "Déconnexion..." : "Déconnexion"}
    </button>
  );
}

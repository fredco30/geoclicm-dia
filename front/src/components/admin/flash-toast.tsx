"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

import { FLASH_EVENT, takeFlash } from "@/lib/flash";

const VISIBLE_MS = 4000;

/**
 * Confirmation discrète après une écriture réussie (enregistrement,
 * suppression). Déclenchée par `flash()` depuis apiFetch ; relue à chaque
 * changement de page car un enregistrement est souvent suivi d'une
 * redirection.
 */
export function FlashToast() {
  const pathname = usePathname();
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const onFlash = (event: Event) => {
      takeFlash();
      setMessage((event as CustomEvent<string>).detail);
    };
    window.addEventListener(FLASH_EVENT, onFlash);
    // Message posé juste avant une redirection vers cette page.
    const pending = takeFlash();
    if (pending) window.dispatchEvent(new CustomEvent(FLASH_EVENT, { detail: pending }));
    return () => window.removeEventListener(FLASH_EVENT, onFlash);
  }, [pathname]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(null), VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [message]);

  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 top-4 z-[120] flex justify-center px-4">
      {message ? (
        <div className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4 text-green-400" aria-hidden />
          {message}
        </div>
      ) : null}
    </div>
  );
}

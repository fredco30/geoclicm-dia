"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";

import { apiFetch } from "@/lib/api";

function readCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function RunMultiButton({
  sourceId,
  label,
  disabled,
}: {
  sourceId: number;
  label: string;
  disabled?: boolean;
}) {
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const runMulti = async () => {
    if (
      !window.confirm(
        `Lancer la passe IA multi sur « ${label} » ?\n\n` +
          "Cette analyse consomme du crédit IA (payant). Seuls les contenus " +
          "modifiés depuis la dernière passe sont analysés. Aucun lancement " +
          "automatique n'existe : chaque passe part d'un clic.",
      )
    ) {
      return;
    }

    setIsRunning(true);
    setMessage(null);

    try {
      let csrf = readCsrfToken();
      if (!csrf) {
        await apiFetch("/api/auth/csrf/");
        csrf = readCsrfToken();
      }

      const response = await apiFetch(
        `/api/admin/crawl-sources/${sourceId}/run-multi/`,
        {
          method: "POST",
          headers: csrf ? { "X-CSRFToken": csrf } : {},
        },
      );
      const payload = await response.json().catch(() => null);

      setMessage(
        payload?.detail ??
          (response.ok
            ? "Passe IA lancée en arrière-plan."
            : "La passe IA n'a pas pu être lancée."),
      );
    } catch {
      setMessage("Erreur réseau pendant le lancement.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={runMulti}
        disabled={disabled || isRunning}
        title="Lancer la passe IA multi (payant, manuel)"
        aria-label={`Lancer la passe IA multi sur ${label}`}
        className="rounded-md p-2 text-[#1a4d6e] hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
      >
        {isRunning ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="h-4 w-4" aria-hidden />
        )}
      </button>
      {message ? (
        <span
          className="max-w-56 text-right text-xs text-slate-600"
          aria-live="polite"
        >
          {message}
        </span>
      ) : null}
    </span>
  );
}

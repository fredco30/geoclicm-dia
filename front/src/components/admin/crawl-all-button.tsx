"use client";

import { useState } from "react";
import { Loader2, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

function readCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function CrawlAllButton({ dueCount }: { dueCount: number }) {
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const runAll = async () => {
    if (
      !window.confirm(
        `Actualiser les ${dueCount} source(s) arrivée(s) à échéance ?`,
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

      const response = await apiFetch("/api/admin/crawl-sources/run-all/", {
        method: "POST",
        headers: csrf ? { "X-CSRFToken": csrf } : {},
      });
      const payload = await response.json().catch(() => null);

      setMessage(
        payload?.detail ??
          (response.ok
            ? "Actualisation lancée en arrière-plan."
            : "L’actualisation n’a pas pu être lancée."),
      );
    } catch {
      setMessage("Erreur réseau pendant l’actualisation.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={isRunning || dueCount === 0}
        onClick={runAll}
      >
        {isRunning ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <Play className="h-4 w-4" aria-hidden />
        )}
        {isRunning ? "Lancement…" : "Actualiser les sources"}
      </Button>
      {message ? (
        <p className="max-w-72 text-right text-xs text-slate-600" aria-live="polite">
          {message}
        </p>
      ) : null}
    </div>
  );
}

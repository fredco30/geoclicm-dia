"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";

function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

type Plan = "basic" | "premium";

type CheckoutProps = {
  plan: Plan;
  businessId: number;
  className?: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
};

export function CheckoutButton({
  plan,
  businessId,
  className,
  children,
  variant = "primary",
}: CheckoutProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setBusy(true);
    setError(null);

    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }

    try {
      const res = await apiFetch("/api/advertiser/checkout/", {
        method: "POST",
        headers: csrf ? { "X-CSRFToken": csrf } : {},
        body: JSON.stringify({ plan, business_id: businessId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.detail || "Erreur lors de la création du paiement.");
        setBusy(false);
        return;
      }
      const { checkout_url } = (await res.json()) as { checkout_url: string };
      window.location.href = checkout_url;
    } catch {
      setError("Erreur réseau, réessaie.");
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <Button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="w-full"
        variant={variant === "secondary" ? "secondary" : "primary"}
      >
        {busy ? "Redirection vers Stripe…" : children}
      </Button>
      {error ? (
        <p className="mt-2 rounded bg-red-50 px-3 py-2 text-xs text-red-800 ring-1 ring-red-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type PortalProps = {
  businessId: number;
  className?: string;
};

export function PortalButton({ businessId, className }: PortalProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setBusy(true);
    setError(null);

    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }

    try {
      const res = await apiFetch("/api/advertiser/portal/", {
        method: "POST",
        headers: csrf ? { "X-CSRFToken": csrf } : {},
        body: JSON.stringify({ business_id: businessId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.detail || "Erreur portail Stripe.");
        setBusy(false);
        return;
      }
      const { portal_url } = (await res.json()) as { portal_url: string };
      window.location.href = portal_url;
    } catch {
      setError("Erreur réseau, réessaie.");
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <Button type="button" onClick={handleClick} disabled={busy} variant="secondary">
        {busy ? "Redirection…" : "Gérer mon abonnement"}
      </Button>
      {error ? (
        <p className="mt-2 text-xs text-red-700">{error}</p>
      ) : null}
    </div>
  );
}

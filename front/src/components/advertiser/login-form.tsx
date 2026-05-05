"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdvertiserLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/advertiser";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      // L'identifiant côté API est `username` mais on stocke email comme username
      // pour les annonceurs (cf. AdvertiserRegisterView).
      const res = await auth.login(email, password);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.detail || "Identifiants invalides.");
        setBusy(false);
        return;
      }
      router.push(next);
      router.refresh();
    } catch {
      setError("Erreur réseau, réessaie.");
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="password">Mot de passe</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      {error ? (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
          {error}
        </div>
      ) : null}

      <Button type="submit" disabled={busy} className="w-full" size="lg">
        {busy ? "Connexion..." : "Se connecter"}
      </Button>

      <p className="text-center text-sm text-slate-600">
        Pas encore de compte ?{" "}
        <Link
          href="/advertiser/register"
          className="font-medium text-[#a8533a] hover:underline"
        >
          Inscription gratuite
        </Link>
      </p>
    </form>
  );
}

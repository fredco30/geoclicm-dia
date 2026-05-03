"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await auth.login(username, password);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data?.detail || "Identifiants invalides.");
        setBusy(false);
        return;
      }
      router.push("/admin");
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
        <Label htmlFor="username">Identifiant</Label>
        <Input
          id="username"
          type="text"
          autoComplete="username"
          required
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
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
    </form>
  );
}

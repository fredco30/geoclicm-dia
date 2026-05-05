"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AdvertiserRegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    password: "",
    password_confirm: "",
    first_name: "",
    last_name: "",
    phone: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.password_confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setBusy(true);
    try {
      const res = await auth.registerAdvertiser({
        email: form.email,
        password: form.password,
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone || undefined,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Format des erreurs DRF : { field: ["message"] }
        const messages: string[] = [];
        for (const [field, msgs] of Object.entries(data)) {
          const arr = Array.isArray(msgs) ? msgs : [String(msgs)];
          messages.push(`${field} : ${arr.join(" ")}`);
        }
        setError(messages.join("\n") || "Inscription impossible.");
        setBusy(false);
        return;
      }
      // Login auto côté backend → on redirige vers le dashboard
      router.push("/advertiser");
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
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="first_name">Prénom *</Label>
          <Input
            id="first_name"
            required
            autoFocus
            value={form.first_name}
            onChange={(e) => update("first_name", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="last_name">Nom *</Label>
          <Input
            id="last_name"
            required
            value={form.last_name}
            onChange={(e) => update("last_name", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => update("email", e.target.value)}
        />
        <p className="text-xs text-slate-500">
          Servira aussi d&apos;identifiant de connexion.
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="phone">Téléphone</Label>
        <Input
          id="phone"
          type="tel"
          autoComplete="tel"
          value={form.phone}
          onChange={(e) => update("phone", e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="password">Mot de passe *</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={form.password}
          onChange={(e) => update("password", e.target.value)}
        />
        <p className="text-xs text-slate-500">Minimum 8 caractères.</p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="password_confirm">Confirmation mot de passe *</Label>
        <Input
          id="password_confirm"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={form.password_confirm}
          onChange={(e) => update("password_confirm", e.target.value)}
        />
      </div>

      {error ? (
        <pre className="whitespace-pre-wrap rounded-md bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
          {error}
        </pre>
      ) : null}

      <Button type="submit" disabled={busy} className="w-full" size="lg">
        {busy ? "Inscription..." : "Créer mon compte"}
      </Button>

      <p className="text-center text-sm text-slate-600">
        Déjà inscrit ?{" "}
        <Link
          href="/advertiser/login"
          className="font-medium text-[#a8533a] hover:underline"
        >
          Connexion
        </Link>
      </p>
    </form>
  );
}

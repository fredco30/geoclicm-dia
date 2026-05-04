"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, Trash2, KeyRound } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import type { AdminUser } from "@/types/admin";

type Props = {
  user?: AdminUser; // undefined → mode création
  currentUserId: number; // pour empêcher self-delete
};

const ROLES: { value: string; label: string; help: string }[] = [
  { value: "reader", label: "Lecteur", help: "Aucun droit de publication." },
  { value: "advertiser", label: "Annonceur", help: "Sera utilisé par les commerçants (sprint 4)." },
  { value: "editor", label: "Rédacteur", help: "Peut créer et éditer ses propres articles." },
  { value: "admin", label: "Administrateur", help: "Tous les droits, y compris gestion comptes." },
];

function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function UserForm({ user, currentUserId }: Props) {
  const router = useRouter();
  const isEdit = !!user;

  const [form, setForm] = useState({
    username: user?.username ?? "",
    email: user?.email ?? "",
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    role: user?.role ?? "editor",
    phone: user?.phone ?? "",
    is_active: user?.is_active ?? true,
    is_staff: user?.is_staff ?? false,
    password: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }

    const url = isEdit ? `/api/users/${user!.id}/` : `/api/users/`;
    const method = isEdit ? "PATCH" : "POST";

    // En édition, ne pas envoyer password si vide (pour ne pas écraser)
    const payload: Record<string, unknown> = { ...form };
    if (isEdit && !form.password) delete payload.password;

    startTransition(async () => {
      try {
        const res = await apiFetch(url, {
          method,
          body: JSON.stringify(payload),
          headers: csrf ? { "X-CSRFToken": csrf } : {},
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(JSON.stringify(data, null, 2));
          return;
        }
        router.push("/admin/settings/users");
        router.refresh();
      } catch {
        setError("Erreur réseau, réessaie.");
      }
    });
  };

  const handleDelete = async () => {
    if (!isEdit) return;
    if (user!.id === currentUserId) {
      setError("Tu ne peux pas supprimer ton propre compte.");
      return;
    }
    if (!confirm(`Supprimer définitivement « ${user!.full_name} » ?`)) return;

    let csrf = readCsrfToken();
    if (!csrf) {
      await apiFetch("/api/auth/csrf/");
      csrf = readCsrfToken();
    }

    startTransition(async () => {
      const res = await apiFetch(`/api/users/${user!.id}/`, {
        method: "DELETE",
        headers: csrf ? { "X-CSRFToken": csrf } : {},
      });
      if (res.ok || res.status === 204) {
        router.push("/admin/settings/users");
        router.refresh();
      } else {
        setError("Suppression impossible.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link
            href="/admin/settings/users"
            className="text-sm text-slate-600 hover:text-[#1a4d6e]"
          >
            ← Comptes
          </Link>
          <h1 className="text-xl font-bold text-slate-900">
            {isEdit ? `Éditer ${user!.full_name}` : "Nouveau compte"}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {isEdit && user!.id !== currentUserId ? (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={handleDelete}
              disabled={isPending}
            >
              <Trash2 className="h-4 w-4" /> Supprimer
            </Button>
          ) : null}
          <Button type="submit" disabled={isPending} size="md">
            <Save className="h-4 w-4" />
            {isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      {error ? (
        <pre className="overflow-auto rounded-md bg-red-50 p-3 text-xs text-red-800 ring-1 ring-red-200">
          {error}
        </pre>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Identité
          </legend>
          <div className="space-y-1">
            <Label htmlFor="username">Identifiant de connexion</Label>
            <Input
              id="username"
              required
              value={form.username}
              onChange={(e) => update("username", e.target.value)}
              disabled={isEdit}
            />
            {isEdit ? (
              <p className="text-xs text-slate-500">
                L&apos;identifiant ne peut pas être changé après création.
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="first_name">Prénom</Label>
              <Input
                id="first_name"
                value={form.first_name}
                onChange={(e) => update("first_name", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="last_name">Nom</Label>
              <Input
                id="last_name"
                value={form.last_name}
                onChange={(e) => update("last_name", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="phone">Téléphone</Label>
            <Input
              id="phone"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Rôle &amp; droits
          </legend>
          <div className="space-y-1">
            <Label htmlFor="role">Rôle</Label>
            <Select
              id="role"
              value={form.role}
              onChange={(e) => update("role", e.target.value as typeof form.role)}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </Select>
            <p className="text-xs text-slate-500">
              {ROLES.find((r) => r.value === form.role)?.help}
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => update("is_active", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Compte actif (peut se connecter)
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.is_staff}
              onChange={(e) => update("is_staff", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Accès Django Admin (utile pour debug technique)
          </label>

          {user?.is_superuser ? (
            <p className="rounded bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
              ⚠️ Ce compte est <strong>superuser</strong> (créé via{" "}
              <code>createsuperuser</code>). Ce flag ne se modifie pas via cet
              écran — utilise la ligne de commande si nécessaire.
            </p>
          ) : null}
        </fieldset>

        <fieldset className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
          <legend className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <KeyRound className="h-3 w-3" /> Mot de passe
          </legend>
          <div className="space-y-1">
            <Label htmlFor="password">
              {isEdit ? "Nouveau mot de passe (optionnel)" : "Mot de passe"}
            </Label>
            <Input
              id="password"
              type="password"
              required={!isEdit}
              minLength={8}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              autoComplete="new-password"
              placeholder={isEdit ? "Laisser vide pour ne pas changer" : "Min 8 caractères"}
            />
            <p className="text-xs text-slate-500">
              {isEdit
                ? "Laisse vide pour ne pas changer le mot de passe."
                : "Le compte sera utilisable dès la création. Communique le mot de passe à la personne via un canal sécurisé."}
            </p>
          </div>
        </fieldset>
      </div>
    </form>
  );
}

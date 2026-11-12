"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { auth } from "@/lib/api";
import { formatApiError } from "@/lib/api-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const CARD = "space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm";
const NETWORK_ERROR = "Erreur réseau. Vérifiez votre connexion et réessayez.";

function ErrorBox({ message }: { message: string }) {
  return (
    <div role="alert" className="whitespace-pre-line rounded-md bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
      {message}
    </div>
  );
}

function Done({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={CARD} role="status">
      <CheckCircle2 className="h-8 w-8 text-green-600" aria-hidden />
      <h2 className="font-serif text-lg font-semibold text-slate-900">{title}</h2>
      <div className="space-y-3 text-sm text-slate-600">{children}</div>
    </div>
  );
}

/** Étape 1 : demander le lien de réinitialisation par email. */
export function ForgotPasswordForm({ loginHref }: { loginHref: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await auth.requestPasswordReset(email);
      if (res.ok) setSent(true);
      else setError(formatApiError(await res.json().catch(() => null), "Demande impossible."));
    } catch {
      setError(NETWORK_ERROR);
    }
    setBusy(false);
  };

  if (sent) {
    return (
      <Done title="Vérifiez votre boîte mail">
        <p>
          Si un compte existe avec l&apos;adresse <strong>{email}</strong>, un email
          contenant un lien de réinitialisation vient d&apos;être envoyé. Le lien est
          valable 24 heures.
        </p>
        <p>Rien reçu après quelques minutes ? Regardez dans les courriers indésirables.</p>
        <Link href={loginHref} className="font-medium text-camargue underline">
          Retour à la connexion
        </Link>
      </Done>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={CARD}>
      <div className="space-y-1">
        <Label htmlFor="email">Adresse email du compte</Label>
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
      {error ? <ErrorBox message={error} /> : null}
      <Button type="submit" disabled={busy} className="w-full" size="lg">
        {busy ? "Envoi..." : "Recevoir le lien"}
      </Button>
      <p className="text-center text-sm">
        <Link href={loginHref} className="text-slate-600 hover:text-camargue hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}

/** Étape 2 : choisir le nouveau mot de passe depuis le lien reçu. */
export function NewPasswordForm({ uid, token }: { uid: string; token: string }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    try {
      const res = await auth.confirmPasswordReset(uid, token, password);
      if (res.ok) setDone(true);
      else setError(formatApiError(await res.json().catch(() => null), "Modification impossible."));
    } catch {
      setError(NETWORK_ERROR);
    }
    setBusy(false);
  };

  if (done) {
    return (
      <Done title="Mot de passe modifié">
        <p>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <Link href="/advertiser/login" className="font-medium text-camargue underline">
            Espace annonceur
          </Link>
          <Link href="/admin/login" className="font-medium text-camargue underline">
            Back-office de la rédaction
          </Link>
        </p>
      </Done>
    );
  }

  const type = visible ? "text" : "password";
  return (
    <form onSubmit={handleSubmit} className={CARD}>
      <div className="space-y-1">
        <Label htmlFor="password">Nouveau mot de passe</Label>
        <Input
          id="password"
          type={type}
          autoComplete="new-password"
          required
          minLength={8}
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-slate-500">Minimum 8 caractères, pas uniquement des chiffres.</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="password_confirm">Confirmation</Label>
        <Input
          id="password_confirm"
          type={type}
          autoComplete="new-password"
          required
          minLength={8}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={visible}
          onChange={(e) => setVisible(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300"
        />
        Afficher les mots de passe
      </label>
      {error ? <ErrorBox message={error} /> : null}
      <Button type="submit" disabled={busy} className="w-full" size="lg">
        {busy ? "Enregistrement..." : "Enregistrer le nouveau mot de passe"}
      </Button>
    </form>
  );
}

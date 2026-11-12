"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, Send } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { formatApiError } from "@/lib/api-errors";
import { Button } from "@/components/ui/button";

type Props = {
  slug: string;
  title: string;
  chapeau: string;
  /** Publication automatique configurée (jeton de page Facebook). */
  pageEnabled: boolean;
  postId: string;
  publishedAt: string | null;
};

function csrf(): string | null {
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Partage d'un article publié sur Facebook.
 *
 * - Toujours : fenêtre de partage Facebook et texte du post prêt à coller.
 * - Si la page est configurée : publication directe sur la page, une seule
 *   fois par article (le serveur l'empêche aussi).
 */
export function FacebookShare({ slug, title, chapeau, pageEnabled, postId, publishedAt }: Props) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [post, setPost] = useState({ id: postId, at: publishedAt });

  // Adresse absolue obligatoire pour Facebook ; identique au rendu serveur
  // et navigateur (pas de window ici, sinon décalage à l'hydratation).
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://media.geoclic.fr").replace(/\/$/, "");
  const url = `${siteUrl}/articles/${slug}`;
  const text = [title, chapeau, url].filter(Boolean).join("\n\n");
  const done = post.id && post.id !== "pending";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setMessage("Copie impossible : sélectionnez le texte à la main.");
    }
  };

  const publishOnPage = async () => {
    setBusy(true);
    setMessage(null);
    if (!csrf()) await apiFetch("/api/auth/csrf/");
    const token = csrf();
    const res = await apiFetch(`/api/articles/${slug}/facebook/`, {
      method: "POST",
      headers: token ? { "X-CSRFToken": token } : {},
    }).catch(() => null);
    const data = await res?.json().catch(() => null);
    if (res?.ok) setPost({ id: data.facebook_post_id, at: data.facebook_published_at });
    else setMessage(formatApiError(data, "Publication Facebook impossible."));
    setBusy(false);
  };

  return (
    <div className="space-y-3 text-sm">
      {done ? (
        <p className="flex items-start gap-2 rounded-md bg-green-50 p-2 text-green-800">
          <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            Publié sur la page Facebook
            {post.at ? ` le ${new Date(post.at).toLocaleString("fr-FR", { dateStyle: "long", timeStyle: "short" })}` : ""}
            .{" "}
            <a
              href={`https://www.facebook.com/${post.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Voir le post
            </a>
          </span>
        </p>
      ) : pageEnabled ? (
        <Button type="button" size="sm" className="w-full" disabled={busy} onClick={() => void publishOnPage()}>
          <Send className="h-4 w-4" aria-hidden />
          {busy ? "Publication..." : "Publier sur la page Facebook"}
        </Button>
      ) : null}

      <div className="flex flex-col gap-2">
        <a
          href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-800 hover:bg-slate-50"
        >
          <ExternalLink className="h-4 w-4" aria-hidden /> Partager via Facebook
        </a>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-slate-800 hover:bg-slate-50"
        >
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? "Texte copié" : "Copier le texte du post"}
        </button>
      </div>
      <p className="text-xs text-slate-500">
        {pageEnabled
          ? "La publication sur la page est faite une seule fois par article."
          : "« Partager via Facebook » ouvre Facebook avec l'aperçu de l'article : choisissez de publier sur votre page. La publication automatique n'est pas activée."}
      </p>
      {message ? (
        <p role="alert" className="rounded bg-red-50 p-2 text-xs text-red-800">
          {message}
        </p>
      ) : null}
    </div>
  );
}

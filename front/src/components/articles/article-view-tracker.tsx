"use client";

import { useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

/**
 * Compte une lecture côté navigateur (la page est servie depuis le cache
 * Next : un comptage au rendu serveur ne mesurait rien). Sans cookie, le
 * serveur dédoublonne par IP hashée.
 */
export function ArticleViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch(`${API_URL}/api/articles/${encodeURIComponent(slug)}/view/`, {
      method: "POST",
      credentials: "omit",
      keepalive: true,
    }).catch(() => {});
  }, [slug]);
  return null;
}

/**
 * Helpers d'auth côté server components.
 *
 * Lecture des cookies de la requête + forward vers Django pour valider la session.
 */
import { cookies } from "next/headers";
import type { PendingCounts } from "@/types/admin";
import type { CurrentUser, Paginated } from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8002";

/**
 * Récupère l'utilisateur courant côté server component.
 * Retourne null si pas connecté ou session invalide.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("sessionid");
  if (!sessionCookie) return null;

  // Forward le cookie session à Django
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  try {
    const res = await fetch(`${API_URL}/api/auth/me/`, {
      headers: {
        Cookie: cookieHeader,
        Accept: "application/json",
      },
      cache: "no-store", // toujours frais (auth)
    });
    if (!res.ok) return null;
    return (await res.json()) as CurrentUser;
  } catch {
    return null;
  }
}

/**
 * Forward les cookies de la requête à un fetch API (pour appeler Django avec auth).
 */
export async function getCookieHeader(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

/**
 * Charge toutes les pages d'une liste DRF paginée avec la session courante.
 *
 * Les listes admin ne doivent pas s'arrêter à la première page (20
 * éléments). Pages de 200 (plafond API) ; garde-fou à 50 pages. Retourne
 * null si l'API répond en erreur.
 */
export async function fetchAllPages<T>(path: string): Promise<T[] | null> {
  const cookieHeader = await getCookieHeader();
  const separator = path.includes("?") ? "&" : "?";
  const items: T[] = [];
  for (let page = 1; page <= 50; page++) {
    const res = await fetch(
      `${API_URL}${path}${separator}page=${page}&page_size=200`,
      {
        headers: { Cookie: cookieHeader, Accept: "application/json" },
        cache: "no-store",
      },
    );
    if (!res.ok) return page === 1 ? null : items;
    const data = (await res.json()) as Paginated<T>;
    items.push(...data.results);
    if (!data.next || items.length >= data.count) break;
  }
  return items;
}

/** Compteurs « À valider » du back-office ; null si l'API ne répond pas. */
export async function fetchPendingCounts(): Promise<PendingCounts | null> {
  try {
    const res = await fetch(`${API_URL}/api/admin/pending-counts/`, {
      headers: { Cookie: await getCookieHeader(), Accept: "application/json" },
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as PendingCounts) : null;
  } catch {
    return null;
  }
}

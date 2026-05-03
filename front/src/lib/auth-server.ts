/**
 * Helpers d'auth côté server components.
 *
 * Lecture des cookies de la requête + forward vers Django pour valider la session.
 */
import { cookies } from "next/headers";
import type { CurrentUser } from "@/types/api";

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

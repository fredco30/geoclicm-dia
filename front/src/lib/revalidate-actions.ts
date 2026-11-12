"use server";

import { updateTag } from "next/cache";

import { getCurrentUser } from "@/lib/auth-server";
import { tagsForWrite } from "@/lib/revalidate-rules";

/**
 * Après une écriture réussie depuis le back-office, rafraîchit
 * immédiatement les pages publiques concernées (au lieu d'attendre la
 * revalidation ISR de 5 à 60 min). Réservé aux sessions connectées.
 */
export async function revalidateAfterWrite(apiPath: string): Promise<void> {
  const tags = tagsForWrite(apiPath);
  if (tags.length === 0) return;
  if (!(await getCurrentUser())) return;
  for (const tag of tags) updateTag(tag);
}

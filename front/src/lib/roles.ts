/**
 * Mapping rôles utilisateur → libellé affiché.
 *
 * En sync avec apps/core/models.py User.Role.
 */
import type { CurrentUser } from "@/types/api";

const ROLE_LABELS: Record<string, string> = {
  reader: "Lecteur",
  advertiser: "Annonceur",
  editor: "Rédacteur",
  admin: "Administrateur",
};

/**
 * Libellé humain du rôle. is_superuser prime (toujours "Administrateur").
 */
export function getRoleLabel(user: Pick<CurrentUser, "role" | "is_superuser">): string {
  if (user.is_superuser) return "Administrateur";
  return ROLE_LABELS[user.role] ?? user.role;
}

/**
 * Accès à l'espace annonceur : les annonceurs, et l'équipe (éditeurs,
 * administrateurs, superutilisateurs) qui gère des fiches pour le compte des
 * commerçants. Un superutilisateur dont le champ « rôle » est resté à
 * « Lecteur » était refusé à tort.
 */
export function canUseAdvertiserSpace(
  user: Pick<CurrentUser, "role" | "is_superuser" | "can_publish">,
): boolean {
  return user.role !== "reader" || user.is_superuser || user.can_publish;
}

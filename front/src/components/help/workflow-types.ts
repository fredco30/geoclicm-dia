/**
 * Types des workflows d'aide intégrés au back-office.
 *
 * Un workflow = un parcours utilisateur cohérent sur plusieurs pages
 * (ex: « Publier un article » couvre /admin → /admin/articles/new → /admin/articles/[slug]/edit).
 *
 * Chaque workflow se compose d'étapes ordonnées. Quand l'utilisateur ouvre
 * le drawer d'aide, on surligne automatiquement l'étape correspondant à la
 * page courante (cf help-routing.ts).
 */
import type { LucideIcon } from "lucide-react";

export type WorkflowStep = {
  id: string;
  title: string;
  /** Lucide icon affichée dans la pastille d'étape (à gauche du titre). */
  icon?: LucideIcon;
  /** Contenu rendu (composants React, callouts, listes, etc.). */
  body: React.ReactNode;
};

export type Workflow = {
  id: string;
  /** Titre court affiché dans le header du drawer. */
  title: string;
  /** Sous-titre descriptif (1 phrase). */
  description: string;
  /** Public visé — affiché en chip au-dessus du titre. */
  audience: "Rédaction" | "Annonceur" | "Administration";
  steps: WorkflowStep[];
};

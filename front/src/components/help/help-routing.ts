/**
 * Mapping pathname → workflow d'aide + étape active.
 *
 * Le premier pattern qui match gagne (l'ordre compte : routes spécifiques
 * avant les fallbacks).
 *
 * Pour ajouter de nouvelles pages couvertes par l'aide : ajouter une entrée
 * ici + le composant de workflow correspondant dans `workflows/`.
 */

type Route = {
  pattern: RegExp;
  workflowId: string;
  /** ID de l'étape à mettre en surbrillance pour cette page. */
  stepId?: string;
};

const ROUTES: Route[] = [
  // ─────── Admin — Publier un article ───────
  { pattern: /^\/admin\/?$/, workflowId: "publish-article", stepId: "dashboard" },
  {
    pattern: /^\/admin\/articles\/new\/?$/,
    workflowId: "publish-article",
    stepId: "create",
  },
  {
    pattern: /^\/admin\/articles\/[^/]+\/edit\/?$/,
    workflowId: "publish-article",
    stepId: "edit",
  },

  // ─────── Advertiser — Onboarding ───────
  {
    pattern: /^\/advertiser\/?$/,
    workflowId: "advertiser-onboarding",
    stepId: "dashboard",
  },
  {
    pattern: /^\/advertiser\/fiches\/?$/,
    workflowId: "advertiser-onboarding",
    stepId: "fiches",
  },
  {
    pattern: /^\/advertiser\/fiches\/new\/?$/,
    workflowId: "advertiser-onboarding",
    stepId: "create-fiche",
  },
  {
    pattern: /^\/advertiser\/fiches\/[^/]+\/edit\/?$/,
    workflowId: "advertiser-onboarding",
    stepId: "edit-fiche",
  },
];

export function getHelpForPath(
  pathname: string,
): { workflowId: string; stepId?: string } | null {
  for (const route of ROUTES) {
    if (route.pattern.test(pathname)) {
      return { workflowId: route.workflowId, stepId: route.stepId };
    }
  }
  return null;
}

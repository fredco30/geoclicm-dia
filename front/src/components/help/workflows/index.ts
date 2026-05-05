/**
 * Registry des workflows d'aide.
 *
 * Ajouter un workflow : créer un fichier `<id>.tsx` dans ce dossier exportant
 * un objet `Workflow`, puis l'ajouter ci-dessous + déclarer ses pages dans
 * help-routing.ts.
 */
import type { Workflow } from "../workflow-types";
import { ADVERTISER_ONBOARDING } from "./advertiser-onboarding";
import { PUBLISH_ARTICLE } from "./publish-article";

export const WORKFLOWS: Record<string, Workflow> = {
  [PUBLISH_ARTICLE.id]: PUBLISH_ARTICLE,
  [ADVERTISER_ONBOARDING.id]: ADVERTISER_ONBOARDING,
};

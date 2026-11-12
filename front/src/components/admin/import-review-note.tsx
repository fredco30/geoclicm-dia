import type { CandidateReview } from "@/types/api";

export function ImportReviewNote({ review }: { review?: CandidateReview }) {
  if (!review) return null;
  const duplicate = review.proposed_status === "duplicate";
  const state = review.validity.state;
  const possible = review.possible_duplicate_ids ?? [];
  if (!duplicate && state !== "expired" && state !== "needs_review" && !possible.length) return null;
  return (
    <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
      <p className="font-semibold">{duplicate ? "Doublon identifié" : state === "expired" ? "Contenu expiré" : state === "needs_review" ? "Actualité à confirmer" : "Rapprochement à vérifier"}</p>
      <p>{duplicate ? review.reason : state === "not_applicable" ? "Les informations ne permettent pas de regrouper automatiquement ces fiches." : review.validity.reason}</p>
      {possible.length ? <p>Même nom : candidats {possible.map((id) => `#${id}`).join(", ")} à comparer.</p> : null}
      {review.validity.evidence ? <blockquote className="mt-1 text-xs italic">Preuve source : « {review.validity.evidence} »</blockquote> : null}
    </div>
  );
}

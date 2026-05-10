"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
  X,
} from "lucide-react";

import { aiAssist, AIAssistError } from "@/lib/ai-assist";
import type {
  AIAdHeadlineResponse,
  AIAdHeadlineVariant,
} from "@/types/admin";

type Goal = "click" | "awareness" | "promo";

type Props = {
  /** Business associé à la campagne (requis pour générer). */
  getBusinessId: () => number | null;
  /** Placement courant — guide le ton et la longueur. */
  getPlacement: () => string;
  /** Callback appelé quand l'utilisateur choisit une variante. */
  onApply: (variant: AIAdHeadlineVariant) => void;
};

const GOAL_LABELS: { value: Goal; label: string; help: string }[] = [
  { value: "click", label: "Faire cliquer", help: "Action directe (Réserver, Découvrir)." },
  { value: "awareness", label: "Se faire connaître", help: "CTA plus doux (En savoir plus)." },
  { value: "promo", label: "Promo / offre", help: "Mettre en avant l'avantage, ton pressant." },
];

/**
 * Bouton « ✨ Suggérer 5 variantes » dans le form de campagne pub.
 * Génère 5 (headline + CTA) à partir de la fiche Business + placement
 * + objectif sélectionné. L'annonceur clique pour appliquer une variante
 * aux champs `headline` et `cta_text` du form parent.
 */
export function AIAdHeadlineButton({
  getBusinessId,
  getPlacement,
  onApply,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [goal, setGoal] = useState<Goal>("click");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AIAdHeadlineResponse | null>(null);

  const close = () => {
    setIsOpen(false);
    setResult(null);
    setError(null);
    setIsLoading(false);
  };

  const handleGenerate = async () => {
    setError(null);
    const businessId = getBusinessId();
    const placement = getPlacement();

    if (!businessId) {
      setError("Choisis d'abord un commerce pour cette campagne.");
      return;
    }
    if (!placement) {
      setError("Choisis d'abord un emplacement pour cet encart.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await aiAssist.ad.headline({
        business_id: businessId,
        placement,
        goal,
      });
      setResult(res);
    } catch (err) {
      if (err instanceof AIAssistError) {
        if (err.code === "budget_exceeded") {
          setError(
            "Quota IA atteint pour aujourd'hui. Réessaie demain.",
          );
        } else if (err.code === "not_configured") {
          setError("L'IA n'est pas configurée. Contacte l'équipe.");
        } else if (err.code === "empty_variants") {
          setError(
            "L'IA n'a rien produit d'utilisable. Enrichis la fiche "
            + "(description, spécialités) et réessaie.",
          );
        } else if (err.code === "bad_format") {
          setError("Réponse IA mal formée. Réessaie.");
        } else {
          setError(err.message || "Erreur lors de la génération.");
        }
      } else {
        setError("Erreur réseau, réessaie.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (v: AIAdHeadlineVariant) => {
    onApply(v);
    close();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-[#1a4d6e] to-[#3a7daa] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:shadow-md"
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Suggérer 5 variantes
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
        >
          <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <button
              type="button"
              onClick={close}
              className="absolute right-3 top-3 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-[#1a4d6e]" aria-hidden />
              <h3 className="text-base font-semibold text-slate-900">
                Variantes d&apos;encart par l&apos;IA
              </h3>
            </div>
            <p className="mb-4 text-xs text-slate-500">
              L&apos;IA va proposer 5 couples (titre + texte du bouton)
              à partir de la fiche commerçant et du placement choisi.
            </p>

            {!result ? (
              <>
                <div className="mb-4">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Objectif principal
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {GOAL_LABELS.map((g) => {
                      const isActive = g.value === goal;
                      return (
                        <button
                          key={g.value}
                          type="button"
                          onClick={() => setGoal(g.value)}
                          title={g.help}
                          className={
                            "rounded-full border px-3 py-1 text-xs transition "
                            + (isActive
                              ? "border-[#1a4d6e] bg-[#1a4d6e] text-white"
                              : "border-slate-300 bg-white text-slate-700 hover:border-slate-400")
                          }
                        >
                          {g.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {error ? (
                  <div className="mb-3 flex items-start gap-2 rounded-md bg-red-50 p-2.5 text-xs text-red-800 ring-1 ring-red-200">
                    <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>{error}</span>
                  </div>
                ) : null}

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#1a4d6e] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#13384f] disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {isLoading ? "Génération..." : "Générer 5 variantes"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  {result.variants.length} variante{result.variants.length > 1 ? "s" : ""} proposée{result.variants.length > 1 ? "s" : ""}
                </p>
                <ul className="space-y-2">
                  {result.variants.map((v, i) => (
                    <li
                      key={i}
                      className="rounded-md border border-slate-200 bg-white p-3"
                    >
                      <p className="text-sm font-medium text-slate-900">
                        {v.headline}
                      </p>
                      <p className="mt-1 inline-block rounded bg-[#1a4d6e]/10 px-2 py-0.5 text-xs font-medium text-[#1a4d6e]">
                        Bouton : {v.cta}
                      </p>
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={() => handleApply(v)}
                          className="inline-flex items-center gap-1 rounded-md bg-[#1a4d6e] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#13384f]"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Utiliser cette variante
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
                  <p className="text-[10px] text-slate-400">
                    Modèle : {result.model} · Coût : {result.cost_eur} €
                  </p>
                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    className="rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200"
                  >
                    Re-générer
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

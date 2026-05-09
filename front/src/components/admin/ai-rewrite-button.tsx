"use client";

import { useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Wand2,
  X,
} from "lucide-react";

import { aiAssist, AIAssistError } from "@/lib/ai-assist";
import type {
  AITextRewriteRequest,
  AITextRewriteResponse,
} from "@/types/admin";

type Tone = "pro" | "friendly" | "concise";
type Context = "business" | "article" | "ad" | "general";

type Props = {
  /** Valeur courante du champ texte. */
  value: string;
  /** Callback pour appliquer un texte choisi. */
  onChange: (newText: string) => void;
  /**
   * Contexte d'usage : permet d'adapter les contraintes du prompt.
   * - "business" : description de fiche
   * - "article" : corps d'article
   * - "ad" : encart pub (court)
   */
  context?: Context;
  /** Tonalité initiale (l'utilisateur peut changer dans le menu). */
  defaultTone?: Tone;
  /** Désactivé si le texte est trop court (< 10 chars). */
  minLength?: number;
};

const TONE_LABELS: { value: Tone; label: string; help: string }[] = [
  { value: "pro", label: "Pro", help: "Chaleureux mais professionnel." },
  { value: "friendly", label: "Convivial", help: "Plus accessible, comme un voisin." },
  { value: "concise", label: "Concis", help: "Factuel, court, sans remplissage." },
];

/**
 * Bouton « ✨ Réécrire » à placer à côté d'un textarea / input.
 *
 * Au clic : ouvre une popover avec sélecteur de ton + bouton « Réécrire ».
 * Affiche la version principale + 1-2 alternatives. L'utilisateur clique
 * pour appliquer une version au champ source.
 */
export function AIRewriteButton({
  value,
  onChange,
  context = "general",
  defaultTone = "pro",
  minLength = 10,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [tone, setTone] = useState<Tone>(defaultTone);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AITextRewriteResponse | null>(null);

  const isDisabled = (value || "").trim().length < minLength;

  const close = () => {
    setIsOpen(false);
    setResult(null);
    setError(null);
    setIsLoading(false);
  };

  const handleRewrite = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const payload: AITextRewriteRequest = {
        text: value,
        tone,
        context,
      };
      const res = await aiAssist.text.rewrite(payload);
      setResult(res);
    } catch (err) {
      if (err instanceof AIAssistError) {
        if (err.code === "budget_exceeded") {
          setError(
            "Quota IA atteint pour aujourd'hui. Réessaie demain ou "
            + "contacte l'équipe.",
          );
        } else if (err.code === "not_configured") {
          setError("L'IA n'est pas configurée. Contacte l'équipe.");
        } else if (err.code === "bad_format") {
          setError("Réponse IA mal formée. Réessaie.");
        } else {
          setError(err.message || "Erreur lors de la réécriture.");
        }
      } else {
        setError("Erreur réseau, réessaie.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = (newText: string) => {
    onChange(newText);
    close();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={isDisabled}
        title={
          isDisabled
            ? `Saisis au moins ${minLength} caractères avant de réécrire.`
            : "Réécrire avec l'IA"
        }
        className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-700 transition hover:bg-[#1a4d6e]/10 hover:text-[#1a4d6e] disabled:opacity-40 disabled:hover:bg-slate-100 disabled:hover:text-slate-700"
      >
        <Wand2 className="h-3 w-3" aria-hidden />
        Réécrire
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
        >
          <div className="relative max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
            <button
              type="button"
              onClick={close}
              className="absolute right-3 top-3 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-3">
              <Wand2 className="h-4 w-4 text-[#1a4d6e]" aria-hidden />
              <h3 className="text-base font-semibold text-slate-900">
                Réécrire avec l&apos;IA
              </h3>
            </div>

            {/* Texte source pour rappel */}
            <div className="mb-4 rounded-md bg-slate-50 p-2.5 text-xs text-slate-600">
              <p className="mb-1 text-[10px] uppercase tracking-wider text-slate-400">
                Texte original
              </p>
              <p className="line-clamp-4">{value}</p>
            </div>

            {!result ? (
              <>
                <div className="mb-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Tonalité
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {TONE_LABELS.map((t) => {
                      const isActive = t.value === tone;
                      return (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setTone(t.value)}
                          title={t.help}
                          className={
                            "rounded-full border px-3 py-1 text-xs transition "
                            + (isActive
                              ? "border-[#1a4d6e] bg-[#1a4d6e] text-white"
                              : "border-slate-300 bg-white text-slate-700 hover:border-slate-400")
                          }
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {error ? (
                  <div className="mb-3 flex items-start gap-2 rounded-md bg-red-50 p-2.5 text-xs text-red-800 ring-1 ring-red-200">
                    <AlertCircle
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      aria-hidden
                    />
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
                    onClick={handleRewrite}
                    disabled={isLoading}
                    className="inline-flex items-center gap-1.5 rounded-md bg-[#1a4d6e] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#13384f] disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wand2 className="h-3.5 w-3.5" />
                    )}
                    {isLoading ? "Réécriture..." : "Réécrire"}
                  </button>
                </div>
              </>
            ) : (
              <ResultView
                result={result}
                onApply={handleApply}
                onRetry={() => setResult(null)}
              />
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function ResultView({
  result,
  onApply,
  onRetry,
}: {
  result: AITextRewriteResponse;
  onApply: (text: string) => void;
  onRetry: () => void;
}) {
  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        Suggestions ({result.alternatives.length + 1})
      </p>
      <ul className="space-y-2">
        <SuggestionItem
          text={result.rewritten}
          isPrimary
          onApply={() => onApply(result.rewritten)}
        />
        {result.alternatives.map((alt, i) => (
          <SuggestionItem
            key={i}
            text={alt}
            onApply={() => onApply(alt)}
          />
        ))}
      </ul>

      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-200 pt-3">
        <p className="text-[10px] text-slate-400">
          Modèle : {result.model} · Coût : {result.cost_eur} €
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-3 py-1 text-xs text-slate-700 hover:bg-slate-200"
        >
          <RefreshCw className="h-3 w-3" />
          Re-générer
        </button>
      </div>
    </div>
  );
}

function SuggestionItem({
  text,
  isPrimary,
  onApply,
}: {
  text: string;
  isPrimary?: boolean;
  onApply: () => void;
}) {
  return (
    <li
      className={
        "rounded-md border p-3 text-sm "
        + (isPrimary
          ? "border-[#1a4d6e]/30 bg-[#1a4d6e]/5"
          : "border-slate-200 bg-white")
      }
    >
      <p className="mb-2 whitespace-pre-line text-slate-800">{text}</p>
      <button
        type="button"
        onClick={onApply}
        className="inline-flex items-center gap-1 rounded-md bg-[#1a4d6e] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#13384f]"
      >
        <CheckCircle2 className="h-3 w-3" />
        Utiliser cette version
      </button>
    </li>
  );
}

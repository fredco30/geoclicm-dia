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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  AIBusinessDescribeResponse,
  AIBusinessFaqItem,
} from "@/types/admin";

type Props = {
  /**
   * Mode pré-création : passer name + categoryId. La modal lit ces
   * valeurs au moment du clic, donc elles peuvent rester contrôlées
   * dans le form parent.
   */
  getCurrentName: () => string;
  getCurrentCategoryId: () => number | null;
  getCurrentCommuneId: () => number | null;
  getExistingShortDescription?: () => string;
  getExistingSpecialties?: () => string[];
  /**
   * Mode complétion : si la fiche existe déjà, passer son ID. La modal
   * fera un appel `business_id=...` au backend qui repartira des
   * valeurs en BDD pour proposer une amélioration.
   */
  businessId?: number | null;
  /**
   * Callback appliquée quand l'utilisateur clique « Utiliser ce
   * brouillon ». Le form parent met à jour ses champs.
   */
  onApply: (data: {
    short_description: string;
    description: string;
    specialties: string[];
  }) => void;
};

/**
 * Bouton flottant ✨ Aide IA pour générer un brouillon de fiche
 * commerçant. Ouvre une modal légère :
 *  1. Champ « Décris ton commerce en quelques mots-clés »
 *  2. Bouton « Générer »
 *  3. Preview des champs proposés (description courte, longue,
 *     spécialités, FAQ)
 *  4. Bouton « Utiliser ce brouillon » qui dispatche au form parent
 *
 * La FAQ reste une suggestion à copier : elle n'est pas persistée dans la
 * fiche et l'interface le signale explicitement.
 */
export function AIBusinessAssistButton({
  getCurrentName,
  getCurrentCategoryId,
  getCurrentCommuneId,
  getExistingShortDescription,
  getExistingSpecialties,
  businessId,
  onApply,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [keywordsText, setKeywordsText] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<AIBusinessDescribeResponse | null>(null);

  const closeAndReset = () => {
    setIsOpen(false);
    setKeywordsText("");
    setIsGenerating(false);
    setError(null);
    setDraft(null);
  };

  const handleGenerate = async () => {
    setError(null);
    setDraft(null);

    const keywords = keywordsText
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
      .slice(0, 10);

    const name = getCurrentName().trim();
    const categoryId = getCurrentCategoryId();
    const communeId = getCurrentCommuneId();

    // Le backend valide aussi, mais on attrape côté front pour message clair
    if (!businessId && (!name || !categoryId)) {
      setError(
        "Renseigne au moins le nom et la catégorie principale avant "
        + "de demander une génération.",
      );
      return;
    }

    const payload = businessId
      ? { business_id: businessId, keywords }
      : {
          name,
          category_id: categoryId,
          commune_id: communeId,
          keywords,
        };

    setIsGenerating(true);
    try {
      const res = await aiAssist.business.describe(payload);
      setDraft(res);
    } catch (err) {
      if (err instanceof AIAssistError) {
        if (err.code === "budget_exceeded") {
          setError(
            "Le quota d'aide IA est atteint pour aujourd'hui. "
            + "Réessaie demain ou contacte l'équipe.",
          );
        } else if (err.code === "not_configured") {
          setError(
            "L'IA n'est pas configurée côté serveur. Contacte l'équipe.",
          );
        } else if (err.code === "bad_format") {
          setError("L'IA a renvoyé une réponse mal formée. Réessaie.");
        } else {
          setError(err.message || "Erreur lors de la génération.");
        }
      } else {
        setError("Erreur réseau, réessaie.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (!draft) return;
    onApply({
      short_description: draft.short_description,
      description: draft.description,
      specialties: draft.specialties,
    });
    closeAndReset();
  };

  // Pré-remplir keywordsText à l'ouverture si on a déjà des spécialités
  const handleOpen = () => {
    const existing = getExistingSpecialties?.() ?? [];
    if (existing.length > 0 && !keywordsText) {
      setKeywordsText(existing.slice(0, 5).join(", "));
    }
    // Fallback : si description longue existe, on suggère ça aussi
    if (
      existing.length === 0
      && !keywordsText
      && getExistingShortDescription?.()
    ) {
      // Pas de pré-remplissage avec la description : on veut des
      // mots-clés courts, pas une phrase entière.
    }
    setIsOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-[#1a4d6e] to-[#3a7daa] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:shadow-md"
      >
        <Sparkles className="h-3.5 w-3.5" aria-hidden />
        Aide IA
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          role="dialog"
          aria-labelledby="ai-assist-title"
        >
          <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
            <button
              type="button"
              onClick={closeAndReset}
              className="absolute right-3 top-3 rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Fermer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-[#1a4d6e]" aria-hidden />
              <h2
                id="ai-assist-title"
                className="text-base font-semibold text-slate-900"
              >
                Aide IA — brouillon de fiche
              </h2>
            </div>
            <p className="mb-4 text-xs text-slate-500">
              {businessId
                ? "L'IA partira des informations existantes pour te proposer une amélioration."
                : "L'IA va générer un brouillon de fiche à partir du nom, de la catégorie et de quelques mots-clés. Tu pourras tout éditer ensuite."}
            </p>

            {!draft ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="ai-keywords">
                    Décris ton commerce en quelques mots-clés
                  </Label>
                  <Input
                    id="ai-keywords"
                    value={keywordsText}
                    onChange={(e) => setKeywordsText(e.target.value)}
                    placeholder="Ex: pizza au feu de bois, pasta fraîches, terrasse vue port"
                    autoFocus
                  />
                  <p className="text-[11px] text-slate-500">
                    Sépare les mots-clés par des virgules. 3 à 10
                    suggestions suffisent. Plus tu en donnes, plus la
                    fiche sera fidèle à ton commerce.
                  </p>
                </div>

                {error ? (
                  <div className="mt-3 flex items-start gap-2 rounded-md bg-red-50 p-3 text-xs text-red-800 ring-1 ring-red-200">
                    <AlertCircle
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      aria-hidden
                    />
                    <span>{error}</span>
                  </div>
                ) : null}

                <div className="mt-5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeAndReset}
                    className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    Annuler
                  </button>
                  <Button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    size="sm"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                    {isGenerating ? "Génération..." : "Générer"}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <DraftPreview draft={draft} />
                <div className="mt-5 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setDraft(null)}
                    className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    ← Re-générer
                  </button>
                  <Button
                    type="button"
                    onClick={handleApply}
                    size="sm"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Utiliser ce brouillon
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}

function DraftPreview({ draft }: { draft: AIBusinessDescribeResponse }) {
  return (
    <div className="space-y-4">
      <Section title="Description courte">
        <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-800">
          {draft.short_description}
        </p>
      </Section>

      <Section title="Description complète">
        <p className="whitespace-pre-line rounded-md bg-slate-50 p-3 text-sm text-slate-800">
          {draft.description}
        </p>
      </Section>

      {draft.specialties.length > 0 ? (
        <Section title="Spécialités">
          <div className="flex flex-wrap gap-1.5">
            {draft.specialties.map((s, i) => (
              <span
                key={`${i}-${s}`}
                className="rounded-full bg-[#1a4d6e]/10 px-2 py-0.5 text-xs text-[#1a4d6e]"
              >
                {s}
              </span>
            ))}
          </div>
        </Section>
      ) : null}

      {draft.faq.length > 0 ? (
        <Section
          title="FAQ suggérée"
          subtitle="Suggestions à copier dans ta fiche ou tes réseaux. Pas appliqué automatiquement pour l'instant."
        >
          <ul className="space-y-2">
            {draft.faq.map((item: AIBusinessFaqItem, i: number) => (
              <li
                key={i}
                className="rounded-md bg-slate-50 p-3 text-xs"
              >
                <p className="font-semibold text-slate-800">{item.q}</p>
                <p className="mt-1 text-slate-600">{item.a}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <p className="text-[10px] text-slate-400">
        Modèle : {draft.model} · Coût : {draft.cost_eur} €
      </p>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {title}
      </h3>
      {subtitle ? (
        <p className="mb-1.5 text-[11px] text-slate-400">{subtitle}</p>
      ) : null}
      {children}
    </div>
  );
}

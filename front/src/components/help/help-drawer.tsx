"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useMounted } from "@/lib/use-mounted";

import { useHelp } from "./help-context";
import { StepBlock } from "./primitives";

/** Drawer slide-in depuis la droite, contient le workflow d'aide contextuel. */
export function HelpDrawer() {
  const { workflow, activeStepId, open, setOpen } = useHelp();
  const mounted = useMounted();
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll vers l'étape active à l'ouverture.
  useEffect(() => {
    if (!open || !activeStepId) return;
    const id = window.setTimeout(() => {
      const el = panelRef.current?.querySelector<HTMLElement>(
        `#help-step-${activeStepId}`,
      );
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => window.clearTimeout(id);
  }, [open, activeStepId]);

  if (!mounted || !workflow) return null;

  const drawer = (
    <>
      <div
        onClick={() => setOpen(false)}
        className={
          "fixed inset-0 z-[100] bg-black/40 transition-opacity " +
          (open ? "opacity-100" : "pointer-events-none opacity-0")
        }
        aria-hidden
      />
      <aside
        id="help-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="help-drawer-title"
        aria-hidden={!open}
        className={
          "fixed inset-y-0 right-0 z-[110] flex w-full max-w-lg flex-col bg-white shadow-2xl transition-transform duration-200 " +
          (open ? "translate-x-0" : "translate-x-full")
        }
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div className="min-w-0">
            <span className="inline-block rounded-full bg-[#1a4d6e]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#1a4d6e]">
              {workflow.audience} · Tutoriel
            </span>
            <h2
              id="help-drawer-title"
              className="mt-2 font-serif text-xl font-semibold text-slate-900"
            >
              {workflow.title}
            </h2>
            <p className="mt-1 text-sm text-slate-600">{workflow.description}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
            aria-label="Fermer l'aide"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </header>

        <div ref={panelRef} className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <p className="text-xs text-slate-500">
            Étape correspondant à votre page actuelle mise en avant en bleu.
          </p>
          {workflow.steps.map((step, idx) => (
            <StepBlock
              key={step.id}
              anchorId={`help-step-${step.id}`}
              number={idx + 1}
              title={step.title}
              icon={step.icon}
              active={activeStepId === step.id}
            >
              {step.body}
            </StepBlock>
          ))}
          <p className="border-t border-slate-100 pt-4 text-xs italic text-slate-400">
            Une question hors-tutoriel ? Écrivez à
            l&apos;équipe&nbsp;: contact@geoclic.fr
          </p>
        </div>
      </aside>
    </>
  );

  return createPortal(drawer, document.body);
}

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import { getHelpForPath } from "./help-routing";
import { WORKFLOWS } from "./workflows";
import type { Workflow } from "./workflow-types";

type HelpState = {
  /** Workflow détecté pour la page courante (null si pas de mapping). */
  workflow: Workflow | null;
  /** ID de l'étape mise en avant (correspond à la page courante). */
  activeStepId: string | null;
  /** Drawer ouvert. */
  open: boolean;
  setOpen: (open: boolean) => void;
};

const HelpContext = createContext<HelpState | null>(null);

export function HelpProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [openState, setOpenState] = useState({ pathname, value: false });
  const open = openState.pathname === pathname && openState.value;
  const setOpenStable = useCallback(
    (value: boolean) => setOpenState({ pathname, value }),
    [pathname],
  );

  const { workflow, activeStepId } = useMemo(() => {
    const route = getHelpForPath(pathname);
    if (!route) return { workflow: null, activeStepId: null };
    const wf = WORKFLOWS[route.workflowId] ?? null;
    return { workflow: wf, activeStepId: route.stepId ?? wf?.steps[0]?.id ?? null };
  }, [pathname]);

  // Bloque le scroll body quand le drawer est ouvert.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Échap pour fermer.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenStable(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, setOpenStable]);

  return (
    <HelpContext.Provider
      value={{ workflow, activeStepId, open, setOpen: setOpenStable }}
    >
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp(): HelpState {
  const ctx = useContext(HelpContext);
  if (!ctx) {
    throw new Error("useHelp must be used inside <HelpProvider>");
  }
  return ctx;
}

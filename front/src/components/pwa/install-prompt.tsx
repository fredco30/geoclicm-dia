"use client";

import {
  useCallback,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { X } from "lucide-react";

import { IosInstallTutorial } from "./ios-install-tutorial";

type Platform =
  | "standalone"
  | "ios-safari"
  | "ios-other"
  | "androidish"
  | "unknown";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: ReadonlyArray<string>;
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    "gm:open-install": CustomEvent;
  }
}

const DISMISS_KEY = "media_install_dismissed_at";
const DISMISS_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

function detectPlatform(): Platform {
  if (typeof window === "undefined") return "unknown";
  if (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari (anciens) expose navigator.standalone à true en mode app.
    (window.navigator as Navigator & { standalone?: boolean }).standalone
  ) {
    return "standalone";
  }
  const ua = window.navigator.userAgent;
  const isIosDevice =
    /iPhone|iPad|iPod/.test(ua) ||
    // iPadOS 13+ se déclare en "Mac" — le toucher confirme l'iPad.
    (ua.includes("Mac") && "ontouchend" in document);
  if (isIosDevice) {
    return /CriOS|FxiOS|EdgiOS/.test(ua) ? "ios-other" : "ios-safari";
  }
  return "androidish";
}

function isDismissedRecently(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < DISMISS_WINDOW_MS;
  } catch {
    return false;
  }
}

function markDismissed() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    /* localStorage indisponible (mode privé strict, quota plein) */
  }
}

const subscribeNoop = () => () => {};

/** True uniquement côté client après hydration. Évite l'usage de setState
 *  dans useEffect (règle react-hooks/set-state-in-effect). */
function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

export function InstallPrompt() {
  const isClient = useIsClient();
  const [forceHidden, setForceHidden] = useState(false);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [copied, setCopied] = useState(false);

  // beforeinstallprompt : Android Chrome, Edge desktop, Samsung Internet…
  // Pas de setState synchrone dans le body — uniquement via event handler.
  useEffect(() => {
    if (!isClient) return;
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setForceHidden(true);
      setDeferredPrompt(null);
      markDismissed();
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, [isClient]);

  const handleAndroidInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setForceHidden(true);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleCopyUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      /* clipboard refusé (HTTP, permission, navigateur ancien) */
    }
  }, []);

  // Pont d'événement : permet au bouton « Installer » du menu mobile
  // d'ouvrir le bon flow selon la plate-forme, sans connaître les détails.
  useEffect(() => {
    if (!isClient) return;
    const onOpen = () => {
      const p = detectPlatform();
      if (p === "ios-safari") {
        setTutorialOpen(true);
      } else if (p === "androidish" && deferredPrompt) {
        void handleAndroidInstall();
      } else if (p === "ios-other") {
        setForceHidden(false); // remontrer le bandeau « ouvrez dans Safari »
        void handleCopyUrl();
      } else if (p === "androidish") {
        // Pas de prompt natif disponible (déjà installé côté chrome,
        // navigateur non éligible). On retombe sur le tutoriel iOS qui,
        // bien que moins pertinent, illustre le concept général.
        setTutorialOpen(true);
      }
    };
    window.addEventListener("gm:open-install", onOpen);
    return () => window.removeEventListener("gm:open-install", onOpen);
  }, [isClient, deferredPrompt, handleAndroidInstall, handleCopyUrl]);

  if (!isClient) return null;

  const platform = detectPlatform();

  // Standalone : déjà installé, pas de bandeau. Le tutoriel reste accessible
  // au cas où (action menu reste vivant), mais ne s'ouvrira pas tout seul.
  if (platform === "standalone" || platform === "unknown") {
    return (
      <IosInstallTutorial
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
      />
    );
  }

  const visible = !forceHidden && !isDismissedRecently();
  const showBanner =
    visible &&
    (platform === "ios-safari" ||
      platform === "ios-other" ||
      (platform === "androidish" && deferredPrompt !== null));

  const dismiss = () => {
    markDismissed();
    setForceHidden(true);
  };

  return (
    <>
      {showBanner ? (
        <Banner
          platform={platform}
          copied={copied}
          onDismiss={dismiss}
          onIosTutorial={() => setTutorialOpen(true)}
          onCopyUrl={handleCopyUrl}
          onAndroidInstall={handleAndroidInstall}
        />
      ) : null}
      <IosInstallTutorial
        open={tutorialOpen}
        onClose={() => setTutorialOpen(false)}
      />
    </>
  );
}

function Banner({
  platform,
  copied,
  onDismiss,
  onIosTutorial,
  onCopyUrl,
  onAndroidInstall,
}: {
  platform: Platform;
  copied: boolean;
  onDismiss: () => void;
  onIosTutorial: () => void;
  onCopyUrl: () => void;
  onAndroidInstall: () => void;
}) {
  let message = "";
  let action: React.ReactNode = null;
  let actionLabel = "";

  if (platform === "ios-safari") {
    message =
      "Installez l'application sur votre iPhone pour la lancer en un toucher.";
    actionLabel =
      "Voir le tutoriel pas-à-pas pour installer l'application sur l'écran d'accueil";
    action = (
      <button
        type="button"
        onClick={onIosTutorial}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#1a4d6e] shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label={actionLabel}
      >
        <span aria-hidden>📲</span> Voir comment installer
      </button>
    );
  } else if (platform === "ios-other") {
    message =
      "Pour installer l'application, ouvrez ce site dans Safari (pas dans ce navigateur).";
    actionLabel = "Copier l'adresse du site pour l'ouvrir dans Safari";
    action = (
      <button
        type="button"
        onClick={onCopyUrl}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#1a4d6e] shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label={actionLabel}
      >
        {copied ? "✔ Adresse copiée" : "Copier l'adresse"}
      </button>
    );
  } else {
    message = "Installez l'application sur votre téléphone pour un accès rapide.";
    actionLabel = "Installer l'application";
    action = (
      <button
        type="button"
        onClick={onAndroidInstall}
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-[#1a4d6e] shadow-sm transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        aria-label={actionLabel}
      >
        <span aria-hidden>📲</span> Installer l&apos;application
      </button>
    );
  }

  return (
    <div
      role="region"
      aria-label="Installation de l'application"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(48px+env(safe-area-inset-bottom,0px))] z-40 px-3 md:bottom-4 md:px-4"
    >
      <div className="pointer-events-auto mx-auto flex max-w-2xl items-center gap-3 rounded-2xl bg-[#1a4d6e] px-4 py-3 text-white shadow-2xl ring-1 ring-black/10">
        <p className="flex-1 text-sm font-medium leading-snug sm:text-base">
          {message}
        </p>
        {action}
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Masquer ce message pendant 7 jours"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

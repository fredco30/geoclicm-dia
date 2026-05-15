"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const ACCENT = "#1a4d6e"; // bleu camargue
const HIGHLIGHT = "#fde68a"; // jaune amber-200 — surlignage doux
const HIGHLIGHT_STRONG = "#facc15"; // amber-400 — surlignage fort
const ARROW = "#dc2626"; // red-600 — flèche d'orientation
const PHONE_BG = "#f8fafc"; // slate-50 — fond écran téléphone

type Slide = {
  id: string;
  title: string;
  description: string;
  illustration: React.ReactNode;
};

const slides: Slide[] = [
  {
    id: "share",
    title: "1. Appuyez sur le bouton « Partager »",
    description:
      "C'est l'icône carrée avec une flèche qui pointe vers le haut, située en bas de votre écran Safari.",
    illustration: <SlideShare />,
  },
  {
    id: "add-home",
    title: "2. Appuyez sur « Sur l'écran d'accueil »",
    description:
      "Faites défiler le menu vers le bas si nécessaire jusqu'à trouver cette option, puis appuyez dessus.",
    illustration: <SlideAddToHome />,
  },
  {
    id: "confirm",
    title: "3. Appuyez sur « Ajouter »",
    description:
      "Le bouton « Ajouter » se trouve en haut à droite de l'écran. Vous pouvez garder le nom proposé.",
    illustration: <SlideConfirm />,
  },
  {
    id: "done",
    title: "✅ C'est terminé !",
    description:
      "L'application est maintenant installée sur votre téléphone. Vous pouvez la lancer directement depuis votre écran d'accueil, comme une vraie application.",
    illustration: <SlideDone />,
  },
];

const subscribeNoop = () => () => {};

/** True uniquement côté client après hydration. */
function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

export function IosInstallTutorial({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const isClient = useIsClient();
  const [index, setIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const titleId = "ios-install-tutorial-title";

  // Reset de l'index réalisé via le handler de fermeture (event handler =
  // setState autorisé), pas dans un useEffect dépendant de `open`.
  const handleClose = useCallback(() => {
    setIndex(0);
    onClose();
  }, [onClose]);

  // Bloquer le scroll du body quand la modale est ouverte (effet de bord
  // sur une API externe — pas de setState dans le body).
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Focus initial à l'ouverture (sur le bouton « Plus tard »).
  useEffect(() => {
    if (!open || !isClient) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const firstFocus = dialog.querySelector<HTMLElement>(
      'button:not([disabled])',
    );
    firstFocus?.focus();
  }, [open, isClient]);

  // Focus trap + Escape — uniquement event handlers, pas de setState
  // synchrone dans le body de l'effet.
  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
        return;
      }
      if (e.key !== "Tab") return;
      const list = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (list.length === 0) return;
      const firstEl = list[0];
      const lastEl = list[list.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    dialog.addEventListener("keydown", onKeyDown);
    return () => dialog.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  if (!isClient || !open) return null;

  const current = slides[index];
  const isFirst = index === 0;
  const isLast = index === slides.length - 1;

  const overlay = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      {/* Backdrop : clique pour fermer */}
      <button
        type="button"
        onClick={handleClose}
        className="absolute inset-0 cursor-default bg-black/60"
        aria-label="Fermer le tutoriel"
        tabIndex={-1}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative mx-3 flex max-h-[95vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header avec bouton fermer */}
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Installation · {index + 1} / {slides.length}
          </span>
          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3 text-sm text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            aria-label="Fermer le tutoriel et revenir plus tard"
          >
            <span className="hidden sm:inline">Plus tard</span>
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        {/* Illustration SVG inline */}
        <div className="flex items-center justify-center bg-slate-50 px-4 py-5">
          <div className="w-[200px]" aria-hidden>
            {current.illustration}
          </div>
        </div>

        {/* Texte */}
        <div className="px-6 py-5">
          <h2
            id={titleId}
            className="font-serif text-2xl font-semibold text-slate-900"
          >
            {current.title}
          </h2>
          <p className="mt-2 text-base leading-relaxed text-slate-700">
            {current.description}
          </p>
        </div>

        {/* Indicateurs (points cliquables) */}
        <div className="flex justify-center gap-2 pb-3" role="tablist" aria-label="Progression du tutoriel">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Étape ${i + 1} sur ${slides.length}`}
              onClick={() => setIndex(i)}
              className={`h-2.5 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4d6e]/30 ${
                i === index
                  ? "w-6 bg-[#1a4d6e]"
                  : "w-2.5 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>

        {/* Footer navigation */}
        <footer className="flex items-center justify-between gap-3 border-t border-slate-200 px-5 py-4">
          <button
            type="button"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={isFirst}
            className="inline-flex h-11 items-center justify-center gap-1 rounded-full px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            aria-label="Étape précédente"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Précédent
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#1a4d6e] px-6 text-base font-semibold text-white shadow-sm transition hover:bg-[#133a55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4d6e]/30"
            >
              Compris !
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIndex((i) => Math.min(slides.length - 1, i + 1))}
              className="inline-flex h-11 items-center justify-center gap-1 rounded-full bg-[#1a4d6e] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#133a55] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1a4d6e]/30"
              aria-label="Étape suivante"
            >
              Suivant
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          )}
        </footer>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}

/* ------------------------------------------------------------------ */
/* Illustrations SVG inline — chaque slide est un schéma simplifié.    */
/* Échelle commune : viewBox 240x440 (≈ proportions iPhone).           */
/* aria-hidden au niveau wrapper, décoratif uniquement.                */
/* ------------------------------------------------------------------ */

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 240 440"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-full drop-shadow-md"
      role="img"
      aria-hidden
    >
      {/* Cadre extérieur (chrome / borders) */}
      <rect
        x="4"
        y="4"
        width="232"
        height="432"
        rx="30"
        ry="30"
        fill="#1f2937"
      />
      {/* Écran intérieur */}
      <rect
        x="14"
        y="18"
        width="212"
        height="404"
        rx="22"
        ry="22"
        fill={PHONE_BG}
      />
      {/* Dynamic island */}
      <rect x="95" y="26" width="50" height="14" rx="7" fill="#0f172a" />
      {/* Contenu personnalisé */}
      {children}
    </svg>
  );
}

function SlideShare() {
  return (
    <PhoneFrame>
      {/* URL bar Safari */}
      <rect x="24" y="50" width="192" height="26" rx="6" fill="#e2e8f0" />
      <circle cx="36" cy="63" r="3.5" fill="#94a3b8" />
      <rect x="48" y="58" width="100" height="10" rx="3" fill="#94a3b8" />

      {/* Contenu de page (lignes schématiques) */}
      <rect x="24" y="92" width="160" height="10" rx="3" fill="#cbd5e1" />
      <rect x="24" y="110" width="190" height="8" rx="3" fill="#e2e8f0" />
      <rect x="24" y="124" width="180" height="8" rx="3" fill="#e2e8f0" />
      <rect x="24" y="138" width="140" height="8" rx="3" fill="#e2e8f0" />

      <rect x="24" y="160" width="190" height="80" rx="6" fill="#e2e8f0" />

      <rect x="24" y="252" width="170" height="8" rx="3" fill="#e2e8f0" />
      <rect x="24" y="266" width="186" height="8" rx="3" fill="#e2e8f0" />
      <rect x="24" y="280" width="120" height="8" rx="3" fill="#e2e8f0" />

      {/* Toolbar Safari en bas */}
      <rect x="14" y="362" width="212" height="44" fill="#f1f5f9" />
      <line
        x1="14"
        y1="362"
        x2="226"
        y2="362"
        stroke="#cbd5e1"
        strokeWidth="0.5"
      />

      {/* Icônes toolbar */}
      <g fill="#475569">
        {/* Précédent */}
        <path d="M 38 384 L 32 378 L 32 390 Z" />
        {/* Suivant */}
        <path d="M 70 384 L 76 378 L 76 390 Z" />
      </g>

      {/* Bouton Partager — SURLIGNÉ */}
      <circle
        cx="120"
        cy="384"
        r="20"
        fill={HIGHLIGHT}
        stroke={ARROW}
        strokeWidth="2.5"
      >
        <animate
          attributeName="r"
          values="18;22;18"
          dur="1.6s"
          repeatCount="indefinite"
        />
      </circle>
      {/* Icône Partager iOS (carré avec flèche up) */}
      <g
        transform="translate(120 384)"
        stroke={ACCENT}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M 0 -8 L 0 5" />
        <path d="M -4 -4 L 0 -8 L 4 -4" />
        <path d="M -6 0 L -6 8 L 6 8 L 6 0" />
      </g>

      {/* Icônes restantes */}
      <g fill="#475569">
        {/* Bookmark */}
        <path d="M 164 376 L 164 392 L 168 388 L 172 392 L 172 376 Z" />
        {/* Onglets */}
        <rect x="194" y="376" width="14" height="14" rx="2" fill="none" stroke="#475569" strokeWidth="1.5" />
      </g>

      {/* Flèche d'orientation depuis le haut */}
      <g stroke={ARROW} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 120 320 L 120 355">
          <animate
            attributeName="opacity"
            values="0.4;1;0.4"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </path>
        <path d="M 112 348 L 120 358 L 128 348">
          <animate
            attributeName="opacity"
            values="0.4;1;0.4"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </path>
      </g>
    </PhoneFrame>
  );
}

function SlideAddToHome() {
  return (
    <PhoneFrame>
      {/* Backdrop sombre simulant un menu modal au-dessus de la page */}
      <rect x="14" y="18" width="212" height="404" rx="22" fill="#0f172a" opacity="0.35" />

      {/* Share sheet (menu glissé du bas) */}
      <rect x="20" y="140" width="200" height="282" rx="14" fill="white" />
      <rect x="108" y="148" width="24" height="3" rx="1.5" fill="#cbd5e1" />

      {/* Ligne d'icônes app (apps de partage) */}
      <g>
        <circle cx="44" cy="180" r="14" fill="#3b82f6" />
        <circle cx="84" cy="180" r="14" fill="#22c55e" />
        <circle cx="124" cy="180" r="14" fill="#a855f7" />
        <circle cx="164" cy="180" r="14" fill="#f97316" />
        <circle cx="204" cy="180" r="14" fill="#ec4899" />
      </g>

      {/* Première ligne d'actions (Copier le lien) */}
      <rect x="28" y="216" width="184" height="36" rx="8" fill="#f1f5f9" />
      <rect x="180" y="228" width="20" height="12" rx="3" fill="#cbd5e1" />
      <rect x="40" y="228" width="100" height="10" rx="3" fill="#475569" />

      {/* « Sur l'écran d'accueil » — SURLIGNÉ */}
      <rect
        x="28"
        y="260"
        width="184"
        height="44"
        rx="8"
        fill={HIGHLIGHT_STRONG}
        opacity="0.6"
      >
        <animate
          attributeName="opacity"
          values="0.4;0.8;0.4"
          dur="1.6s"
          repeatCount="indefinite"
        />
      </rect>
      {/* Icône carré-plus (Add to Home Screen) */}
      <g transform="translate(178 282)" stroke={ACCENT} strokeWidth="2" fill="none" strokeLinecap="round">
        <rect x="-9" y="-9" width="18" height="18" rx="3" />
        <path d="M 0 -4 L 0 4" />
        <path d="M -4 0 L 4 0" />
      </g>
      <text
        x="40"
        y="286"
        fontFamily="system-ui, sans-serif"
        fontSize="11"
        fontWeight="600"
        fill={ACCENT}
      >
        Sur l&apos;écran d&apos;accueil
      </text>

      {/* Actions suivantes */}
      <rect x="28" y="312" width="184" height="34" rx="8" fill="#f1f5f9" />
      <rect x="40" y="324" width="80" height="10" rx="3" fill="#94a3b8" />
      <rect x="28" y="354" width="184" height="34" rx="8" fill="#f1f5f9" />
      <rect x="40" y="366" width="120" height="10" rx="3" fill="#94a3b8" />

      {/* Flèche pointant vers l'option surlignée */}
      <g stroke={ARROW} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 120 230 L 120 258">
          <animate
            attributeName="opacity"
            values="0.4;1;0.4"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </path>
        <path d="M 112 250 L 120 260 L 128 250">
          <animate
            attributeName="opacity"
            values="0.4;1;0.4"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </path>
      </g>
    </PhoneFrame>
  );
}

function SlideConfirm() {
  return (
    <PhoneFrame>
      {/* Backdrop sombre */}
      <rect x="14" y="18" width="212" height="404" rx="22" fill="#0f172a" opacity="0.45" />

      {/* Popup confirmation */}
      <rect x="22" y="120" width="196" height="180" rx="14" fill="white" />

      {/* Header popup avec Annuler / Titre / Ajouter */}
      <rect x="22" y="120" width="196" height="38" rx="14" fill="white" />
      <text
        x="34"
        y="143"
        fontFamily="system-ui, sans-serif"
        fontSize="11"
        fill="#475569"
      >
        Annuler
      </text>
      <text
        x="120"
        y="143"
        fontFamily="system-ui, sans-serif"
        fontSize="11"
        fontWeight="600"
        fill="#0f172a"
        textAnchor="middle"
      >
        Sur l&apos;écran d&apos;accueil
      </text>

      {/* Bouton Ajouter SURLIGNÉ */}
      <rect
        x="170"
        y="128"
        width="42"
        height="22"
        rx="11"
        fill={HIGHLIGHT_STRONG}
        stroke={ARROW}
        strokeWidth="2"
      >
        <animate
          attributeName="opacity"
          values="0.7;1;0.7"
          dur="1.6s"
          repeatCount="indefinite"
        />
      </rect>
      <text
        x="191"
        y="143"
        fontFamily="system-ui, sans-serif"
        fontSize="11"
        fontWeight="700"
        fill={ACCENT}
        textAnchor="middle"
      >
        Ajouter
      </text>

      {/* Séparateur */}
      <line x1="22" y1="158" x2="218" y2="158" stroke="#e2e8f0" strokeWidth="1" />

      {/* Bloc app : icône + nom + URL */}
      <rect x="38" y="178" width="44" height="44" rx="10" fill={ACCENT} />
      <text
        x="60"
        y="208"
        fontFamily="serif"
        fontSize="20"
        fontWeight="700"
        fill="white"
        textAnchor="middle"
      >
        gM
      </text>
      <rect x="92" y="180" width="110" height="14" rx="3" fill="#f1f5f9" />
      <text
        x="100"
        y="191"
        fontFamily="system-ui, sans-serif"
        fontSize="10"
        fontWeight="600"
        fill="#0f172a"
      >
        geoclicMédia
      </text>
      <rect x="92" y="200" width="110" height="10" rx="3" fill="#f1f5f9" />
      <text
        x="100"
        y="209"
        fontFamily="system-ui, sans-serif"
        fontSize="8"
        fill="#94a3b8"
      >
        media.geoclic.fr
      </text>

      {/* Description */}
      <rect x="38" y="240" width="164" height="6" rx="2" fill="#e2e8f0" />
      <rect x="38" y="252" width="140" height="6" rx="2" fill="#e2e8f0" />

      {/* Flèche pointant sur le bouton Ajouter */}
      <g stroke={ARROW} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M 190 90 L 190 118">
          <animate
            attributeName="opacity"
            values="0.4;1;0.4"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </path>
        <path d="M 182 110 L 190 120 L 198 110">
          <animate
            attributeName="opacity"
            values="0.4;1;0.4"
            dur="1.4s"
            repeatCount="indefinite"
          />
        </path>
      </g>
    </PhoneFrame>
  );
}

function SlideDone() {
  return (
    <PhoneFrame>
      {/* Wallpaper dégradé */}
      <defs>
        <linearGradient id="wp" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fde68a" />
          <stop offset="100%" stopColor="#60a5fa" />
        </linearGradient>
      </defs>
      <rect x="14" y="18" width="212" height="404" rx="22" fill="url(#wp)" />

      {/* Heure */}
      <text
        x="120"
        y="80"
        fontFamily="system-ui, sans-serif"
        fontSize="42"
        fontWeight="300"
        fill="white"
        textAnchor="middle"
      >
        9:41
      </text>
      <text
        x="120"
        y="100"
        fontFamily="system-ui, sans-serif"
        fontSize="10"
        fontWeight="600"
        fill="white"
        textAnchor="middle"
        opacity="0.9"
      >
        mardi 12 mai
      </text>

      {/* Grille d'icônes — 4 colonnes x 3 lignes */}
      {[
        { c: 0, r: 0, fill: "#fff" },
        { c: 1, r: 0, fill: "#f97316" },
        { c: 2, r: 0, fill: "#22c55e" },
        { c: 3, r: 0, fill: "#a855f7" },
        { c: 0, r: 1, fill: "#ef4444" },
        // notre app — colonne 1, ligne 1
        { c: 2, r: 1, fill: "#fbbf24" },
        { c: 3, r: 1, fill: "#06b6d4" },
        { c: 0, r: 2, fill: "#94a3b8" },
        { c: 1, r: 2, fill: "#10b981" },
        { c: 2, r: 2, fill: "#f43f5e" },
        { c: 3, r: 2, fill: "#8b5cf6" },
      ].map((icon, i) => {
        const x = 30 + icon.c * 50;
        const y = 150 + icon.r * 64;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width="38"
              height="38"
              rx="9"
              fill={icon.fill}
              opacity="0.92"
            />
            <rect x={x} y={y + 44} width="38" height="4" rx="1.5" fill="white" opacity="0.85" />
          </g>
        );
      })}

      {/* Notre app — mise en évidence avec pulse */}
      <g>
        <circle cx="99" cy="233" r="28" fill="white" opacity="0.35">
          <animate
            attributeName="r"
            values="24;32;24"
            dur="1.8s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.15;0.4;0.15"
            dur="1.8s"
            repeatCount="indefinite"
          />
        </circle>
        <rect x="80" y="214" width="38" height="38" rx="9" fill={ACCENT} />
        <text
          x="99"
          y="240"
          fontFamily="serif"
          fontSize="18"
          fontWeight="700"
          fill="white"
          textAnchor="middle"
        >
          gM
        </text>
        <rect x="80" y="258" width="38" height="4" rx="1.5" fill="white" opacity="0.95" />
      </g>

      {/* Dock en bas */}
      <rect x="24" y="358" width="192" height="50" rx="18" fill="white" opacity="0.3" />
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={36 + i * 46}
          y="368"
          width="34"
          height="34"
          rx="8"
          fill={["#06b6d4", "#22c55e", "#a855f7", "#ef4444"][i]}
        />
      ))}
    </PhoneFrame>
  );
}

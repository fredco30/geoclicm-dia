"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Sparkles, Trash2, X } from "lucide-react";

import { getAssistantI18n } from "@/lib/assistant-i18n";
import { useMounted } from "@/lib/use-mounted";

import { AssistantInput } from "./assistant-input";
import { AssistantMessage } from "./assistant-message";
import { AssistantSuggestions } from "./assistant-suggestions";
import { LanguageSwitcher } from "./language-switcher";
import { useAssistant } from "./assistant-context";

/**
 * Drawer chat de l'assistant IA, style « city ».
 *
 * Mobile : slide depuis le bas, plein écran moins le header.
 * Desktop : slide depuis la droite, max-w-lg, hauteur full.
 *
 * Rendu via createPortal dans <body> pour échapper aux stacking contexts
 * (header avec backdrop-blur, etc.). Inspiré du HelpDrawer existant.
 */
export function AssistantDrawer() {
  const {
    isOpen, close, messages, language, setLanguage,
    isPending, error, ask, reset,
  } = useAssistant();
  const mounted = useMounted();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll en bas à chaque nouveau message
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isPending]);

  if (!mounted) return null;

  const t = getAssistantI18n(language);

  const errorMessage =
    error === "rate_limit" ? t.errorRateLimit
    : error === "generic" ? t.errorGeneric
    : null;

  const drawer = (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        onClick={close}
        className={
          "fixed inset-0 z-[100] cursor-default bg-black/40 transition-opacity " +
          (isOpen ? "opacity-100" : "pointer-events-none opacity-0")
        }
      />

      {/* Panel — bottom mobile, right desktop */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="assistant-drawer-title"
        aria-hidden={!isOpen}
        className={
          "fixed inset-x-0 bottom-0 z-[110] flex max-h-[92vh] flex-col rounded-t-3xl bg-white shadow-2xl transition-transform duration-200 " +
          "md:inset-y-0 md:right-0 md:left-auto md:max-h-none md:w-full md:max-w-lg md:rounded-none md:rounded-l-2xl " +
          (isOpen
            ? "translate-y-0 md:translate-y-0 md:translate-x-0"
            : "translate-y-full md:translate-y-0 md:translate-x-full")
        }
      >
        {/* Header */}
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 bg-gradient-to-br from-[#1a4d6e] to-[#13384f] px-5 py-4 text-white md:rounded-tl-2xl">
          <div className="min-w-0 flex-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider">
              <Sparkles className="h-3 w-3" aria-hidden />
              IA · Mistral
            </span>
            <h2
              id="assistant-drawer-title"
              className="mt-1.5 font-serif text-lg font-semibold"
            >
              {t.title}
            </h2>
            <p className="text-xs text-white/80">{t.subtitle}</p>
          </div>
          <div className="flex items-center gap-1">
            <div className="rounded bg-white/10">
              <LanguageSwitcher
                value={language}
                onChange={setLanguage}
                ariaLabel={t.languageLabel}
              />
            </div>
            <button
              type="button"
              onClick={close}
              aria-label={t.closeLabel}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/90 hover:bg-white/10"
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </header>

        {/* Body : scrollable */}
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <>
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-800">
                <p>👋 {t.welcome}</p>
              </div>
              <AssistantSuggestions
                label={t.suggestionsLabel}
                suggestions={t.suggestions}
                onPick={(s) => ask(s)}
              />
            </>
          ) : null}

          {messages.map((msg, i) => (
            <AssistantMessage
              key={`${msg.timestamp}-${i}`}
              message={msg}
              sourcesLabel={t.sourcesLabel}
            />
          ))}

          {isPending ? (
            <div className="flex items-center gap-2 px-2 text-xs italic text-slate-500">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[#1a4d6e]" />
              {t.thinkingLabel}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700 ring-1 ring-red-200">
              {errorMessage}
            </div>
          ) : null}
        </div>

        {/* Footer : input + reset */}
        <footer className="border-t border-slate-200 bg-white px-4 py-3">
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={reset}
              className="mb-2 inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-700"
            >
              <Trash2 className="h-3 w-3" aria-hidden />
              {t.resetLabel}
            </button>
          ) : null}
          <AssistantInput
            onSubmit={ask}
            placeholder={t.inputPlaceholder}
            sendLabel={t.sendLabel}
            hint={t.hint}
            isPending={isPending}
          />
        </footer>
      </aside>
    </>
  );

  return createPortal(drawer, document.body);
}

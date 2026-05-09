"use client";

import { useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";

import { SUPPORTED_LANGUAGES } from "@/lib/assistant-i18n";
import type { AssistantLanguage } from "@/types/api";

type Props = {
  value: AssistantLanguage;
  onChange: (lang: AssistantLanguage) => void;
  ariaLabel?: string;
};

export function LanguageSwitcher({ value, onChange, ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const current = SUPPORTED_LANGUAGES.find((l) => l.code === value)
    ?? SUPPORTED_LANGUAGES[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={ariaLabel}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-100"
      >
        <Globe className="h-4 w-4" aria-hidden />
        <span aria-hidden>{current.flag}</span>
        <span className="hidden sm:inline">{current.code.toUpperCase()}</span>
        <ChevronDown className="h-3 w-3 opacity-60" aria-hidden />
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[120] cursor-default"
          />
          <ul
            role="listbox"
            className="absolute right-0 top-full z-[121] mt-1 w-44 overflow-hidden rounded-md bg-white py-1 shadow-lg ring-1 ring-slate-200"
          >
            {SUPPORTED_LANGUAGES.map((lang) => {
              const active = lang.code === value;
              return (
                <li key={lang.code}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(lang.code);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
                  >
                    <span aria-hidden className="text-base">
                      {lang.flag}
                    </span>
                    <span className="flex-1">{lang.label}</span>
                    {active ? (
                      <Check className="h-3.5 w-3.5 text-[#1a4d6e]" aria-hidden />
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </div>
  );
}

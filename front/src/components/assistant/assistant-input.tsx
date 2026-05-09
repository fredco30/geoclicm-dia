"use client";

import { useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";

type Props = {
  onSubmit: (question: string) => void;
  placeholder: string;
  sendLabel: string;
  hint: string;
  disabled?: boolean;
  isPending?: boolean;
};

export function AssistantInput({
  onSubmit,
  placeholder,
  sendLabel,
  hint,
  disabled = false,
  isPending = false,
}: Props) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || disabled || isPending) return;
    onSubmit(value);
    setValue("");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 focus-within:border-[#1a4d6e]">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            // Cmd/Ctrl + Entrée OU juste Entrée (sans Shift) envoie
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          maxLength={500}
          className="max-h-32 min-h-[2.25rem] flex-1 resize-none border-0 bg-transparent px-2 py-1.5 text-sm leading-relaxed outline-none placeholder:text-slate-400 disabled:opacity-50"
          style={{ fieldSizing: "content" } as React.CSSProperties}
        />
        <button
          type="submit"
          disabled={disabled || isPending || !value.trim()}
          aria-label={sendLabel}
          title={sendLabel}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#1a4d6e] text-white transition hover:bg-[#13384f] disabled:opacity-40"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ArrowUp className="h-4 w-4" aria-hidden />
          )}
        </button>
      </div>
      <p className="px-1 text-[11px] text-slate-400">{hint}</p>
    </form>
  );
}

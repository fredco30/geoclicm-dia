"use client";

import { Upload, X } from "lucide-react";
import { useRef } from "react";

type Props = {
  currentUrl: string | null;
  onFileSelected: (file: File | null) => void;
};

export function ImageUploader({ currentUrl, onFileSelected }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      {currentUrl ? (
        <div className="relative aspect-video overflow-hidden rounded-md bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt="Cover preview"
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={() => {
              onFileSelected(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            aria-label="Retirer l'image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : null}

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-600 transition hover:border-[#1a4d6e] hover:text-[#1a4d6e]">
        <Upload className="h-5 w-5" />
        <span>{currentUrl ? "Remplacer l'image" : "Cliquer pour uploader"}</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelected(file);
          }}
        />
      </label>
      <p className="text-xs text-slate-500">
        JPEG, PNG ou WebP. L&apos;image sera redimensionnée automatiquement
        en 3 tailles (400, 800, 1600 px).
      </p>
    </div>
  );
}

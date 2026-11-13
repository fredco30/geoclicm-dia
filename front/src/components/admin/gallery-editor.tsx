"use client";

/* eslint-disable @next/next/no-img-element */
import { useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";

import { apiFetch } from "@/lib/api";
import { formatApiError } from "@/lib/api-errors";
import { Input } from "@/components/ui/input";
import type { ImageVariants, Media } from "@/types/api";

export type GalleryPhoto = {
  id: number;
  thumbnail: string | null;
  caption: string;
  credit: string;
};

type Props = {
  photos: GalleryPhoto[];
  onChange: (photos: GalleryPhoto[]) => void;
};

const MAX_BYTES = 10 * 1024 * 1024;

export function toGalleryPhotos(media: Media[]): GalleryPhoto[] {
  return media.map((item) => ({
    id: item.id,
    thumbnail: item.file?.thumbnail ?? item.file?.medium ?? null,
    caption: item.caption || item.alt_text,
    credit: item.credit,
  }));
}

function csrf(): string | null {
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function ensureCsrf(): Promise<string | null> {
  if (!csrf()) await apiFetch("/api/auth/csrf/");
  return csrf();
}

/**
 * Galerie photo d'un article : envoi des photos dans la bibliothèque
 * (/api/media/), légende et crédit par photo. La liste des photos retenues
 * est enregistrée avec l'article ; retirer une photo ne la supprime pas de
 * la bibliothèque.
 */
export function GalleryEditor({ photos, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const token = await ensureCsrf();
    const added: GalleryPhoto[] = [];
    const errors: string[] = [];
    const list = Array.from(files);
    setUploading(list.length);
    for (const file of list) {
      if (file.size > MAX_BYTES) {
        errors.push(`${file.name} : fichier trop lourd (10 Mo maximum).`);
        setUploading((n) => n - 1);
        continue;
      }
      const body = new FormData();
      body.append("file", file);
      body.append("title", file.name.replace(/\.[^.]+$/, ""));
      try {
        const res = await apiFetch("/api/media/", {
          method: "POST",
          body,
          headers: token ? { "X-CSRFToken": token } : {},
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          errors.push(`${file.name} : ${formatApiError(data, "envoi impossible.")}`);
        } else {
          const variants = data.file_url as ImageVariants | null;
          added.push({
            id: data.id,
            thumbnail: variants?.thumbnail ?? variants?.medium ?? variants?.original ?? null,
            caption: "",
            credit: "",
          });
        }
      } catch {
        errors.push(`${file.name} : erreur réseau.`);
      }
      setUploading((n) => n - 1);
    }
    if (added.length) onChange([...photos, ...added]);
    if (errors.length) setError(errors.join("\n"));
    if (inputRef.current) inputRef.current.value = "";
  };

  const edit = (id: number, field: "caption" | "credit", value: string) =>
    onChange(photos.map((photo) => (photo.id === id ? { ...photo, [field]: value } : photo)));

  /** Légende et crédit enregistrés dans la bibliothèque à la sortie du champ. */
  const persist = async (photo: GalleryPhoto) => {
    const token = await ensureCsrf();
    const body = new FormData();
    body.append("caption", photo.caption);
    body.append("alt_text", photo.caption);
    body.append("credit", photo.credit);
    const res = await apiFetch(`/api/media/${photo.id}/`, {
      method: "PATCH",
      body,
      headers: token ? { "X-CSRFToken": token } : {},
    }).catch(() => null);
    if (!res?.ok) setError("La légende ou le crédit n'a pas pu être enregistré.");
  };

  return (
    <div className="space-y-3">
      {photos.length ? (
        <ul className="space-y-3">
          {photos.map((photo) => (
            <li key={photo.id} className="flex gap-3 rounded-md border border-slate-200 p-2">
              {photo.thumbnail ? (
                <img src={photo.thumbnail} alt="" className="h-16 w-16 shrink-0 rounded object-cover" />
              ) : (
                <div className="h-16 w-16 shrink-0 rounded bg-slate-100" />
              )}
              <div className="min-w-0 flex-1 space-y-1.5">
                <Input
                  aria-label="Légende de la photo"
                  placeholder="Légende (décrit la photo)"
                  value={photo.caption}
                  maxLength={300}
                  onChange={(e) => edit(photo.id, "caption", e.target.value)}
                  onBlur={() => void persist(photo)}
                  className="h-8 text-xs"
                />
                <Input
                  aria-label="Crédit photo"
                  placeholder="Crédit (auteur, source)"
                  value={photo.credit}
                  maxLength={200}
                  onChange={(e) => edit(photo.id, "credit", e.target.value)}
                  onBlur={() => void persist(photo)}
                  className="h-8 text-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => onChange(photos.filter((item) => item.id !== photo.id))}
                aria-label="Retirer cette photo de la galerie"
                title="Retirer de la galerie"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded text-slate-500 hover:bg-slate-100 hover:text-red-600"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500">
          Aucune photo. Les photos ajoutées s&apos;affichent en fin d&apos;article.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => void upload(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading > 0}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:border-camargue hover:text-camargue disabled:opacity-60"
      >
        {uploading > 0 ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Envoi de {uploading} photo
            {uploading > 1 ? "s" : ""}…
          </>
        ) : (
          <>
            <ImagePlus className="h-4 w-4" aria-hidden /> Ajouter des photos
          </>
        )}
      </button>
      {error ? (
        <p role="alert" className="whitespace-pre-line rounded bg-red-50 p-2 text-xs text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}

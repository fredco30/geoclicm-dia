"use client";

import { Share2, MessageSquare, Link as LinkIcon, Check } from "lucide-react";
import { useState } from "react";

type Props = {
  url: string;
  title: string;
};

export function ShareButtons({ url, title }: Props) {
  const [copied, setCopied] = useState(false);

  const fbHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
  const waHref = `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard refused */
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Partager">
      <a
        href={fbHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-10 items-center gap-2 rounded-full bg-[#1877F2] px-4 text-sm font-medium text-white transition hover:opacity-90"
        aria-label="Partager sur Facebook"
      >
        <Share2 className="h-4 w-4" /> Facebook
      </a>
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-10 items-center gap-2 rounded-full bg-[#25D366] px-4 text-sm font-medium text-white transition hover:opacity-90"
        aria-label="Partager sur WhatsApp"
      >
        <MessageSquare className="h-4 w-4" /> WhatsApp
      </a>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        aria-label="Copier le lien"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-green-600" /> Copié !
          </>
        ) : (
          <>
            <LinkIcon className="h-4 w-4" /> Copier le lien
          </>
        )}
      </button>
    </div>
  );
}

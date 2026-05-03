"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Eye, Edit3 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (v: string) => void;
};

/**
 * Éditeur markdown simple : tabs Édition / Aperçu.
 *
 * Pas de WYSIWYG en sprint 1 (Tiptap, MDXEditor à voir plus tard).
 * Suffit pour la rédaction structurée de la rédactrice.
 */
export function MarkdownEditor({ value, onChange }: Props) {
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex items-center gap-1 border-b border-slate-200 p-2">
        <TabBtn
          active={tab === "edit"}
          onClick={() => setTab("edit")}
          icon={<Edit3 className="h-4 w-4" />}
          label="Édition"
        />
        <TabBtn
          active={tab === "preview"}
          onClick={() => setTab("preview")}
          icon={<Eye className="h-4 w-4" />}
          label="Aperçu"
        />
        <a
          href="https://www.markdownguide.org/cheat-sheet/"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto text-xs text-slate-500 hover:text-[#1a4d6e]"
        >
          Aide markdown ↗
        </a>
      </div>

      {tab === "edit" ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={24}
          placeholder={`# Titre niveau 1
## Sous-titre

Paragraphe normal. Pour mettre en **gras** ou *italique*.

> Citation (préfixée par >)

- Liste à puces
- ...

[Lien](https://example.com)
![Description image](url-image.jpg)

\`\`\`
Bloc de code
\`\`\``}
          className="rounded-none border-none font-mono text-sm focus:ring-0"
        />
      ) : (
        <div className="min-h-96 p-4">
          {value.trim() ? (
            <div className="prose-like text-slate-800">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="mt-6 mb-3 text-2xl font-bold">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="mt-5 mb-2 text-xl font-semibold">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="mt-4 mb-2 text-lg font-semibold">{children}</h3>
                  ),
                  p: ({ children }) => <p className="my-3 leading-relaxed">{children}</p>,
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className="text-[#1a4d6e] underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {children}
                    </a>
                  ),
                  ul: ({ children }) => (
                    <ul className="my-3 list-disc pl-6 space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="my-3 list-decimal pl-6 space-y-1">{children}</ol>
                  ),
                  blockquote: ({ children }) => (
                    <blockquote className="my-4 border-l-4 border-[#1a4d6e] bg-slate-50 px-4 py-2 italic">
                      {children}
                    </blockquote>
                  ),
                  img: ({ src, alt }) => (
                    <img
                      src={src as string}
                      alt={alt || ""}
                      className="my-4 max-h-80 rounded-lg"
                    />
                  ),
                  code: ({ children }) => (
                    <code className="rounded bg-slate-100 px-1 py-0.5 text-sm">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="my-3 overflow-auto rounded-lg bg-slate-900 p-3 text-sm text-slate-100">
                      {children}
                    </pre>
                  ),
                }}
              >
                {value}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm italic text-slate-400">
              L&apos;aperçu apparaîtra ici quand tu auras écrit du contenu.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition",
        active
          ? "bg-slate-100 text-slate-900"
          : "text-slate-600 hover:bg-slate-50",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

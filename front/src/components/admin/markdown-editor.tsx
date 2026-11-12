"use client";

import { useLayoutEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bold,
  Edit3,
  Eye,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  type LucideIcon,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (v: string) => void;
};

type Tool = { label: string; icon: LucideIcon } & (
  | { kind: "wrap"; before: string; after: string; placeholder: string }
  | { kind: "prefix"; prefix: (index: number) => string }
);

const TOOLS: Tool[] = [
  { label: "Titre", icon: Heading2, kind: "prefix", prefix: () => "## " },
  { label: "Sous-titre", icon: Heading3, kind: "prefix", prefix: () => "### " },
  { label: "Gras", icon: Bold, kind: "wrap", before: "**", after: "**", placeholder: "texte en gras" },
  { label: "Italique", icon: Italic, kind: "wrap", before: "*", after: "*", placeholder: "texte en italique" },
  { label: "Liste à puces", icon: List, kind: "prefix", prefix: () => "- " },
  { label: "Liste numérotée", icon: ListOrdered, kind: "prefix", prefix: (i) => `${i + 1}. ` },
  { label: "Citation", icon: Quote, kind: "prefix", prefix: () => "> " },
  { label: "Lien", icon: LinkIcon, kind: "wrap", before: "[", after: "](https://)", placeholder: "texte du lien" },
  { label: "Image (adresse web)", icon: ImageIcon, kind: "wrap", before: "![", after: "](https://)", placeholder: "description de l'image" },
];

/**
 * Éditeur markdown : onglets Édition / Aperçu + barre de mise en forme.
 *
 * La barre insère la syntaxe Markdown à la place de la rédactrice (titre,
 * gras, liste, lien…) : elle n'a pas à la connaître. Pas de WYSIWYG
 * (Tiptap, MDXEditor) tant que ce besoin n'est pas confirmé.
 */
export function MarkdownEditor({ value, onChange }: Props) {
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const ref = useRef<HTMLTextAreaElement>(null);

  // Sélection à rétablir une fois le nouveau texte rendu (un champ contrôlé
  // renvoie sinon le curseur en fin de texte).
  const pendingSelection = useRef<[number, number] | null>(null);
  useLayoutEffect(() => {
    const selection = pendingSelection.current;
    if (!selection || !ref.current) return;
    pendingSelection.current = null;
    ref.current.focus();
    ref.current.setSelectionRange(selection[0], selection[1]);
  }, [value]);

  const apply = (start: number, end: number, text: string, selectFrom: number, selectTo: number) => {
    pendingSelection.current = [selectFrom, selectTo];
    onChange(value.slice(0, start) + text + value.slice(end));
  };

  /** Entoure la sélection (gras, italique, lien) ; texte d'exemple si rien n'est sélectionné. */
  const wrap = (before: string, after: string, placeholder: string) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: start, selectionEnd: end } = el;
    const inner = value.slice(start, end) || placeholder;
    apply(start, end, before + inner + after, start + before.length, start + before.length + inner.length);
  };

  /** Préfixe chaque ligne sélectionnée (titre, liste, citation). */
  const prefixLines = (prefix: (index: number) => string) => {
    const el = ref.current;
    if (!el) return;
    const start = value.lastIndexOf("\n", el.selectionStart - 1) + 1;
    const nextBreak = value.indexOf("\n", el.selectionEnd);
    const end = nextBreak === -1 ? value.length : nextBreak;
    const text = value
      .slice(start, end)
      .split("\n")
      // Un seul préfixe à la fois : on retire celui qui existe déjà.
      .map((line, index) => prefix(index) + line.replace(/^(#{1,6} |> |- |\d+\. )/, ""))
      .join("\n");
    apply(start, end, text, start + text.length, start + text.length);
  };

  const run = (tool: Tool) => {
    if (tool.kind === "wrap") wrap(tool.before, tool.after, tool.placeholder);
    else prefixLines(tool.prefix);
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 p-2">
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
        {tab === "edit" ? (
          <div className="ml-auto flex flex-wrap items-center gap-0.5" role="toolbar" aria-label="Mise en forme">
            {TOOLS.map((tool) => (
              <button
                key={tool.label}
                type="button"
                onClick={() => run(tool)}
                title={tool.label}
                aria-label={tool.label}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <tool.icon className="h-4 w-4" aria-hidden />
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {tab === "edit" ? (
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={24}
          placeholder={`Écrivez votre article ici.

Sélectionnez un passage puis utilisez les boutons ci-dessus pour le mettre en gras, en faire un titre, une liste ou un lien.

L'onglet « Aperçu » montre le rendu final.`}
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
                      className="text-camargue underline"
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
                    <blockquote className="my-4 border-l-4 border-camargue bg-slate-50 px-4 py-2 italic">
                      {children}
                    </blockquote>
                  ),
                  img: ({ src, alt }) => (
                    // Images Markdown distantes : dimensions inconnues à l'édition.
                    // eslint-disable-next-line @next/next/no-img-element
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

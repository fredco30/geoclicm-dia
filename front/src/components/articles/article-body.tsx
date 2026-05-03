import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  content: string;
};

/**
 * Rendu du corps d'article en markdown (GFM : tables, strikethrough, etc.).
 *
 * Server component (markdown rendu au build/à l'ISR).
 * Styling inline via components (Tailwind 4 sans @tailwindcss/typography pour rester lean).
 */
export function ArticleBody({ content }: Props) {
  return (
    <div className="article-body mx-auto max-w-2xl text-slate-800 leading-relaxed text-lg">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-10 mb-4 text-3xl font-bold tracking-tight text-slate-900">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-8 mb-3 text-2xl font-semibold tracking-tight text-slate-900">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-6 mb-2 text-xl font-semibold text-slate-900">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="my-4">{children}</p>,
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-[#1a4d6e] underline underline-offset-2 hover:no-underline"
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="my-4 list-disc pl-6 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="my-4 list-decimal pl-6 space-y-1">{children}</ol>,
          blockquote: ({ children }) => (
            <blockquote className="my-6 border-l-4 border-[#1a4d6e] bg-slate-50 px-5 py-2 italic text-slate-700">
              {children}
            </blockquote>
          ),
          img: ({ src, alt }) => (
            <img
              src={src as string}
              alt={alt || ""}
              className="my-6 w-full rounded-xl shadow-sm"
              loading="lazy"
            />
          ),
          code: ({ children }) => (
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-mono text-slate-800">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-6 overflow-x-auto rounded-xl bg-slate-900 p-4 text-sm text-slate-100">
              {children}
            </pre>
          ),
          hr: () => <hr className="my-10 border-slate-200" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

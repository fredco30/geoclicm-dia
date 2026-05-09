import type { AssistantConvoMessage } from "./assistant-context";
import { AssistantCitations } from "./assistant-citations";

type Props = {
  message: AssistantConvoMessage;
  sourcesLabel: string;
};

/**
 * Bulle de message dans la conversation. La version assistant rend le
 * contenu Markdown léger (gras, italique, listes à puces) en transformant
 * minimalement la chaîne — on ne charge pas une lib Markdown complète pour
 * éviter d'alourdir le bundle alors que Mistral génère du Markdown simple.
 */
export function AssistantMessage({ message, sourcesLabel }: Props) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-[#1a4d6e] px-4 py-2 text-sm text-white">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3 text-sm text-slate-900">
        <FormattedAnswer text={message.content} />
        <AssistantCitations
          citations={message.citations}
          label={sourcesLabel}
        />
      </div>
    </div>
  );
}

/**
 * Rendu Markdown léger volontairement minimaliste.
 *
 * Reconnu :
 *  - **gras**, *italique*
 *  - Listes à puces (- item ou * item)
 *  - Sauts de ligne doubles → paragraphes
 *  - Liens [texte](url) → <a target=_blank>
 *
 * Tout le reste passe en texte brut. Pour des réponses Mistral plus
 * complexes (tableaux par exemple), on devra installer react-markdown
 * en V2.
 */
function FormattedAnswer({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);

  return (
    <div className="space-y-2 leading-relaxed">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        const isList = lines.every(
          (l) => /^\s*[-*]\s+/.test(l) || l.trim() === "",
        );

        if (isList) {
          const items = lines
            .filter((l) => l.trim() !== "")
            .map((l) => l.replace(/^\s*[-*]\s+/, ""));
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {items.map((it, j) => (
                <li key={j}>{renderInline(it)}</li>
              ))}
            </ul>
          );
        }

        return <p key={i}>{renderInline(block)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  // Liens markdown [texte](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(renderEmphasis(text.slice(lastIndex, match.index), parts.length));
    }
    parts.push(
      <a
        key={`link-${parts.length}`}
        href={match[2]}
        target={match[2].startsWith("/") ? undefined : "_blank"}
        rel={match[2].startsWith("/") ? undefined : "noopener noreferrer"}
        className="text-[#1a4d6e] underline hover:no-underline"
      >
        {match[1]}
      </a>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(renderEmphasis(text.slice(lastIndex), parts.length));
  }
  return <>{parts}</>;
}

function renderEmphasis(text: string, keyBase: number): React.ReactNode {
  // **gras** puis *italique* — passes successives
  const segments: React.ReactNode[] = [];
  let working = text;
  let counter = 0;

  // **gras**
  const boldRegex = /\*\*([^*]+)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const tmp: React.ReactNode[] = [];
  while ((match = boldRegex.exec(working)) !== null) {
    if (match.index > lastIndex) {
      tmp.push(working.slice(lastIndex, match.index));
    }
    tmp.push(
      <strong key={`bold-${keyBase}-${counter++}`}>
        {renderItalic(match[1], `${keyBase}-${counter}`)}
      </strong>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < working.length) {
    tmp.push(working.slice(lastIndex));
  }
  return <>{tmp.map((node, i) => (typeof node === "string" ? renderItalic(node, `${keyBase}-${i}-it`) : node))}</>;
}

function renderItalic(text: string, keyBase: string): React.ReactNode {
  const italicRegex = /\*([^*]+)\*/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let counter = 0;
  while ((match = italicRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(<em key={`italic-${keyBase}-${counter++}`}>{match[1]}</em>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return <>{parts}</>;
}

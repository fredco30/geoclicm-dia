import { Sparkles } from "lucide-react";

type Props = {
  label: string;
  suggestions: string[];
  onPick: (s: string) => void;
};

export function AssistantSuggestions({ label, suggestions, onPick }: Props) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
        <Sparkles className="h-3 w-3" aria-hidden />
        {label}
      </p>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            className="rounded-full border border-camargue/20 bg-white px-3 py-1.5 text-xs text-slate-700 transition hover:border-camargue/50 hover:bg-camargue/5 hover:text-camargue"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

"use client";

import { Plus, Trash2 } from "lucide-react";

export type ClosureValue = { from: string; to: string; reason: string };

type Props = {
  value: ClosureValue[];
  onChange: (v: ClosureValue[]) => void;
};

export function SeasonalClosuresEditor({ value, onChange }: Props) {
  const addClosure = () => {
    onChange([...value, { from: "", to: "", reason: "" }]);
  };

  const removeClosure = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateClosure = (
    index: number,
    field: keyof ClosureValue,
    val: string,
  ) => {
    onChange(value.map((c, i) => (i === index ? { ...c, [field]: val } : c)));
  };

  return (
    <div className="space-y-2">
      {value.length === 0 ? (
        <p className="text-xs italic text-slate-500">
          Aucune fermeture saisonnière planifiée.
        </p>
      ) : (
        value.map((closure, i) => (
          <div
            key={i}
            className="flex flex-wrap items-end gap-2 rounded-md border border-slate-200 bg-slate-50 p-2"
          >
            <div className="min-w-[140px] flex-1">
              <label className="block text-xs text-slate-500">Du</label>
              <input
                type="date"
                value={closure.from}
                onChange={(e) => updateClosure(i, "from", e.target.value)}
                className="block w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
            </div>
            <div className="min-w-[140px] flex-1">
              <label className="block text-xs text-slate-500">Au</label>
              <input
                type="date"
                value={closure.to}
                onChange={(e) => updateClosure(i, "to", e.target.value)}
                className="block w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
            </div>
            <div className="min-w-[200px] flex-[2]">
              <label className="block text-xs text-slate-500">Raison</label>
              <input
                type="text"
                value={closure.reason}
                onChange={(e) => updateClosure(i, "reason", e.target.value)}
                placeholder="Ex: Fermeture annuelle, Vacances"
                className="block w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => removeClosure(i)}
              className="rounded p-2 text-slate-500 hover:bg-slate-200 hover:text-red-600"
              aria-label="Supprimer cette fermeture"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))
      )}
      <button
        type="button"
        onClick={addClosure}
        className="inline-flex items-center gap-1 text-xs text-[#1a4d6e] hover:underline"
      >
        <Plus className="h-3 w-3" /> Ajouter une fermeture
      </button>
    </div>
  );
}

"use client";

import { Plus, Trash2 } from "lucide-react";

type TimeSlot = { open: string; close: string };
export type OpeningHoursValue = Record<string, TimeSlot[]>;

const DAYS = [
  { key: "monday", label: "Lundi" },
  { key: "tuesday", label: "Mardi" },
  { key: "wednesday", label: "Mercredi" },
  { key: "thursday", label: "Jeudi" },
  { key: "friday", label: "Vendredi" },
  { key: "saturday", label: "Samedi" },
  { key: "sunday", label: "Dimanche" },
] as const;

type Props = {
  value: OpeningHoursValue;
  onChange: (v: OpeningHoursValue) => void;
};

export function OpeningHoursEditor({ value, onChange }: Props) {
  const addSlot = (dayKey: string) => {
    const slots = value[dayKey] ?? [];
    onChange({
      ...value,
      [dayKey]: [...slots, { open: "09:00", close: "12:00" }],
    });
  };

  const removeSlot = (dayKey: string, index: number) => {
    const slots = value[dayKey] ?? [];
    onChange({
      ...value,
      [dayKey]: slots.filter((_, i) => i !== index),
    });
  };

  const updateSlot = (
    dayKey: string,
    index: number,
    field: "open" | "close",
    val: string,
  ) => {
    const slots = value[dayKey] ?? [];
    onChange({
      ...value,
      [dayKey]: slots.map((s, i) => (i === index ? { ...s, [field]: val } : s)),
    });
  };

  const copyMondayToWeekdays = () => {
    const monday = value.monday ?? [];
    onChange({
      ...value,
      tuesday: [...monday],
      wednesday: [...monday],
      thursday: [...monday],
      friday: [...monday],
    });
  };

  return (
    <div className="space-y-2">
      {DAYS.map(({ key, label }) => {
        const slots = value[key] ?? [];
        return (
          <div
            key={key}
            className="rounded-md border border-slate-200 bg-slate-50 p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">{label}</span>
              <button
                type="button"
                onClick={() => addSlot(key)}
                className="inline-flex items-center gap-1 text-xs text-[#1a4d6e] hover:underline"
              >
                <Plus className="h-3 w-3" /> Ajouter un créneau
              </button>
            </div>
            {slots.length === 0 ? (
              <div className="text-xs italic text-slate-500">Fermé</div>
            ) : (
              <div className="space-y-1.5">
                {slots.map((slot, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="time"
                      value={slot.open}
                      onChange={(e) => updateSlot(key, i, "open", e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                    <span className="text-slate-400">→</span>
                    <input
                      type="time"
                      value={slot.close}
                      onChange={(e) => updateSlot(key, i, "close", e.target.value)}
                      className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removeSlot(key, i)}
                      className="rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-red-600"
                      aria-label="Supprimer ce créneau"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      {(value.monday?.length ?? 0) > 0 ? (
        <button
          type="button"
          onClick={copyMondayToWeekdays}
          className="text-xs text-[#1a4d6e] hover:underline"
        >
          Copier les horaires du lundi sur Mar–Ven
        </button>
      ) : null}
    </div>
  );
}

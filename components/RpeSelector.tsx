import React, { useId } from 'react';

export const RPE_OPTIONS = [
  ['😌', 'Sem esforço'], ['🙂', 'Muito leve'], ['😊', 'Leve'],
  ['😀', 'Moderado'], ['😅', 'Um pouco intenso'], ['😤', 'Intenso'],
  ['🥵', 'Intenso a muito intenso'], ['😣', 'Muito intenso'],
  ['😫', 'Muito, muito intenso'], ['😵', 'Quase máximo'], ['🫠', 'Máximo'],
] as const;

export function RpeSelector({ value, onChange, disabled = false }: {
  value: string; onChange: (value: string) => void; disabled?: boolean;
}) {
  const id = useId();
  const selected = value !== '' && Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= 10 ? Number(value) : null;
  return <fieldset disabled={disabled} className="min-w-0 space-y-3" aria-describedby={id}>
    <legend className="text-xs font-black uppercase italic tracking-wide text-slate-300">PSE (0–10)</legend>
    <p className="text-xs text-slate-400">Como foi o esforço? Toque no número que representa seu treino.</p>
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
      {RPE_OPTIONS.map(([emoji, label], index) => <button key={index} type="button" aria-label={`PSE ${index}: ${label}`} aria-pressed={selected === index}
        onClick={() => onChange(String(index))}
        className={`min-w-0 rounded-xl border p-2 flex flex-col items-center gap-1 transition-transform motion-safe:active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-500 disabled:opacity-50 ${selected === index ? 'bg-emerald-700 text-white border-emerald-500 shadow-md' : 'bg-slate-900 text-slate-200 border-slate-600 hover:border-emerald-500'}`}>
        <span aria-hidden="true" className="text-2xl">{emoji}</span><span className="text-sm font-black">{index}</span>
      </button>)}
    </div>
    <p id={id} role="status" aria-live="polite" className="text-sm font-bold text-emerald-400 min-h-8">
      {selected === null ? 'Selecione sua percepção de esforço.' : <span key={selected} className="rpe-feedback inline-block"><span aria-hidden="true">{RPE_OPTIONS[selected][0]} </span>{selected} — {RPE_OPTIONS[selected][1]}</span>}
    </p>
  </fieldset>;
}

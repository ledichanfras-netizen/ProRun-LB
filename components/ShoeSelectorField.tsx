import React, { useMemo } from 'react';
import { AlertTriangle, Check, Footprints, Sparkles } from 'lucide-react';
import type { Athlete, AthletePlan, RunningShoe } from '../types';
import {
  calculateShoeStats,
  formatShoeLabel,
  SHOE_CATEGORY_META,
  SHOE_COLOR_META,
  suggestShoeForWorkout,
} from '../utils/shoeUtils';
import { formatDistance } from '../utils/formatDistance';

interface ShoeSelectorFieldProps {
  shoes?: RunningShoe[];
  plan?: AthletePlan | null;
  archivedPlans?: Athlete['archivedPlans'];
  value: string;
  onChange: (shoeId: string) => void;
  workoutType?: string;
  isLight?: boolean;
  disabled?: boolean;
  onOpenGarage?: () => void;
}

export const ShoeSelectorField: React.FC<ShoeSelectorFieldProps> = ({
  shoes = [],
  plan,
  archivedPlans,
  value,
  onChange,
  workoutType,
  isLight = false,
  disabled = false,
  onOpenGarage,
}) => {
  const activeShoes = useMemo(() => shoes.filter((s) => !s.retired), [shoes]);
  const retiredSelected = useMemo(
    () => (value ? shoes.find((s) => s.id === value && s.retired) : undefined),
    [shoes, value]
  );

  const suggestion = useMemo(
    () => suggestShoeForWorkout(shoes, workoutType),
    [shoes, workoutType]
  );

  const displayShoes = useMemo(() => {
    const list = [...activeShoes];
    if (retiredSelected) list.push(retiredSelected);
    return list;
  }, [activeShoes, retiredSelected]);

  if (displayShoes.length === 0) {
    return (
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
          isLight
            ? 'bg-slate-50 border-slate-200 text-slate-700'
            : 'bg-white/5 border-white/10 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shrink-0">
            <Footprints className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase italic tracking-tight">
              Nenhum tênis cadastrado
            </p>
            <p className="text-[10px] opacity-75 leading-tight">
              Cadastre seus pares na aba &ldquo;Meus Tênis&rdquo; para somar a km automaticamente.
            </p>
          </div>
        </div>
        {onOpenGarage && (
          <button
            type="button"
            disabled={disabled}
            onClick={onOpenGarage}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase italic tracking-wider shrink-0 transition-all cursor-pointer"
          >
            Cadastrar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label
          className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
            isLight ? 'text-slate-800' : 'text-slate-200'
          }`}
        >
          <Footprints className="w-3.5 h-3.5 text-emerald-500" />
          <span>Tênis do Treino (Intercalar Pares)</span>
        </label>
        {suggestion.shoe && suggestion.reason === 'category' && (
          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-500 border border-emerald-500/25">
            <Sparkles className="w-2.5 h-2.5" />
            <span>
              Sugerido ({SHOE_CATEGORY_META[suggestion.shoe.category]?.shortLabel}): {formatShoeLabel(suggestion.shoe)}
            </span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {displayShoes.map((shoe) => {
          const stats = calculateShoeStats(shoe, plan, archivedPlans);
          const isSelected = value === shoe.id;
          const isSuggested = suggestion.shoe?.id === shoe.id && suggestion.reason === 'category';
          const colorMeta = SHOE_COLOR_META[shoe.color || 'emerald'] || SHOE_COLOR_META.emerald;
          const catMeta = SHOE_CATEGORY_META[shoe.category] || SHOE_CATEGORY_META.daily;

          return (
            <button
              key={shoe.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(isSelected ? '' : shoe.id)}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1.5 cursor-pointer disabled:opacity-50 ${
                isSelected
                  ? isLight
                    ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/25 shadow-sm'
                    : 'bg-emerald-500/15 border-emerald-500 ring-2 ring-emerald-500/25 shadow-md'
                  : isLight
                  ? 'bg-white border-slate-200 hover:border-emerald-300'
                  : 'bg-white/5 border-white/10 hover:border-white/25'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorMeta.dotClass}`} />
                  <span
                    className={`text-xs font-black uppercase italic truncate ${
                      isLight ? 'text-slate-900' : 'text-white'
                    }`}
                  >
                    {formatShoeLabel(shoe)}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {stats.status !== 'ok' && (
                    <span
                      title={
                        stats.status === 'replace'
                          ? 'Meta de km atingida'
                          : 'Desgaste acima de 80%'
                      }
                      className={`p-1 rounded-md ${
                        stats.status === 'replace'
                          ? 'bg-rose-500/20 text-rose-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3" />
                    </span>
                  )}
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 text-[10px]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase border ${catMeta.badgeClass}`}
                  >
                    {catMeta.shortLabel}
                  </span>
                  {shoe.isDefault && (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[8.5px] font-black uppercase ${
                        isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/10 text-slate-300'
                      }`}
                    >
                      Padrão
                    </span>
                  )}
                  {isSuggested && !shoe.isDefault && (
                    <span className="text-[8.5px] font-black uppercase text-emerald-500">
                      • Ideal p/ hoje
                    </span>
                  )}
                  {shoe.retired && (
                    <span className="text-[8.5px] font-black uppercase text-slate-400">
                      • Aposentado
                    </span>
                  )}
                </div>
                <span
                  className={`font-mono font-bold shrink-0 ${
                    stats.status === 'replace'
                      ? 'text-rose-400'
                      : stats.status === 'warning'
                      ? 'text-amber-400'
                      : isLight
                      ? 'text-slate-600'
                      : 'text-slate-300'
                  }`}
                >
                  {formatDistance(stats.totalKm)} / {shoe.maxKm} km
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {value === '' && (
        <p className={`text-[10px] font-medium pl-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          Nenhum tênis selecionado para este treino (clique em um par acima para contabilizar a km).
        </p>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { Trophy } from 'lucide-react';
import type { IntervalWorkoutMetricsReport } from '../utils/intervalMetrics';
import {
  formatIntervalDuration,
  formatSpeedKmh,
  formatStepDistance,
} from '../utils/intervalMetrics';

export type IntervalViewMode = 'with_recovery' | 'without_recovery';

interface IntervalSplitsTableProps {
  report: IntervalWorkoutMetricsReport;
  isLight?: boolean;
  mode?: IntervalViewMode;
  onModeChange?: (mode: IntervalViewMode) => void;
  defaultMode?: IntervalViewMode;
  workoutAvgHeartRate?: number;
  workoutMaxHeartRate?: number;
  showHeartRateCards?: boolean;
  showModeToggle?: boolean;
  showSummaryStrip?: boolean;
}

export const IntervalSplitsTable: React.FC<IntervalSplitsTableProps> = ({
  report,
  isLight = false,
  mode: controlledMode,
  onModeChange,
  defaultMode = 'with_recovery',
  workoutAvgHeartRate,
  workoutMaxHeartRate,
  showHeartRateCards = true,
  showModeToggle = true,
  showSummaryStrip = true,
}) => {
  const [internalMode, setInternalMode] = useState<IntervalViewMode>(
    report.hasRecoveries ? defaultMode : 'without_recovery'
  );

  const rawMode = controlledMode ?? internalMode;
  const activeMode: IntervalViewMode = report.hasRecoveries ? rawMode : 'without_recovery';

  const setMode = (next: IntervalViewMode) => {
    if (onModeChange) onModeChange(next);
    if (controlledMode === undefined) setInternalMode(next);
  };

  const activeSummary =
    activeMode === 'with_recovery' && report.hasRecoveries
      ? report.withRecovery
      : report.withoutRecovery;

  const hasPerStepHr =
    activeSummary.avgHeartRate !== null && activeSummary.avgHeartRate !== undefined;

  const displayAvgHr = activeSummary.avgHeartRate;
  const displayMaxHr = activeSummary.maxHeartRate;

  return (
    <div className="space-y-3">
      {/* Segmented Toggle: Com recuperação | Sem recuperação */}
      {showModeToggle && report.hasRecoveries && (
        <div
          role="tablist"
          aria-label="Modo de exibição dos tiros"
          className={`grid grid-cols-2 gap-1 p-1 rounded-xl border ${
            isLight
              ? 'bg-slate-100 border-slate-200'
              : 'bg-slate-950/70 border-white/10'
          }`}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'with_recovery'}
            onClick={() => setMode('with_recovery')}
            className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-colors cursor-pointer whitespace-nowrap ${
              activeMode === 'with_recovery'
                ? 'bg-emerald-600 text-white shadow-xs'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Com recuperação
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeMode === 'without_recovery'}
            onClick={() => setMode('without_recovery')}
            className={`min-h-[38px] px-2.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wide transition-colors cursor-pointer whitespace-nowrap ${
              activeMode === 'without_recovery'
                ? 'bg-emerald-600 text-white shadow-xs'
                : isLight
                ? 'text-slate-600 hover:text-slate-900'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sem recuperação
          </button>
        </div>
      )}

      {/* Summary Strip for Active Mode */}
      {showSummaryStrip && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div
            className={`p-2.5 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
            }`}
          >
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
              {activeMode === 'with_recovery' && report.hasRecoveries
                ? 'Tempo (tiros + rec.)'
                : 'Tempo dos tiros'}
            </span>
            <span
              className={`text-sm font-black font-mono tabular-nums ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              {formatIntervalDuration(activeSummary.totalDurationSeconds)}
            </span>
          </div>

          <div
            className={`p-2.5 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
            }`}
          >
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
              Pace médio
            </span>
            <span
              className={`text-sm font-black font-mono tabular-nums ${
                isLight ? 'text-emerald-700' : 'text-emerald-400'
              }`}
            >
              {activeSummary.avgPace} <span className="text-[10px] font-bold">/km</span>
            </span>
          </div>

          <div
            className={`p-2.5 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
            }`}
          >
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
              Vel. média
            </span>
            <span
              className={`text-sm font-black font-mono tabular-nums ${
                isLight ? 'text-sky-700' : 'text-sky-400'
              }`}
            >
              {formatSpeedKmh(activeSummary.avgSpeedKmh)}
            </span>
          </div>

          <div
            className={`p-2.5 rounded-xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'
            }`}
          >
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
              Distância
            </span>
            <span
              className={`text-sm font-black font-mono tabular-nums ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              {formatStepDistance(activeSummary.totalDistanceMeters)}
            </span>
          </div>
        </div>
      )}

      {/* Heart Rate Cards (matches Screenshot 2 FC média / FC máxima style) */}
      {showHeartRateCards && (
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-2">
            {[
              [
                activeMode === 'with_recovery' && report.hasRecoveries
                  ? 'FC média (tiros + rec.)'
                  : 'FC média (só tiros)',
                displayAvgHr,
              ],
              [
                activeMode === 'with_recovery' && report.hasRecoveries
                  ? 'FC máxima (tiros + rec.)'
                  : 'FC máxima (só tiros)',
                displayMaxHr,
              ],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className={`rounded-xl border p-2.5 min-w-0 ${
                  isLight
                    ? 'bg-rose-50 border-rose-100'
                    : 'bg-rose-950/20 border-rose-500/20'
                }`}
              >
                <span className="block text-[9px] font-black uppercase text-slate-400">
                  {label}
                </span>
                <strong
                  className={`text-base font-mono tabular-nums ${
                    isLight ? 'text-rose-700' : 'text-rose-300'
                  }`}
                >
                  {typeof value === 'number' && Number.isFinite(value) && value > 0
                    ? `${Math.round(value)} bpm`
                    : 'Não informada'}
                </strong>
              </div>
            ))}
          </div>
          {!hasPerStepHr &&
            typeof workoutAvgHeartRate === 'number' &&
            workoutAvgHeartRate > 0 && (
              <p className="text-[10px] text-slate-400">
                FC geral da sessão: {Math.round(workoutAvgHeartRate)} bpm
                {typeof workoutMaxHeartRate === 'number' && workoutMaxHeartRate > 0
                  ? ` (máx ${Math.round(workoutMaxHeartRate)} bpm)`
                  : ''}
                . Para detalhar FC tiro a tiro, grave com cinta/relógio ou importe o .GPX com FC.
              </p>
            )}
        </div>
      )}

      {/* Split Table matching Screenshot 2 */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr
              className={`text-[9px] font-black uppercase tracking-wider border-b ${
                isLight
                  ? 'text-slate-500 border-slate-200'
                  : 'text-slate-400 border-white/10'
              }`}
            >
              <th className="pb-2 pl-2 pr-3 whitespace-nowrap">Tiro / Etapa</th>
              <th className="pb-2 px-2 whitespace-nowrap">Tempo Parcial</th>
              <th className="pb-2 px-2 whitespace-nowrap">Ritmo (Pace)</th>
              <th className="pb-2 px-2 whitespace-nowrap">Vel. Média</th>
              <th className="pb-2 px-2 whitespace-nowrap">FC (bpm)</th>
              <th className="pb-2 px-2 whitespace-nowrap">Cadência Média</th>
              <th className="pb-2 px-2 whitespace-nowrap">Calorias</th>
              <th className="pb-2 text-right pl-2 pr-2 whitespace-nowrap">Tempo Total</th>
            </tr>
          </thead>
          <tbody
            className={`divide-y font-mono text-xs tabular-nums ${
              isLight ? 'divide-slate-100' : 'divide-white/5'
            }`}
          >
            {report.pairs.map((pair) => {
              const isBest =
                report.withoutRecovery.fastestRepNumber === pair.interval.index &&
                report.intervals.length > 1;

              return (
                <React.Fragment key={`${pair.interval.stepId}-${pair.repNumber}`}>
                  <tr
                    className={`transition-colors ${
                      isBest
                        ? isLight
                          ? 'bg-emerald-50/80 font-bold'
                          : 'bg-emerald-500/10 font-bold'
                        : isLight
                        ? 'hover:bg-slate-50'
                        : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <td className="py-2.5 pl-2 pr-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                            isBest
                              ? 'bg-emerald-500 text-white'
                              : isLight
                              ? 'bg-slate-200 text-slate-700'
                              : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          {pair.repNumber}
                        </span>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`font-bold ${
                                isLight ? 'text-slate-800' : 'text-white'
                              }`}
                            >
                              Tiro {pair.repNumber}
                            </span>
                            {isBest && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] bg-emerald-500 text-white font-black uppercase tracking-tighter">
                                <Trophy className="w-2.5 h-2.5" /> Melhor Tiro
                              </span>
                            )}
                          </div>
                          <span className="block text-[10px] text-slate-400">
                            {formatStepDistance(pair.interval.distanceMeters)}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td
                      className={`py-2.5 px-2 whitespace-nowrap ${
                        isLight ? 'text-slate-700' : 'text-slate-300'
                      }`}
                    >
                      {formatIntervalDuration(pair.interval.durationSeconds)}
                    </td>

                    <td
                      className={`py-2.5 px-2 font-bold whitespace-nowrap ${
                        isBest
                          ? isLight
                            ? 'text-emerald-700'
                            : 'text-emerald-400'
                          : isLight
                          ? 'text-amber-700'
                          : 'text-amber-400'
                      }`}
                    >
                      {pair.interval.pace} /km
                    </td>

                    <td
                      className={`py-2.5 px-2 font-bold whitespace-nowrap ${
                        isLight ? 'text-sky-700' : 'text-sky-400'
                      }`}
                    >
                      {formatSpeedKmh(pair.interval.avgSpeedKmh)}
                    </td>

                    <td
                      className={`py-2.5 px-2 font-bold whitespace-nowrap ${
                        isLight ? 'text-rose-700' : 'text-rose-400'
                      }`}
                    >
                      {pair.interval.avgHeartRate ? (
                        <div>
                          <span>{pair.interval.avgHeartRate} bpm</span>
                          {pair.interval.maxHeartRate &&
                            pair.interval.maxHeartRate > pair.interval.avgHeartRate && (
                              <span className="block text-[9px] font-normal opacity-75">
                                máx {pair.interval.maxHeartRate}
                              </span>
                            )}
                        </div>
                      ) : (
                        '--'
                      )}
                    </td>

                    <td
                      className={`py-2.5 px-2 whitespace-nowrap ${
                        isLight ? 'text-purple-700' : 'text-purple-400'
                      }`}
                    >
                      {pair.interval.avgCadence ? `${pair.interval.avgCadence} SPM` : '--'}
                    </td>

                    <td
                      className={`py-2.5 px-2 whitespace-nowrap ${
                        isLight ? 'text-orange-700' : 'text-orange-400'
                      }`}
                    >
                      {pair.interval.calories ? `${pair.interval.calories} kcal` : '--'}
                    </td>

                    <td className="py-2.5 pl-2 pr-2 text-right text-slate-400 whitespace-nowrap">
                      {pair.interval.splitTimeSeconds > 0
                        ? formatIntervalDuration(pair.interval.splitTimeSeconds)
                        : '--'}
                    </td>
                  </tr>

                  {activeMode === 'with_recovery' && pair.recovery && (
                    <tr
                      className={`transition-colors ${
                        isLight
                          ? 'bg-slate-50/70 text-slate-600'
                          : 'bg-white/[0.02] text-slate-300'
                      }`}
                    >
                      <td className="py-2 pl-4 pr-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold shrink-0 ${
                              isLight
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-emerald-500/15 text-emerald-300'
                            }`}
                          >
                            R{pair.repNumber}
                          </span>
                          <div>
                            <span className="text-[11px] font-semibold block">
                              Recuperação {pair.repNumber}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              {pair.recovery.distanceMeters > 0
                                ? formatStepDistance(pair.recovery.distanceMeters)
                                : 'Pausa por tempo'}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-2 px-2 whitespace-nowrap">
                        {formatIntervalDuration(pair.recovery.durationSeconds)}
                      </td>

                      <td className="py-2 px-2 whitespace-nowrap">
                        {pair.recovery.pace === '--:--'
                          ? '--:--'
                          : `${pair.recovery.pace} /km`}
                      </td>

                      <td className="py-2 px-2 whitespace-nowrap">
                        {formatSpeedKmh(pair.recovery.avgSpeedKmh)}
                      </td>

                      <td
                        className={`py-2 px-2 whitespace-nowrap ${
                          isLight ? 'text-rose-700' : 'text-rose-300'
                        }`}
                      >
                        {pair.recovery.avgHeartRate ? (
                          <div>
                            <span>{pair.recovery.avgHeartRate} bpm</span>
                            {pair.recovery.maxHeartRate &&
                              pair.recovery.maxHeartRate > pair.recovery.avgHeartRate && (
                                <span className="block text-[9px] font-normal opacity-75">
                                  máx {pair.recovery.maxHeartRate}
                                </span>
                              )}
                          </div>
                        ) : (
                          '--'
                        )}
                      </td>

                      <td
                        className={`py-2 px-2 whitespace-nowrap ${
                          isLight ? 'text-purple-700' : 'text-purple-300'
                        }`}
                      >
                        {pair.recovery.avgCadence ? `${pair.recovery.avgCadence} SPM` : '--'}
                      </td>

                      <td
                        className={`py-2 px-2 whitespace-nowrap ${
                          isLight ? 'text-orange-700' : 'text-orange-300'
                        }`}
                      >
                        {pair.recovery.calories ? `${pair.recovery.calories} kcal` : '--'}
                      </td>

                      <td className="py-2 pl-2 pr-2 text-right text-slate-400 whitespace-nowrap">
                        {pair.recovery.splitTimeSeconds > 0
                          ? formatIntervalDuration(pair.recovery.splitTimeSeconds)
                          : '--'}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

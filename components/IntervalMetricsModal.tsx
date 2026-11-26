import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Trophy, X } from 'lucide-react';
import type { IntervalWorkoutMetricsReport } from '../utils/intervalMetrics';
import {
  formatIntervalDuration,
  formatSpeedKmh,
  formatStepDistance,
} from '../utils/intervalMetrics';
import { IntervalSplitsTable, type IntervalViewMode } from './IntervalSplitsTable';

export type { IntervalViewMode };

interface IntervalMetricsModalProps {
  report: IntervalWorkoutMetricsReport;
  workoutTitle?: string;
  workoutDate?: string;
  athleteName?: string;
  workoutAvgHeartRate?: number;
  workoutMaxHeartRate?: number;
  isLight?: boolean;
  initialMode?: IntervalViewMode;
  onClose: () => void;
}

export const IntervalMetricsModal: React.FC<IntervalMetricsModalProps> = ({
  report,
  workoutTitle,
  workoutDate,
  athleteName,
  workoutAvgHeartRate,
  workoutMaxHeartRate,
  isLight = false,
  initialMode = 'with_recovery',
  onClose,
}) => {
  const [mode, setMode] = useState<IntervalViewMode>(
    report.hasRecoveries ? initialMode : 'without_recovery'
  );

  const activeSummary =
    mode === 'with_recovery' && report.hasRecoveries
      ? report.withRecovery
      : report.withoutRecovery;

  const formattedDate = workoutDate
    ? /^\d{4}-\d{2}-\d{2}$/.test(workoutDate)
      ? workoutDate.split('-').reverse().join('/')
      : workoutDate
    : undefined;

  const headerMeta = [
    `${report.intervals.length} ${report.intervals.length === 1 ? 'tiro' : 'tiros'}`,
    athleteName,
    formattedDate,
  ]
    .filter(Boolean)
    .join(' · ');

  const warmupDist = report.warmups.reduce((s, w) => s + w.distanceMeters, 0);
  const warmupSec = report.warmups.reduce((s, w) => s + w.durationSeconds, 0);
  const cooldownDist = report.cooldowns.reduce((s, c) => s + c.distanceMeters, 0);
  const cooldownSec = report.cooldowns.reduce((s, c) => s + c.durationSeconds, 0);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="interval-metrics-screen-title"
      onClick={onClose}
      className={`fixed inset-0 z-[20050] overflow-y-auto ${
        isLight ? 'bg-slate-50 text-slate-900' : 'bg-slate-950 text-slate-100'
      }`}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="min-h-full max-w-4xl mx-auto flex flex-col"
      >
        {/* Top Bar (3-zone mobile & desktop) */}
        <header
          className={`sticky top-0 z-20 flex items-center justify-between gap-4 px-4 sm:px-6 min-h-[56px] border-b backdrop-blur-md ${
            isLight
              ? 'bg-slate-50/95 border-slate-200'
              : 'bg-slate-950/95 border-slate-800'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Voltar"
            className={`min-h-[44px] min-w-[44px] px-2 -ml-2 inline-flex items-center gap-1.5 text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              isLight
                ? 'text-slate-700 hover:bg-slate-200/70'
                : 'text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </button>

          <div className="min-w-0 text-center">
            <h2
              id="interval-metrics-screen-title"
              className="text-base font-bold tracking-tight truncate"
            >
              Métricas dos Tiros
            </h2>
            {headerMeta && (
              <p
                className={`text-xs truncate ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {headerMeta}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar tela de tiros"
            className={`min-h-[44px] min-w-[44px] -mr-2 inline-flex items-center justify-center rounded-xl transition-colors cursor-pointer shrink-0 ${
              isLight
                ? 'text-slate-600 hover:bg-slate-200/70'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-6 space-y-6 pb-12">
          {/* Workout subtitle if available */}
          {workoutTitle && (
            <div className="space-y-1">
              <p
                className={`text-xs font-medium ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                Sessão selecionada
              </p>
              <p className="text-sm sm:text-base font-semibold leading-snug">
                {workoutTitle}
              </p>
            </div>
          )}

          {/* Segmented Control: Com recuperação | Sem recuperação */}
          <div
            role="tablist"
            aria-label="Modo de exibição dos tiros"
            className={`grid grid-cols-2 gap-1 p-1 rounded-2xl border ${
              isLight
                ? 'bg-slate-200/70 border-slate-200'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'with_recovery'}
              disabled={!report.hasRecoveries}
              onClick={() => setMode('with_recovery')}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed ${
                mode === 'with_recovery'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Com recuperação
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'without_recovery'}
              onClick={() => setMode('without_recovery')}
              className={`min-h-[44px] px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                mode === 'without_recovery'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : isLight
                  ? 'text-slate-700 hover:text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Sem recuperação
            </button>
          </div>

          {/* Primary KPI Summary for the Active Mode */}
          <section aria-label="Resumo da visualização selecionada" className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold">
                {mode === 'with_recovery' && report.hasRecoveries
                  ? 'Resumo dos tiros com recuperação'
                  : 'Resumo somente dos tiros (sem recuperação)'}
              </h3>
              <span
                className={`text-xs ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {mode === 'with_recovery' && report.hasRecoveries
                  ? `${report.intervals.length} tiros · ${report.recoveries.length} rec.`
                  : `${report.intervals.length} ${report.intervals.length === 1 ? 'tiro' : 'tiros'}`}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div
                className={`rounded-2xl border p-4 ${
                  isLight
                    ? 'bg-white border-slate-200'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <span
                  className={`block text-xs font-medium mb-1 ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Tempo total
                </span>
                <strong className="block text-xl sm:text-2xl font-bold font-mono tabular-nums">
                  {formatIntervalDuration(activeSummary.totalDurationSeconds)}
                </strong>
              </div>

              <div
                className={`rounded-2xl border p-4 ${
                  isLight
                    ? 'bg-white border-slate-200'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <span
                  className={`block text-xs font-medium mb-1 ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Pace médio
                </span>
                <strong className="block text-xl sm:text-2xl font-bold font-mono tabular-nums text-emerald-500">
                  {activeSummary.avgPace}{' '}
                  <span className="text-xs font-semibold">/km</span>
                </strong>
              </div>

              <div
                className={`rounded-2xl border p-4 ${
                  isLight
                    ? 'bg-white border-slate-200'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <span
                  className={`block text-xs font-medium mb-1 ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Velocidade média
                </span>
                <strong className="block text-xl sm:text-2xl font-bold font-mono tabular-nums">
                  {formatSpeedKmh(activeSummary.avgSpeedKmh)}
                </strong>
              </div>

              <div
                className={`rounded-2xl border p-4 ${
                  isLight
                    ? 'bg-white border-slate-200'
                    : 'bg-slate-900 border-slate-800'
                }`}
              >
                <span
                  className={`block text-xs font-medium mb-1 ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}
                >
                  Distância
                </span>
                <strong className="block text-xl sm:text-2xl font-bold font-mono tabular-nums">
                  {formatStepDistance(activeSummary.totalDistanceMeters)}
                </strong>
              </div>
            </div>

            {/* Secondary Comparison Strip */}
            {mode === 'with_recovery' && report.hasRecoveries ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div
                  className={`rounded-2xl border p-3.5 flex items-center justify-between gap-3 ${
                    isLight
                      ? 'bg-white border-slate-200'
                      : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div>
                    <span
                      className={`block text-xs font-semibold ${
                        isLight ? 'text-slate-700' : 'text-slate-200'
                      }`}
                    >
                      Média somente nos tiros
                    </span>
                    <span
                      className={`text-xs font-mono tabular-nums ${
                        isLight ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      {formatStepDistance(report.withoutRecovery.totalDistanceMeters)} ·{' '}
                      {formatIntervalDuration(report.withoutRecovery.totalDurationSeconds)}
                      {report.withoutRecovery.avgHeartRate
                        ? ` · ${report.withoutRecovery.avgHeartRate} bpm`
                        : ''}
                    </span>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <span className="block text-sm font-bold text-emerald-500">
                      {report.withoutRecovery.avgPace}/km
                    </span>
                    <span
                      className={`text-xs ${
                        isLight ? 'text-slate-600' : 'text-slate-300'
                      }`}
                    >
                      {formatSpeedKmh(report.withoutRecovery.avgSpeedKmh)}
                    </span>
                  </div>
                </div>

                <div
                  className={`rounded-2xl border p-3.5 flex items-center justify-between gap-3 ${
                    isLight
                      ? 'bg-white border-slate-200'
                      : 'bg-slate-900/70 border-slate-800'
                  }`}
                >
                  <div>
                    <span
                      className={`block text-xs font-semibold ${
                        isLight ? 'text-slate-700' : 'text-slate-200'
                      }`}
                    >
                      Média nas recuperações
                    </span>
                    <span
                      className={`text-xs font-mono tabular-nums ${
                        isLight ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      {formatStepDistance(report.recoveryOnly.totalDistanceMeters)} ·{' '}
                      {formatIntervalDuration(report.recoveryOnly.totalDurationSeconds)}
                      {report.recoveryOnly.avgHeartRate
                        ? ` · ${report.recoveryOnly.avgHeartRate} bpm`
                        : ''}
                    </span>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    <span className="block text-sm font-bold">
                      {report.recoveryOnly.avgPace === '--:--'
                        ? '--:--'
                        : `${report.recoveryOnly.avgPace}/km`}
                    </span>
                    <span
                      className={`text-xs ${
                        isLight ? 'text-slate-500' : 'text-slate-400'
                      }`}
                    >
                      {formatSpeedKmh(report.recoveryOnly.avgSpeedKmh)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              report.withoutRecovery.fastestRepNumber && (
                <div
                  className={`rounded-2xl border px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs ${
                    isLight
                      ? 'bg-emerald-50/70 border-emerald-200 text-slate-800'
                      : 'bg-emerald-950/30 border-emerald-800/60 text-slate-200'
                  }`}
                >
                  <span className="inline-flex items-center gap-1.5 font-semibold">
                    <Trophy className="w-4 h-4 text-emerald-500 shrink-0" />
                    Melhor tiro: #{report.withoutRecovery.fastestRepNumber}
                  </span>
                  <span className="font-mono tabular-nums font-semibold">
                    {report.withoutRecovery.fastestPace}/km ·{' '}
                    {formatSpeedKmh(report.withoutRecovery.fastestSpeedKmh)}
                  </span>
                </div>
              )
            )}
          </section>

          {/* Screenshot-2 Style Per-Rep Breakdown Table + HR Cards */}
          <section
            aria-label="Detalhamento por tiro e recuperação"
            className={`rounded-2xl border p-3 sm:p-4 ${
              isLight
                ? 'bg-white border-slate-200'
                : 'bg-slate-900 border-slate-800'
            }`}
          >
            <IntervalSplitsTable
              report={report}
              isLight={isLight}
              mode={mode}
              onModeChange={setMode}
              workoutAvgHeartRate={workoutAvgHeartRate}
              workoutMaxHeartRate={workoutMaxHeartRate}
              showHeartRateCards={true}
              showModeToggle={false}
              showSummaryStrip={false}
            />
          </section>

          {/* Transparent context footnotes */}
          <div
            className={`space-y-1 text-xs ${
              isLight ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            {(warmupSec > 0 || cooldownSec > 0) && (
              <p>
                Etapas fora do bloco de tiros não entram neste cálculo
                {warmupSec > 0
                  ? ` · Aquecimento: ${formatStepDistance(warmupDist)} (${formatIntervalDuration(warmupSec)})`
                  : ''}
                {cooldownSec > 0
                  ? ` · Desaquecimento: ${formatStepDistance(cooldownDist)} (${formatIntervalDuration(cooldownSec)})`
                  : ''}
                .
              </p>
            )}
            {report.source === 'telemetry_segmented' && (
              <p>
                Parciais segmentadas pela telemetria GPS registrada de acordo com a estrutura prescrita do treino.
              </p>
            )}
          </div>
        </main>
      </div>
    </div>,
    document.body
  );
};

interface IntervalMetricsTriggerCardProps {
  report: IntervalWorkoutMetricsReport;
  workoutTitle?: string;
  workoutDate?: string;
  athleteName?: string;
  workoutAvgHeartRate?: number;
  workoutMaxHeartRate?: number;
  isLight?: boolean;
}

export const IntervalMetricsTriggerCard: React.FC<IntervalMetricsTriggerCardProps> = ({
  report,
  workoutTitle,
  workoutDate,
  athleteName,
  workoutAvgHeartRate,
  workoutMaxHeartRate,
  isLight = false,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <section
        aria-label="Métricas dos tiros"
        className={`rounded-2xl border p-4 space-y-3 ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-slate-900/90 border-slate-800 text-slate-100'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold">
              Métricas dos Tiros ({report.intervals.length}x)
            </h3>
            <p
              className={`text-xs ${
                isLight ? 'text-slate-500' : 'text-slate-400'
              }`}
            >
              Tempo, pace, velocidade média e FC com e sem recuperação
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div
            className={`rounded-xl border p-3 ${
              isLight
                ? 'bg-emerald-50/70 border-emerald-200'
                : 'bg-emerald-950/30 border-emerald-800/50'
            }`}
          >
            <span
              className={`block text-[11px] font-semibold ${
                isLight ? 'text-slate-600' : 'text-slate-300'
              }`}
            >
              Sem recuperação (só tiros)
            </span>
            <p className="mt-1 text-sm font-bold font-mono tabular-nums text-emerald-500">
              {report.withoutRecovery.avgPace}/km ·{' '}
              {formatSpeedKmh(report.withoutRecovery.avgSpeedKmh)}
            </p>
            <p
              className={`text-xs font-mono tabular-nums ${
                isLight ? 'text-slate-600' : 'text-slate-400'
              }`}
            >
              {formatIntervalDuration(report.withoutRecovery.totalDurationSeconds)} ·{' '}
              {formatStepDistance(report.withoutRecovery.totalDistanceMeters)}
              {report.withoutRecovery.avgHeartRate
                ? ` · ${report.withoutRecovery.avgHeartRate} bpm`
                : ''}
            </p>
          </div>

          {report.hasRecoveries && (
            <div
              className={`rounded-xl border p-3 ${
                isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <span
                className={`block text-[11px] font-semibold ${
                  isLight ? 'text-slate-600' : 'text-slate-300'
                }`}
              >
                Com recuperação (tiros + rec.)
              </span>
              <p className="mt-1 text-sm font-bold font-mono tabular-nums">
                {report.withRecovery.avgPace}/km ·{' '}
                {formatSpeedKmh(report.withRecovery.avgSpeedKmh)}
              </p>
              <p
                className={`text-xs font-mono tabular-nums ${
                  isLight ? 'text-slate-500' : 'text-slate-400'
                }`}
              >
                {formatIntervalDuration(report.withRecovery.totalDurationSeconds)} ·{' '}
                {formatStepDistance(report.withRecovery.totalDistanceMeters)}
                {report.withRecovery.avgHeartRate
                  ? ` · ${report.withRecovery.avgHeartRate} bpm`
                  : ''}
              </p>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
        >
          Abrir tela dos tiros (com e sem recuperação)
        </button>
      </section>

      {open && (
        <IntervalMetricsModal
          report={report}
          workoutTitle={workoutTitle}
          workoutDate={workoutDate}
          athleteName={athleteName}
          workoutAvgHeartRate={workoutAvgHeartRate}
          workoutMaxHeartRate={workoutMaxHeartRate}
          isLight={isLight}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
};

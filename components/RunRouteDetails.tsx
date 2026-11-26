import { formatDistance } from '../utils/formatDistance';
import React, { useMemo } from 'react';
import type { StructuredWorkout } from '../types';
import { RouteData, formatDuration } from '../utils/gpsUtils';
import {
  formatIntervalDuration,
  formatSpeedKmh,
  formatStepDistance,
  resolveIntervalMetricsForWorkout,
} from '../utils/intervalMetrics';
import { normalizeGpsPoints } from '../utils/socialCardUtils';
import { IntervalMetricsTriggerCard } from './IntervalMetricsModal';
import { WorkoutMap } from './WorkoutMap';
import { WorkoutTelemetryCharts } from './WorkoutTelemetryCharts';

/** The same map, splits and telemetry for prescribed and free running sessions. */
export function RunRouteDetails({
  route,
  isLight = false,
  structuredWorkout,
  workoutDescription,
  workoutType,
  workoutTitle,
  workoutDate,
  athleteName,
}: {
  route: Partial<RouteData>;
  isLight?: boolean;
  structuredWorkout?: StructuredWorkout | null;
  workoutDescription?: string;
  workoutType?: string;
  workoutTitle?: string;
  workoutDate?: string;
  athleteName?: string;
}) {
  const points = normalizeGpsPoints(route);
  const distance = route.totalDistanceKm ?? (route as { distanceKm?: number }).distanceKm;
  const intervalReport = useMemo(
    () =>
      resolveIntervalMetricsForWorkout(
        route,
        structuredWorkout,
        workoutDescription,
        workoutType
      ),
    [route, structuredWorkout, workoutDescription, workoutType]
  );

  return (
    <div className="space-y-4 pt-2" data-run-route-details>
      {intervalReport && (
        <IntervalMetricsTriggerCard
          report={intervalReport}
          workoutTitle={workoutTitle || workoutDescription || workoutType}
          workoutDate={workoutDate}
          athleteName={athleteName}
          workoutAvgHeartRate={route.avgHeartRate}
          workoutMaxHeartRate={route.maxHeartRate}
          isLight={isLight}
        />
      )}
      {points.length > 1 && (
        <div className="rounded-2xl overflow-hidden border border-white/10 h-52 relative shadow-md">
          <WorkoutMap points={points} height="100%" interactive />
          <span className="absolute top-2 left-2 bg-slate-950/80 px-3 py-1 rounded-lg text-[9px] text-emerald-400 font-black uppercase italic pointer-events-none">
            Rota percorrida{distance != null ? ` · ${formatDistance(distance)} km` : ''}
          </span>
        </div>
      )}
      {intervalReport && intervalReport.pairs.length > 0 && (
        <section className={`p-3 rounded-2xl border space-y-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
          <h3 className={`text-[10px] font-black uppercase italic tracking-wider ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
            Parciais por tiro ({intervalReport.intervals.length}x)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {intervalReport.pairs.map((pair) => (
              <div
                key={`${pair.interval.stepId}-${pair.repNumber}`}
                className={`p-3 rounded-xl border min-w-0 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'}`}
              >
                <span className="text-[9px] text-slate-400 font-bold block">
                  TIRO {pair.repNumber} · {formatStepDistance(pair.interval.distanceMeters)}
                </span>
                <p className={`text-sm font-black font-mono ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                  {pair.interval.pace}/km
                </p>
                <p className="text-[9px] text-slate-400 font-mono">
                  Tempo: {formatIntervalDuration(pair.interval.durationSeconds)} · {formatSpeedKmh(pair.interval.avgSpeedKmh)}
                </p>
                {pair.interval.avgHeartRate != null && (
                  <p className={`text-[9px] font-bold font-mono ${isLight ? 'text-rose-700' : 'text-rose-400'}`}>
                    FC: {pair.interval.avgHeartRate} bpm
                  </p>
                )}
                {pair.interval.avgCadence != null && (
                  <p className={`text-[9px] ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                    {pair.interval.avgCadence} passadas/min
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      {!!route.kmSplits?.length && (
        <section className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-3">
          <h3 className="text-[10px] font-black uppercase italic tracking-wider text-emerald-400">
            Parciais por quilômetro
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {route.kmSplits.map((split, index) => (
              <div
                key={`${split.km}-${index}`}
                className="p-3 rounded-xl bg-slate-900 border border-white/10 min-w-0"
              >
                <span className="text-[9px] text-slate-400 font-bold">KM {split.km}</span>
                <p className="text-sm font-black font-mono text-emerald-400">{split.pace}/km</p>
                <p className="text-[9px] text-slate-400">
                  Tempo: {formatDuration(split.durationSeconds)}
                </p>
                {split.avgHeartRate != null && (
                  <p className="text-[9px] text-rose-400 font-bold">FC: {split.avgHeartRate} bpm</p>
                )}
                {split.avgCadence != null && (
                  <p className="text-[9px] text-slate-300">{split.avgCadence} passadas/min</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
      <WorkoutTelemetryCharts
        telemetrySamples={route.telemetrySamples || (route as any).telemetry}
        kmSplits={route.kmSplits}
        intervalReport={intervalReport}
        avgHeartRate={route.avgHeartRate}
        maxHeartRate={route.maxHeartRate}
        avgPace={route.avgPace}
        avgCadence={route.avgCadence}
        maxCadence={route.maxCadence}
        calories={route.calories}
        elevationGainMeters={route.elevationGainMeters}
        totalDistanceKm={distance}
        totalDurationSeconds={route.totalDurationSeconds}
        isLight={isLight}
      />
    </div>
  );
}

import type { StepType, StructuredWorkout, WorkoutStep } from '../types';
import { formatDuration, formatPace, type RouteData } from './gpsUtils';
import { crossingSeconds, paceFromTotals } from './runCalculations';
import type { TelemetryPoint } from './runningMetrics';
import { parseWorkoutTextToStructure } from './workoutParser';

export interface RawCompletedStep {
  stepId: string;
  name: string;
  type: StepType | string;
  targetType?: string;
  targetValue?: number;
  completedDistanceMeters: number;
  completedDurationSeconds: number;
  avgPace?: string;
}

export interface IntervalStepMetric {
  index: number; // 1-based index within its category
  stepId: string;
  name: string;
  type: StepType;
  distanceMeters: number;
  durationSeconds: number;
  pace: string;
  paceSeconds: number | null;
  avgSpeedKmh: number | null;
}

export interface IntervalPairMetric {
  repNumber: number;
  interval: IntervalStepMetric;
  recovery?: IntervalStepMetric;
}

export interface IntervalCategorySummary {
  count: number;
  totalDistanceMeters: number;
  totalDistanceKm: number;
  totalDurationSeconds: number;
  avgPace: string;
  avgSpeedKmh: number | null;
  fastestPace?: string;
  fastestSpeedKmh?: number | null;
  fastestRepNumber?: number;
}

export interface IntervalWorkoutMetricsReport {
  source: 'recorded_steps' | 'telemetry_segmented';
  hasIntervals: boolean;
  hasRecoveries: boolean;
  intervals: IntervalStepMetric[];
  recoveries: IntervalStepMetric[];
  warmups: IntervalStepMetric[];
  cooldowns: IntervalStepMetric[];
  pairs: IntervalPairMetric[];
  withoutRecovery: IntervalCategorySummary;
  withRecovery: IntervalCategorySummary;
  recoveryOnly: IntervalCategorySummary;
  fullWorkoutSummary: IntervalCategorySummary;
}

export function calculateSpeedKmh(distanceMeters: number, durationSeconds: number): number | null {
  if (
    !Number.isFinite(distanceMeters) ||
    !Number.isFinite(durationSeconds) ||
    distanceMeters <= 0 ||
    durationSeconds <= 0
  ) {
    return null;
  }
  const kmh = ((distanceMeters / 1000) * 3600) / durationSeconds;
  return Number.isFinite(kmh) && kmh > 0 && kmh <= 60 ? Number(kmh.toFixed(1)) : null;
}

export function formatSpeedKmh(speedKmh: number | null | undefined): string {
  if (speedKmh == null || !Number.isFinite(speedKmh) || speedKmh <= 0) return '--';
  return `${speedKmh.toLocaleString('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} km/h`;
}

export function formatStepDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '0 m';
  if (meters >= 1000) {
    const km = meters / 1000;
    return `${km.toLocaleString('pt-BR', {
      minimumFractionDigits: km % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    })} km`;
  }
  return `${Math.round(meters)} m`;
}

function normalizeStepType(rawType: string | undefined, name?: string): StepType {
  const t = String(rawType || '').toLowerCase();
  if (t === 'interval' || t === 'recovery' || t === 'warmup' || t === 'cooldown' || t === 'steady') {
    return t;
  }
  const n = String(name || '').toLowerCase();
  if (n.includes('tiro') || n.includes('interval')) return 'interval';
  if (n.includes('rec') || n.includes('descanso') || n.includes('pausa')) return 'recovery';
  if (n.includes('aquec')) return 'warmup';
  if (n.includes('desaq') || n.includes('volta')) return 'cooldown';
  return 'steady';
}

function toIntervalStepMetric(step: RawCompletedStep, categoryIndex: number): IntervalStepMetric {
  const distanceMeters = Math.max(0, Number(step.completedDistanceMeters) || 0);
  const durationSeconds = Math.max(0, Number(step.completedDurationSeconds) || 0);
  const distanceKm = distanceMeters / 1000;
  const computedPace = paceFromTotals(durationSeconds, distanceKm);
  const pace = computedPace !== '--:--' ? computedPace : step.avgPace || '--:--';
  const paceSeconds =
    distanceKm > 0 && durationSeconds > 0 && computedPace !== '--:--'
      ? Math.round(durationSeconds / distanceKm)
      : null;

  return {
    index: categoryIndex,
    stepId: step.stepId,
    name: step.name,
    type: normalizeStepType(step.type, step.name),
    distanceMeters: Math.round(distanceMeters),
    durationSeconds: Math.round(durationSeconds),
    pace,
    paceSeconds,
    avgSpeedKmh: calculateSpeedKmh(distanceMeters, durationSeconds),
  };
}

function summarizeSteps(steps: IntervalStepMetric[]): IntervalCategorySummary {
  const totalDistanceMeters = steps.reduce((acc, s) => acc + s.distanceMeters, 0);
  const totalDistanceKm = totalDistanceMeters / 1000;
  const totalDurationSeconds = steps.reduce((acc, s) => acc + s.durationSeconds, 0);
  const avgPace = paceFromTotals(totalDurationSeconds, totalDistanceKm);
  const avgSpeedKmh = calculateSpeedKmh(totalDistanceMeters, totalDurationSeconds);

  let fastest: IntervalStepMetric | null = null;
  for (const s of steps) {
    if (s.paceSeconds !== null && s.paceSeconds > 0) {
      if (!fastest || (fastest.paceSeconds !== null && s.paceSeconds < fastest.paceSeconds)) {
        fastest = s;
      }
    }
  }

  return {
    count: steps.length,
    totalDistanceMeters: Math.round(totalDistanceMeters),
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    totalDurationSeconds: Math.round(totalDurationSeconds),
    avgPace,
    avgSpeedKmh,
    fastestPace: fastest?.pace,
    fastestSpeedKmh: fastest?.avgSpeedKmh ?? null,
    fastestRepNumber: fastest?.index,
  };
}

export function buildIntervalMetricsReport(
  rawSteps: RawCompletedStep[],
  source: 'recorded_steps' | 'telemetry_segmented' = 'recorded_steps'
): IntervalWorkoutMetricsReport | null {
  if (!Array.isArray(rawSteps) || rawSteps.length === 0) return null;

  const intervals: IntervalStepMetric[] = [];
  const recoveries: IntervalStepMetric[] = [];
  const warmups: IntervalStepMetric[] = [];
  const cooldowns: IntervalStepMetric[] = [];
  const normalizedOrdered: IntervalStepMetric[] = [];

  let intIdx = 0;
  let recIdx = 0;
  let warmIdx = 0;
  let coolIdx = 0;

  for (const raw of rawSteps) {
    const type = normalizeStepType(raw.type, raw.name);
    if (type === 'interval') {
      intIdx += 1;
      const item = toIntervalStepMetric(raw, intIdx);
      intervals.push(item);
      normalizedOrdered.push(item);
    } else if (type === 'recovery') {
      recIdx += 1;
      const item = toIntervalStepMetric(raw, recIdx);
      recoveries.push(item);
      normalizedOrdered.push(item);
    } else if (type === 'warmup') {
      warmIdx += 1;
      const item = toIntervalStepMetric(raw, warmIdx);
      warmups.push(item);
      normalizedOrdered.push(item);
    } else if (type === 'cooldown') {
      coolIdx += 1;
      const item = toIntervalStepMetric(raw, coolIdx);
      cooldowns.push(item);
      normalizedOrdered.push(item);
    } else {
      const item = toIntervalStepMetric(raw, normalizedOrdered.length + 1);
      normalizedOrdered.push(item);
    }
  }

  if (intervals.length === 0) return null;

  const pairs: IntervalPairMetric[] = [];
  for (let i = 0; i < normalizedOrdered.length; i++) {
    const step = normalizedOrdered[i];
    if (step.type === 'interval') {
      const next = normalizedOrdered[i + 1];
      const pair: IntervalPairMetric = {
        repNumber: pairs.length + 1,
        interval: step,
      };
      if (next && next.type === 'recovery') {
        pair.recovery = next;
        i += 1;
      }
      pairs.push(pair);
    }
  }

  const withRecoverySteps = [...intervals, ...recoveries];

  return {
    source,
    hasIntervals: intervals.length > 0,
    hasRecoveries: recoveries.length > 0,
    intervals,
    recoveries,
    warmups,
    cooldowns,
    pairs,
    withoutRecovery: summarizeSteps(intervals),
    withRecovery: summarizeSteps(withRecoverySteps),
    recoveryOnly: summarizeSteps(recoveries),
    fullWorkoutSummary: summarizeSteps(normalizedOrdered),
  };
}

function interpolateDistanceAtTime(
  samples: { distanceKm: number; durationSeconds: number }[],
  targetSeconds: number
): number {
  if (samples.length === 0) return 0;
  if (targetSeconds <= samples[0].durationSeconds) return samples[0].distanceKm;
  const last = samples[samples.length - 1];
  if (targetSeconds >= last.durationSeconds) return last.distanceKm;

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const curr = samples[i];
    if (curr.durationSeconds >= targetSeconds) {
      const span = curr.durationSeconds - prev.durationSeconds;
      if (span <= 0) return curr.distanceKm;
      const fraction = Math.min(1, Math.max(0, (targetSeconds - prev.durationSeconds) / span));
      return prev.distanceKm + (curr.distanceKm - prev.distanceKm) * fraction;
    }
  }
  return last.distanceKm;
}

function interpolateTimeAtDistance(
  samples: { distanceKm: number; durationSeconds: number }[],
  targetKm: number
): number {
  if (samples.length === 0) return 0;
  if (targetKm <= samples[0].distanceKm) return samples[0].durationSeconds;
  const last = samples[samples.length - 1];
  if (targetKm >= last.distanceKm) return last.durationSeconds;

  for (let i = 1; i < samples.length; i++) {
    const prev = samples[i - 1];
    const curr = samples[i];
    if (curr.distanceKm >= targetKm) {
      return crossingSeconds(
        { seconds: prev.durationSeconds, kilometers: prev.distanceKm },
        { seconds: curr.durationSeconds, kilometers: curr.distanceKm },
        targetKm
      );
    }
  }
  return last.durationSeconds;
}

/**
 * Segments recorded GPS telemetry (live or GPX) according to the prescribed structured steps
 * when explicit step lap timestamps were not captured (e.g. watch GPX upload).
 */
export function segmentTelemetryByStructuredSteps(
  samples: Pick<TelemetryPoint, 'distanceKm' | 'durationSeconds'>[],
  structuredWorkout?: StructuredWorkout | null
): RawCompletedStep[] {
  if (!structuredWorkout?.steps?.length || !Array.isArray(samples) || samples.length < 2) {
    return [];
  }
  const hasIntervals = structuredWorkout.steps.some((s) => s.type === 'interval');
  if (!hasIntervals) return [];

  const normalized = [
    { distanceKm: 0, durationSeconds: 0 },
    ...samples
      .filter((s) => Number.isFinite(s.distanceKm) && Number.isFinite(s.durationSeconds))
      .sort((a, b) => a.durationSeconds - b.durationSeconds || a.distanceKm - b.distanceKm),
  ];

  const maxDistKm = normalized[normalized.length - 1]?.distanceKm ?? 0;
  const maxDurSec = normalized[normalized.length - 1]?.durationSeconds ?? 0;
  if (maxDistKm <= 0.05 || maxDurSec <= 5) return [];

  const result: RawCompletedStep[] = [];
  let cursorKm = 0;
  let cursorSec = 0;

  for (const step of structuredWorkout.steps as WorkoutStep[]) {
    if (step.targetType === 'distance' && step.targetValue > 0) {
      const stepKm = step.targetValue / 1000;
      const targetKm = cursorKm + stepKm;
      if (maxDistKm < cursorKm + stepKm * 0.45) break;

      const clampedEndKm = Math.min(targetKm, maxDistKm);
      const endSec = interpolateTimeAtDistance(normalized, clampedEndKm);
      const actualMeters = Math.max(0, Math.round((clampedEndKm - cursorKm) * 1000));
      const actualSeconds = Math.max(1, Math.round(endSec - cursorSec));

      result.push({
        stepId: step.id,
        name: step.name,
        type: step.type,
        targetType: step.targetType,
        targetValue: step.targetValue,
        completedDistanceMeters: actualMeters,
        completedDurationSeconds: actualSeconds,
        avgPace: formatPace(actualSeconds, actualMeters / 1000),
      });

      cursorKm = clampedEndKm;
      cursorSec = Math.max(cursorSec, endSec);
    } else if (step.targetType === 'time' && step.targetValue > 0) {
      const targetSec = cursorSec + step.targetValue;
      if (maxDurSec < cursorSec + step.targetValue * 0.45) break;

      const clampedEndSec = Math.min(targetSec, maxDurSec);
      const endKm = interpolateDistanceAtTime(normalized, clampedEndSec);
      const actualMeters = Math.max(0, Math.round((endKm - cursorKm) * 1000));
      const actualSeconds = Math.max(1, Math.round(clampedEndSec - cursorSec));

      result.push({
        stepId: step.id,
        name: step.name,
        type: step.type,
        targetType: step.targetType,
        targetValue: step.targetValue,
        completedDistanceMeters: actualMeters,
        completedDurationSeconds: actualSeconds,
        avgPace: formatPace(actualSeconds, actualMeters / 1000),
      });

      cursorKm = Math.max(cursorKm, endKm);
      cursorSec = clampedEndSec;
    }
  }

  return result;
}

export interface IntervalRouteInput {
  completedSteps?: RawCompletedStep[];
  telemetrySamples?: Pick<TelemetryPoint, 'distanceKm' | 'durationSeconds'>[];
  telemetry?: Pick<TelemetryPoint, 'distanceKm' | 'durationSeconds'>[];
}

export function resolveIntervalMetricsForWorkout(
  route?: IntervalRouteInput | Partial<RouteData> | null,
  structuredWorkout?: StructuredWorkout | null,
  workoutDescription?: string,
  workoutType?: string
): IntervalWorkoutMetricsReport | null {
  if (route?.completedSteps && route.completedSteps.length > 0) {
    const direct = buildIntervalMetricsReport(route.completedSteps, 'recorded_steps');
    if (direct && direct.hasIntervals) {
      return direct;
    }
  }

  const resolvedStructure =
    structuredWorkout?.steps?.length
      ? structuredWorkout
      : workoutDescription
      ? parseWorkoutTextToStructure(workoutDescription, workoutType)
      : null;

  const telemetry =
    (route as IntervalRouteInput | null | undefined)?.telemetrySamples ||
    (route as IntervalRouteInput | null | undefined)?.telemetry;
  if (resolvedStructure && telemetry && telemetry.length >= 2) {
    const segmented = segmentTelemetryByStructuredSteps(telemetry, resolvedStructure);
    if (segmented.length > 0) {
      return buildIntervalMetricsReport(segmented, 'telemetry_segmented');
    }
  }

  return null;
}

export function formatIntervalDuration(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '00:00';
  return formatDuration(Math.round(totalSeconds));
}

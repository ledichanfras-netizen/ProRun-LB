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
  splitTimeSeconds?: number;
  avgPace?: string;
  avgSpeedKmh?: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgCadence?: number;
  calories?: number;
}

export interface IntervalStepMetric {
  index: number; // 1-based index within its category
  stepId: string;
  name: string;
  type: StepType;
  distanceMeters: number;
  durationSeconds: number;
  splitTimeSeconds: number;
  pace: string;
  paceSeconds: number | null;
  avgSpeedKmh: number | null;
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  avgCadence: number | null;
  calories: number | null;
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
  avgHeartRate: number | null;
  maxHeartRate: number | null;
  avgCadence: number | null;
  totalCalories: number | null;
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

function cleanPositiveInt(val: unknown): number | null {
  return typeof val === 'number' && Number.isFinite(val) && val > 0 ? Math.round(val) : null;
}

function toIntervalStepMetric(
  step: RawCompletedStep,
  categoryIndex: number,
  fallbackCumulativeSeconds: number
): IntervalStepMetric {
  const distanceMeters = Math.max(0, Number(step.completedDistanceMeters) || 0);
  const durationSeconds = Math.max(0, Number(step.completedDurationSeconds) || 0);
  const distanceKm = distanceMeters / 1000;
  const computedPace = paceFromTotals(durationSeconds, distanceKm);
  const pace = computedPace !== '--:--' ? computedPace : step.avgPace || '--:--';
  const paceSeconds =
    distanceKm > 0 && durationSeconds > 0 && computedPace !== '--:--'
      ? Math.round(durationSeconds / distanceKm)
      : null;

  const avgSpeedKmh =
    typeof step.avgSpeedKmh === 'number' && Number.isFinite(step.avgSpeedKmh) && step.avgSpeedKmh > 0
      ? Number(step.avgSpeedKmh.toFixed(1))
      : calculateSpeedKmh(distanceMeters, durationSeconds);

  const avgHeartRate = cleanPositiveInt(step.avgHeartRate);
  const rawMaxHr = cleanPositiveInt(step.maxHeartRate);
  const maxHeartRate =
    rawMaxHr !== null && avgHeartRate !== null
      ? Math.max(rawMaxHr, avgHeartRate)
      : rawMaxHr ?? avgHeartRate;

  const splitTimeSeconds =
    typeof step.splitTimeSeconds === 'number' &&
    Number.isFinite(step.splitTimeSeconds) &&
    step.splitTimeSeconds > 0
      ? Math.round(step.splitTimeSeconds)
      : Math.round(fallbackCumulativeSeconds);

  return {
    index: categoryIndex,
    stepId: step.stepId,
    name: step.name,
    type: normalizeStepType(step.type, step.name),
    distanceMeters: Math.round(distanceMeters),
    durationSeconds: Math.round(durationSeconds),
    splitTimeSeconds,
    pace,
    paceSeconds,
    avgSpeedKmh,
    avgHeartRate,
    maxHeartRate,
    avgCadence: cleanPositiveInt(step.avgCadence),
    calories: cleanPositiveInt(step.calories),
  };
}

function summarizeSteps(steps: IntervalStepMetric[]): IntervalCategorySummary {
  const totalDistanceMeters = steps.reduce((acc, s) => acc + s.distanceMeters, 0);
  const totalDistanceKm = totalDistanceMeters / 1000;
  const totalDurationSeconds = steps.reduce((acc, s) => acc + s.durationSeconds, 0);
  const avgPace = paceFromTotals(totalDurationSeconds, totalDistanceKm);
  const avgSpeedKmh = calculateSpeedKmh(totalDistanceMeters, totalDurationSeconds);

  let hrWeightedSum = 0;
  let hrWeight = 0;
  let maxHeartRate: number | null = null;
  let cadWeightedSum = 0;
  let cadWeight = 0;
  let kcalSum = 0;
  let hasKcal = false;

  let fastest: IntervalStepMetric | null = null;
  for (const s of steps) {
    if (s.paceSeconds !== null && s.paceSeconds > 0) {
      if (!fastest || (fastest.paceSeconds !== null && s.paceSeconds < fastest.paceSeconds)) {
        fastest = s;
      }
    }
    const w = s.durationSeconds > 0 ? s.durationSeconds : 1;
    if (s.avgHeartRate !== null && s.avgHeartRate > 0) {
      hrWeightedSum += s.avgHeartRate * w;
      hrWeight += w;
    }
    const peakCandidate = s.maxHeartRate ?? s.avgHeartRate;
    if (peakCandidate !== null && peakCandidate > 0) {
      maxHeartRate = maxHeartRate === null ? peakCandidate : Math.max(maxHeartRate, peakCandidate);
    }
    if (s.avgCadence !== null && s.avgCadence > 0) {
      cadWeightedSum += s.avgCadence * w;
      cadWeight += w;
    }
    if (s.calories !== null && s.calories > 0) {
      kcalSum += s.calories;
      hasKcal = true;
    }
  }

  return {
    count: steps.length,
    totalDistanceMeters: Math.round(totalDistanceMeters),
    totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
    totalDurationSeconds: Math.round(totalDurationSeconds),
    avgPace,
    avgSpeedKmh,
    avgHeartRate: hrWeight > 0 ? Math.round(hrWeightedSum / hrWeight) : null,
    maxHeartRate,
    avgCadence: cadWeight > 0 ? Math.round(cadWeightedSum / cadWeight) : null,
    totalCalories: hasKcal ? Math.round(kcalSum) : null,
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
  let runningElapsedSec = 0;

  for (const raw of rawSteps) {
    const stepDur = Math.max(0, Number(raw.completedDurationSeconds) || 0);
    runningElapsedSec =
      typeof raw.splitTimeSeconds === 'number' &&
      Number.isFinite(raw.splitTimeSeconds) &&
      raw.splitTimeSeconds > 0
        ? Math.max(runningElapsedSec, Math.round(raw.splitTimeSeconds))
        : runningElapsedSec + Math.round(stepDur);

    const type = normalizeStepType(raw.type, raw.name);
    if (type === 'interval') {
      intIdx += 1;
      const item = toIntervalStepMetric(raw, intIdx, runningElapsedSec);
      intervals.push(item);
      normalizedOrdered.push(item);
    } else if (type === 'recovery') {
      recIdx += 1;
      const item = toIntervalStepMetric(raw, recIdx, runningElapsedSec);
      recoveries.push(item);
      normalizedOrdered.push(item);
    } else if (type === 'warmup') {
      warmIdx += 1;
      const item = toIntervalStepMetric(raw, warmIdx, runningElapsedSec);
      warmups.push(item);
      normalizedOrdered.push(item);
    } else if (type === 'cooldown') {
      coolIdx += 1;
      const item = toIntervalStepMetric(raw, coolIdx, runningElapsedSec);
      cooldowns.push(item);
      normalizedOrdered.push(item);
    } else {
      const item = toIntervalStepMetric(raw, normalizedOrdered.length + 1, runningElapsedSec);
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

type TelemetrySampleInput = Pick<TelemetryPoint, 'distanceKm' | 'durationSeconds'> &
  Partial<Pick<TelemetryPoint, 'heartRate' | 'cadenceSpm' | 'calories'>>;

function extractBiometricsFromTelemetryWindow(
  samples: TelemetrySampleInput[],
  startSec: number,
  endSec: number,
  distanceMeters: number,
  durationSeconds: number
) {
  let window = samples.filter(
    (pt) => pt.durationSeconds >= startSec && pt.durationSeconds <= endSec
  );
  if (window.length === 0 && endSec - startSec >= 3) {
    window = samples.filter(
      (pt) => pt.durationSeconds >= startSec - 1 && pt.durationSeconds <= endSec + 1
    );
  }

  const hrValues = window
    .map((pt) => pt.heartRate)
    .filter((hr): hr is number => typeof hr === 'number' && Number.isFinite(hr) && hr > 0);
  const cadValues = window
    .map((pt) => pt.cadenceSpm)
    .filter((cad): cad is number => typeof cad === 'number' && Number.isFinite(cad) && cad > 0);
  const calValues = window
    .map((pt) => pt.calories)
    .filter((c): c is number => typeof c === 'number' && Number.isFinite(c) && c >= 0);

  let calories: number | undefined;
  if (calValues.length >= 2) {
    const diff = Math.round(calValues[calValues.length - 1] - calValues[0]);
    if (diff > 0) calories = diff;
  } else if (distanceMeters > 10) {
    const before = [...samples]
      .reverse()
      .find((pt) => pt.durationSeconds <= startSec && typeof pt.calories === 'number');
    const after = [...samples]
      .reverse()
      .find((pt) => pt.durationSeconds <= endSec && typeof pt.calories === 'number');
    if (before?.calories !== undefined && after?.calories !== undefined) {
      const diff = Math.round(after.calories - before.calories);
      if (diff > 0) calories = diff;
    }
  }

  return {
    splitTimeSeconds: Math.round(endSec),
    avgSpeedKmh: calculateSpeedKmh(distanceMeters, durationSeconds) ?? undefined,
    avgHeartRate: hrValues.length
      ? Math.round(hrValues.reduce((a, b) => a + b, 0) / hrValues.length)
      : undefined,
    maxHeartRate: hrValues.length ? Math.round(Math.max(...hrValues)) : undefined,
    avgCadence: cadValues.length
      ? Math.round(cadValues.reduce((a, b) => a + b, 0) / cadValues.length)
      : undefined,
    calories,
  };
}

export function enrichCompletedStepsWithTelemetry(
  rawSteps: RawCompletedStep[],
  telemetry?: TelemetrySampleInput[] | null
): RawCompletedStep[] {
  if (!Array.isArray(rawSteps) || rawSteps.length === 0) return rawSteps;
  if (!Array.isArray(telemetry) || telemetry.length < 2) return rawSteps;

  const sorted = [...telemetry]
    .filter((s) => Number.isFinite(s.durationSeconds))
    .sort((a, b) => a.durationSeconds - b.durationSeconds);
  if (sorted.length === 0) return rawSteps;

  let cursorSec = 0;
  return rawSteps.map((step) => {
    const dur = Math.max(0, Math.round(Number(step.completedDurationSeconds) || 0));
    const endSec =
      typeof step.splitTimeSeconds === 'number' &&
      Number.isFinite(step.splitTimeSeconds) &&
      step.splitTimeSeconds > 0
        ? Math.max(cursorSec, Math.round(step.splitTimeSeconds))
        : cursorSec + dur;
    const startSec = Math.max(0, endSec - dur);
    cursorSec = endSec;

    const extracted = extractBiometricsFromTelemetryWindow(
      sorted,
      startSec,
      endSec,
      step.completedDistanceMeters,
      dur
    );

    return {
      ...step,
      splitTimeSeconds: step.splitTimeSeconds ?? extracted.splitTimeSeconds,
      avgSpeedKmh: step.avgSpeedKmh ?? extracted.avgSpeedKmh,
      avgHeartRate: step.avgHeartRate ?? extracted.avgHeartRate,
      maxHeartRate: step.maxHeartRate ?? extracted.maxHeartRate,
      avgCadence: step.avgCadence ?? extracted.avgCadence,
      calories: step.calories ?? extracted.calories,
    };
  });
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
  samples: TelemetrySampleInput[],
  structuredWorkout?: StructuredWorkout | null
): RawCompletedStep[] {
  if (!structuredWorkout?.steps?.length || !Array.isArray(samples) || samples.length < 2) {
    return [];
  }
  const hasIntervals = structuredWorkout.steps.some((s) => s.type === 'interval');
  if (!hasIntervals) return [];

  const sortedSamples = [...samples]
    .filter((s) => Number.isFinite(s.distanceKm) && Number.isFinite(s.durationSeconds))
    .sort((a, b) => a.durationSeconds - b.durationSeconds || a.distanceKm - b.distanceKm);

  const normalized: TelemetrySampleInput[] = [
    { distanceKm: 0, durationSeconds: 0, calories: 0 },
    ...sortedSamples,
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
      const bio = extractBiometricsFromTelemetryWindow(
        sortedSamples,
        cursorSec,
        endSec,
        actualMeters,
        actualSeconds
      );

      result.push({
        stepId: step.id,
        name: step.name,
        type: step.type,
        targetType: step.targetType,
        targetValue: step.targetValue,
        completedDistanceMeters: actualMeters,
        completedDurationSeconds: actualSeconds,
        avgPace: formatPace(actualSeconds, actualMeters / 1000),
        ...bio,
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
      const bio = extractBiometricsFromTelemetryWindow(
        sortedSamples,
        cursorSec,
        clampedEndSec,
        actualMeters,
        actualSeconds
      );

      result.push({
        stepId: step.id,
        name: step.name,
        type: step.type,
        targetType: step.targetType,
        targetValue: step.targetValue,
        completedDistanceMeters: actualMeters,
        completedDurationSeconds: actualSeconds,
        avgPace: formatPace(actualSeconds, actualMeters / 1000),
        ...bio,
      });

      cursorKm = Math.max(cursorKm, endKm);
      cursorSec = clampedEndSec;
    }
  }

  return result;
}

export interface IntervalRouteInput {
  completedSteps?: RawCompletedStep[];
  telemetrySamples?: TelemetrySampleInput[];
  telemetry?: TelemetrySampleInput[];
}

export function resolveIntervalMetricsForWorkout(
  route?: IntervalRouteInput | Partial<RouteData> | null,
  structuredWorkout?: StructuredWorkout | null,
  workoutDescription?: string,
  workoutType?: string
): IntervalWorkoutMetricsReport | null {
  const telemetry =
    (route as IntervalRouteInput | null | undefined)?.telemetrySamples ||
    (route as IntervalRouteInput | null | undefined)?.telemetry;

  if (route?.completedSteps && route.completedSteps.length > 0) {
    const enrichedSteps = enrichCompletedStepsWithTelemetry(route.completedSteps, telemetry);
    const direct = buildIntervalMetricsReport(enrichedSteps, 'recorded_steps');
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

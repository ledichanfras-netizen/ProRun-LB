import { StructuredWorkout, WorkoutStep, StepType, StepTargetType } from '../types';

/**
 * Intelligent Running Workout Parser & Builder (Prescrição Detalhada)
 * Translates Brazilian coach shorthand into structured steps for execution with GPS
 */

export interface IntervalBuilderParams {
  repetitions: number;
  intervalTargetType: 'distance' | 'time';
  intervalValue: number; // meters or seconds
  recoveryTargetType: 'distance' | 'time';
  recoveryValue: number; // meters or seconds
  targetPaceMin?: string;
  targetPaceMax?: string;
  warmupValue?: number; // meters or seconds
  warmupTargetType?: 'distance' | 'time';
  cooldownValue?: number; // meters or seconds
  cooldownTargetType?: 'distance' | 'time';
}

/**
 * Generates StructuredWorkout from structured builder parameters
 */
export function buildStructuredWorkout(params: IntervalBuilderParams): StructuredWorkout {
  const steps: WorkoutStep[] = [];

  // 1. Warm-up (Aquecimento)
  if (params.warmupValue && params.warmupValue > 0) {
    const isDist = params.warmupTargetType !== 'time';
    steps.push({
      id: `step-warmup-${Date.now()}`,
      name: 'Aquecimento',
      type: 'warmup',
      targetType: isDist ? 'distance' : 'time',
      targetValue: params.warmupValue,
      notes: isDist 
        ? `${params.warmupValue >= 1000 ? (params.warmupValue / 1000).toFixed(1) + ' km' : params.warmupValue + 'm'} ritmo leve`
        : `${Math.round(params.warmupValue / 60)} min ritmo leve`
    });
  }

  // 2. Repeats (Tiros e Recuperações)
  const reps = Math.max(1, Math.min(params.repetitions, 30));
  for (let i = 1; i <= reps; i++) {
    // Work / Tiro
    const isWorkDist = params.intervalTargetType === 'distance';
    const workName = `Tiro ${i}/${reps}`;
    const workNotes = isWorkDist
      ? `${params.intervalValue >= 1000 ? (params.intervalValue / 1000) + 'k' : params.intervalValue + 'm'}`
      : `${Math.round(params.intervalValue / 60)}min forte`;

    steps.push({
      id: `step-int-${i}-${Date.now()}`,
      name: workName,
      type: 'interval',
      targetType: isWorkDist ? 'distance' : 'time',
      targetValue: params.intervalValue,
      targetPaceMin: params.targetPaceMin?.trim() || undefined,
      targetPaceMax: params.targetPaceMax?.trim() || undefined,
      notes: workNotes,
      repeatIndex: i,
      repeatTotal: reps
    });

    // Recovery / Descanso
    const isRecDist = params.recoveryTargetType === 'distance';
    const recName = `Recuperação ${i}/${reps}`;
    const recNotes = isRecDist
      ? `${params.recoveryValue}m trote/caminhada`
      : `${Math.round(params.recoveryValue >= 60 ? params.recoveryValue / 60 : params.recoveryValue)}${params.recoveryValue >= 60 ? ' min' : 's'} trote/parado`;

    steps.push({
      id: `step-rec-${i}-${Date.now()}`,
      name: recName,
      type: 'recovery',
      targetType: isRecDist ? 'distance' : 'time',
      targetValue: params.recoveryValue,
      notes: recNotes,
      repeatIndex: i,
      repeatTotal: reps
    });
  }

  // 3. Cool-down (Desaquecimento)
  if (params.cooldownValue && params.cooldownValue > 0) {
    const isDist = params.cooldownTargetType !== 'time';
    steps.push({
      id: `step-cooldown-${Date.now()}`,
      name: 'Desaquecimento',
      type: 'cooldown',
      targetType: isDist ? 'distance' : 'time',
      targetValue: params.cooldownValue,
      notes: isDist 
        ? `${params.cooldownValue >= 1000 ? (params.cooldownValue / 1000).toFixed(1) + ' km' : params.cooldownValue + 'm'} regenerativo`
        : `${Math.round(params.cooldownValue / 60)} min regenerativo`
    });
  }

  // Calculate estimated total distance in km
  let estDistanceMeters = 0;
  for (const s of steps) {
    if (s.targetType === 'distance') {
      estDistanceMeters += s.targetValue;
    } else {
      // Estimate based on 5:30 pace for time steps
      estDistanceMeters += (s.targetValue / 330) * 1000;
    }
  }

  return {
    title: `${params.repetitions}x ${params.intervalTargetType === 'distance' ? params.intervalValue + 'm' : Math.round(params.intervalValue / 60) + 'min'}`,
    steps,
    totalDistanceEstimatedKm: Number((estDistanceMeters / 1000).toFixed(2))
  };
}

/**
 * Parses freeform natural language text from running coaches
 * Examples:
 * - "5x1000m rec 2min"
 * - "5x 1000m r: 2'"
 * - "2km aq + 6x400m rec 1min + 1km des"
 * - "8x 200m / rec 45s"
 * - "4x 2km rec 3min"
 * - "10x 1min forte / 1min leve"
 */
export function parseWorkoutTextToStructure(text: string): StructuredWorkout | null {
  if (!text || text.trim().length === 0) return null;
  const clean = text.toLowerCase().trim();

  // Pattern 1: Repeat interval search, e.g. "5x1000", "5x 1km", "8x400m", "10x 1min"
  const repeatRegex = /(\d{1,2})\s*x\s*(\d+(?:[.,]\d+)?)\s*(km|k|m|min|m|s|seg|'|")?/i;
  const repeatMatch = clean.match(repeatRegex);

  if (!repeatMatch) {
    return null; // Not an interval expression
  }

  const repetitions = parseInt(repeatMatch[1], 10);
  const rawIntervalNum = parseFloat(repeatMatch[2].replace(',', '.'));
  const intervalUnit = (repeatMatch[3] || 'm').toLowerCase();

  let intervalTargetType: 'distance' | 'time' = 'distance';
  let intervalValue = 0; // meters or seconds

  if (intervalUnit === 'km' || intervalUnit === 'k') {
    intervalTargetType = 'distance';
    intervalValue = Math.round(rawIntervalNum * 1000);
  } else if (intervalUnit === 'min' || intervalUnit === "'") {
    intervalTargetType = 'time';
    intervalValue = Math.round(rawIntervalNum * 60);
  } else if (intervalUnit === 's' || intervalUnit === 'seg' || intervalUnit === '"') {
    intervalTargetType = 'time';
    intervalValue = Math.round(rawIntervalNum);
  } else {
    // Default unit: if number <= 10, likely km (e.g. 5x 1) or minutes; if > 50, meters (e.g. 5x 1000, 5x 400)
    if (rawIntervalNum <= 10) {
      intervalTargetType = 'distance';
      intervalValue = Math.round(rawIntervalNum * 1000);
    } else {
      intervalTargetType = 'distance';
      intervalValue = Math.round(rawIntervalNum);
    }
  }

  // Recovery search, e.g. "rec 2min", "r: 90s", "desc 2'", "rec 400m", "intervalo 2m"
  const recRegex = /(?:rec|r:|desc|recup|intervalo|interval)\s*:?\s*(\d+(?:[.,]\d+)?)\s*(km|k|m|min|s|seg|'|")?/i;
  const recMatch = clean.match(recRegex);

  let recoveryTargetType: 'distance' | 'time' = 'time';
  let recoveryValue = 120; // Default 2 minutes

  if (recMatch) {
    const rawRecNum = parseFloat(recMatch[1].replace(',', '.'));
    const recUnit = (recMatch[2] || '').toLowerCase();

    if (recUnit === 'm') {
      recoveryTargetType = 'distance';
      recoveryValue = Math.round(rawRecNum);
    } else if (recUnit === 'km' || recUnit === 'k') {
      recoveryTargetType = 'distance';
      recoveryValue = Math.round(rawRecNum * 1000);
    } else if (recUnit === 's' || recUnit === 'seg' || recUnit === '"') {
      recoveryTargetType = 'time';
      recoveryValue = Math.round(rawRecNum);
    } else {
      // Default time in minutes if <= 10, or seconds if > 15
      if (rawRecNum <= 15) {
        recoveryTargetType = 'time';
        recoveryValue = Math.round(rawRecNum * 60);
      } else {
        recoveryTargetType = 'time';
        recoveryValue = Math.round(rawRecNum);
      }
    }
  }

  // Warm-up search (ex: "2km aq", "15min aq", "aquecimento 2km")
  let warmupValue = 0;
  let warmupTargetType: 'distance' | 'time' = 'distance';
  const warmupRegex = /(\d+(?:[.,]\d+)?)\s*(km|k|m|min)?\s*(?:aq|aquecimento|warm)/i;
  const warmupMatch = clean.match(warmupRegex);
  if (warmupMatch) {
    const wNum = parseFloat(warmupMatch[1].replace(',', '.'));
    const wUnit = (warmupMatch[2] || 'km').toLowerCase();
    if (wUnit === 'min') {
      warmupTargetType = 'time';
      warmupValue = Math.round(wNum * 60);
    } else if (wUnit === 'm') {
      warmupValue = Math.round(wNum);
    } else {
      warmupValue = Math.round(wNum * 1000);
    }
  }

  // Cool-down search (ex: "1km des", "10min des", "desaquecimento 1.5k")
  let cooldownValue = 0;
  let cooldownTargetType: 'distance' | 'time' = 'distance';
  const cooldownRegex = /(\d+(?:[.,]\d+)?)\s*(km|k|m|min)?\s*(?:des|desaq|desaquecimento|cool)/i;
  const cooldownMatch = clean.match(cooldownRegex);
  if (cooldownMatch) {
    const cNum = parseFloat(cooldownMatch[1].replace(',', '.'));
    const cUnit = (cooldownMatch[2] || 'km').toLowerCase();
    if (cUnit === 'min') {
      cooldownTargetType = 'time';
      cooldownValue = Math.round(cNum * 60);
    } else if (cUnit === 'm') {
      cooldownValue = Math.round(cNum);
    } else {
      cooldownValue = Math.round(cNum * 1000);
    }
  }

  return buildStructuredWorkout({
    repetitions,
    intervalTargetType,
    intervalValue,
    recoveryTargetType,
    recoveryValue,
    warmupValue: warmupValue > 0 ? warmupValue : undefined,
    warmupTargetType,
    cooldownValue: cooldownValue > 0 ? cooldownValue : undefined,
    cooldownTargetType
  });
}

/**
 * Human readable summary for display in badges and headers
 */
export function formatStructuredWorkoutSummary(structured?: StructuredWorkout): string {
  if (!structured || !structured.steps || structured.steps.length === 0) return '';
  if (structured.title) return structured.title;

  const intervals = structured.steps.filter(s => s.type === 'interval');
  if (intervals.length === 0) return `${structured.steps.length} etapas`;

  const firstInt = intervals[0];
  const unit = firstInt.targetType === 'distance' 
    ? `${firstInt.targetValue >= 1000 ? (firstInt.targetValue / 1000) + 'k' : firstInt.targetValue + 'm'}` 
    : `${Math.round(firstInt.targetValue / 60)}min`;

  const recoveries = structured.steps.filter(s => s.type === 'recovery');
  const firstRec = recoveries[0];
  let recText = '';
  if (firstRec) {
    recText = firstRec.targetType === 'time'
      ? `${Math.round(firstRec.targetValue >= 60 ? firstRec.targetValue / 60 : firstRec.targetValue)}${firstRec.targetValue >= 60 ? 'min' : 's'}`
      : `${firstRec.targetValue}m`;
  }

  return `${intervals.length}x ${unit}${recText ? ` (rec ${recText})` : ''}`;
}

/**
 * Returns formatted target display for a step
 */
export function formatStepTarget(step: WorkoutStep): string {
  if (step.targetType === 'distance') {
    return step.targetValue >= 1000 
      ? `${(step.targetValue / 1000).toFixed(1).replace('.0', '')} km` 
      : `${step.targetValue} m`;
  }
  if (step.targetType === 'time') {
    const mins = Math.floor(step.targetValue / 60);
    const secs = step.targetValue % 60;
    if (mins > 0 && secs > 0) return `${mins}m ${secs}s`;
    if (mins > 0) return `${mins} min`;
    return `${secs} seg`;
  }
  return 'Até apertar LAP';
}

import { StructuredWorkout, WorkoutStep, StepType, StepTargetType, TrainingPace } from '../types';
import { calculatePaces } from './calculations';

/**
 * Intelligent Running Workout Parser & Builder (Prescrição Detalhada)
 * Translates Brazilian coach shorthand into structured steps for execution with GPS
 */

/**
 * Maps workout types to corresponding physiological training zones
 */
export function getZoneForWorkoutType(workoutType?: string): 'Z1' | 'Z2' | 'Z3' | 'Z4' | 'Z5' {
  if (!workoutType) return 'Z4';
  const t = workoutType.toLowerCase().trim();

  if (t.includes('maratona')) return 'Z2';
  if (t.includes('limiar') || t.includes('tempo')) return 'Z3';
  if (t.includes('velocidade') || t.includes('sprint') || t.includes('tiro curto')) return 'Z5';
  if (t.includes('interval') || t.includes('tiro') || t.includes('vo2')) return 'Z4';
  if (t.includes('regen') || t.includes('recuper') || t.includes('leve')) return 'Z1';
  if (t.includes('long')) return 'Z2';
  if (t.includes('prova')) return 'Z3';

  return 'Z4';
}

/**
 * Retrieves the suggested target pace and all reference zones for a given workout type and athlete
 */
export function getSuggestedPaces(workoutType?: string, athletePaces?: TrainingPace[]) {
  const fallbackPaces = calculatePaces(38); // Baseline default VDOT 38
  const paces = (athletePaces && athletePaces.length > 0) ? athletePaces : fallbackPaces;

  const targetZone = getZoneForWorkoutType(workoutType);
  const matched = paces.find(p => p.zone === targetZone) || paces[3] || paces[0];

  return {
    targetZone,
    suggestedPace: matched,
    allPaces: paces
  };
}

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
export function parseWorkoutTextToStructure(
  text: string,
  workoutType?: string,
  athletePaces?: TrainingPace[]
): StructuredWorkout | null {
  if (!text || text.trim().length === 0) return null;
  const clean = text.toLowerCase().trim();

  // Pattern 1: Repeat interval search, e.g. "5x1000", "5x 1km", "8x400m", "10x 1min", "6x 1.000m"
  // Normalize thousand dots like 1.000m -> 1000m
  const normalizedText = clean.replace(/(\d+)\.(\d{3})/g, '$1$2');

  const repeatRegex = /(\d{1,2})\s*x\s*(\d+(?:[.,]\d+)?)\s*(km|k|metros|m|minutos|min|m|s|seg|segundos|'|")?/i;
  const repeatMatch = normalizedText.match(repeatRegex);

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
  } else if (intervalUnit === 'min' || intervalUnit === 'minutos' || intervalUnit === "'") {
    intervalTargetType = 'time';
    intervalValue = Math.round(rawIntervalNum * 60);
  } else if (intervalUnit === 's' || intervalUnit === 'seg' || intervalUnit === 'segundos' || intervalUnit === '"') {
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

  // Recovery search, e.g. "rec 2min", "r: 90s", "desc 2'", "rec 400m", "intervalo 2m", "recuperação de 2min"
  const recRegex = /(?:rec|r:|desc|recup|recuperação|intervalo|interval|pausa)\s*(?:de|:)?\s*(\d+(?:[.,]\d+)?)\s*(km|k|m|metros|min|minutos|s|seg|segundos|'|")?/i;
  const recMatch = normalizedText.match(recRegex);

  let recoveryTargetType: 'distance' | 'time' = 'time';
  let recoveryValue = 120; // Default 2 minutes

  if (recMatch) {
    const rawRecNum = parseFloat(recMatch[1].replace(',', '.'));
    const recUnit = (recMatch[2] || '').toLowerCase();

    if (recUnit === 'm' || recUnit === 'metros') {
      recoveryTargetType = 'distance';
      recoveryValue = Math.round(rawRecNum);
    } else if (recUnit === 'km' || recUnit === 'k') {
      recoveryTargetType = 'distance';
      recoveryValue = Math.round(rawRecNum * 1000);
    } else if (recUnit === 's' || recUnit === 'seg' || recUnit === 'segundos' || recUnit === '"') {
      recoveryTargetType = 'time';
      recoveryValue = Math.round(rawRecNum);
    } else {
      // Default time in minutes if <= 15, or seconds if > 15
      if (rawRecNum <= 15) {
        recoveryTargetType = 'time';
        recoveryValue = Math.round(rawRecNum * 60);
      } else {
        recoveryTargetType = 'time';
        recoveryValue = Math.round(rawRecNum);
      }
    }
  }

  // Warm-up search (ex: "2km aq", "2km de aquecimento", "15min aq", "10' aq", "aquecimento 15min", "aq: 2km", "aquecimento 10'")
  let warmupValue = 0;
  let warmupTargetType: 'distance' | 'time' = 'distance';
  const warmupRegex = /(?:(\d+(?:[.,]\d+)?)\s*(km|k|m|metros|min|minutos|'|")?\s*(?:de\s+)?(?:aq|aquecimento|warmup|warm)|(?:aq|aquecimento|warmup|warm)\s*(?:de|:)?\s*(\d+(?:[.,]\d+)?)\s*(km|k|m|metros|min|minutos|'|")?)/i;
  const warmupMatch = normalizedText.match(warmupRegex);
  if (warmupMatch) {
    const rawVal = warmupMatch[1] || warmupMatch[3];
    const rawUnit = (warmupMatch[2] || warmupMatch[4] || '').toLowerCase();
    if (rawVal) {
      const wNum = parseFloat(rawVal.replace(',', '.'));
      if (rawUnit === 'min' || rawUnit === 'minutos' || rawUnit === "'" || rawUnit === '"') {
        warmupTargetType = 'time';
        warmupValue = Math.round(wNum * 60);
      } else if (rawUnit === 'm' || rawUnit === 'metros') {
        warmupTargetType = 'distance';
        warmupValue = Math.round(wNum);
      } else if (rawUnit === 'km' || rawUnit === 'k') {
        warmupTargetType = 'distance';
        warmupValue = Math.round(wNum * 1000);
      } else {
        // If number is >= 5 and <= 30 without unit, assume minutes if aq
        if (wNum >= 5 && wNum <= 30) {
          warmupTargetType = 'time';
          warmupValue = Math.round(wNum * 60);
        } else if (wNum < 5) {
          warmupTargetType = 'distance';
          warmupValue = Math.round(wNum * 1000);
        } else {
          warmupTargetType = 'distance';
          warmupValue = Math.round(wNum);
        }
      }
    }
  }

  // Cool-down search (ex: "1km des", "1km de desaquecimento", "10min des", "5' des", "desaquecimento 10min", "des: 1km", "volta à calma 10min")
  let cooldownValue = 0;
  let cooldownTargetType: 'distance' | 'time' = 'distance';
  const cooldownRegex = /(?:(\d+(?:[.,]\d+)?)\s*(km|k|m|metros|min|minutos|'|")?\s*(?:de\s+)?(?:des|desaq|desaquecimento|volta à calma|volta a calma|cool|cooldown)|(?:des|desaq|desaquecimento|volta à calma|volta a calma|cool|cooldown)\s*(?:de|:)?\s*(\d+(?:[.,]\d+)?)\s*(km|k|m|metros|min|minutos|'|")?)/i;
  const cooldownMatch = normalizedText.match(cooldownRegex);
  if (cooldownMatch) {
    const rawVal = cooldownMatch[1] || cooldownMatch[3];
    const rawUnit = (cooldownMatch[2] || cooldownMatch[4] || '').toLowerCase();
    if (rawVal) {
      const cNum = parseFloat(rawVal.replace(',', '.'));
      if (rawUnit === 'min' || rawUnit === 'minutos' || rawUnit === "'" || rawUnit === '"') {
        cooldownTargetType = 'time';
        cooldownValue = Math.round(cNum * 60);
      } else if (rawUnit === 'm' || rawUnit === 'metros') {
        cooldownTargetType = 'distance';
        cooldownValue = Math.round(cNum);
      } else if (rawUnit === 'km' || rawUnit === 'k') {
        cooldownTargetType = 'distance';
        cooldownValue = Math.round(cNum * 1000);
      } else {
        if (cNum >= 5 && cNum <= 30) {
          cooldownTargetType = 'time';
          cooldownValue = Math.round(cNum * 60);
        } else if (cNum < 5) {
          cooldownTargetType = 'distance';
          cooldownValue = Math.round(cNum * 1000);
        } else {
          cooldownTargetType = 'distance';
          cooldownValue = Math.round(cNum);
        }
      }
    }
  }

  // Pace search in text (ex: "ritmo 04:15", "pace 04:10 a 04:25", "pace: 04:10-04:25", "p: 04:15", "ritmo: 04:20")
  let targetPaceMin: string | undefined;
  let targetPaceMax: string | undefined;
  const paceRegex = /(?:ritmo|pace|p:)\s*:?\s*(\d{1,2}[:.]\d{2})(?:\s*(?:a|-|ate|à)\s*(\d{1,2}[:.]\d{2}))?/i;
  const paceMatch = normalizedText.match(paceRegex);
  if (paceMatch) {
    targetPaceMin = paceMatch[1].replace('.', ':');
    if (paceMatch[2]) {
      targetPaceMax = paceMatch[2].replace('.', ':');
    }
  } else if (workoutType) {
    // If not explicitly mentioned in text, use suggested paces from athlete zones
    const suggested = getSuggestedPaces(workoutType, athletePaces).suggestedPace;
    if (suggested) {
      targetPaceMin = suggested.minPace;
      targetPaceMax = suggested.maxPace;
    }
  }

  return buildStructuredWorkout({
    repetitions,
    intervalTargetType,
    intervalValue,
    recoveryTargetType,
    recoveryValue,
    targetPaceMin,
    targetPaceMax,
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
 * Comprehensive human readable description of all phases (Aquecimento, Tiros, Intervalos, Desaquecimento)
 * Used to automatically populate the workout sheet description for print/export and mobile execution
 */
export function formatStructuredWorkoutFullDescription(structured?: StructuredWorkout): string {
  if (!structured || !structured.steps || structured.steps.length === 0) return '';
  if (structured.description && structured.description.trim().length > 0) return structured.description;

  const parts: string[] = [];

  // 1. Warmup
  const warmups = structured.steps.filter(s => s.type === 'warmup');
  if (warmups.length > 0) {
    const w = warmups[0];
    const wTarget = formatStepTarget(w);
    parts.push(`Aquecimento: ${wTarget} leve`);
  }

  // 2. Repeats / Intervals
  const intervals = structured.steps.filter(s => s.type === 'interval');
  if (intervals.length > 0) {
    const firstInt = intervals[0];
    const intTarget = formatStepTarget(firstInt);
    const count = intervals.length;

    // Pace
    let paceStr = '';
    if (firstInt.targetPaceMin) {
      paceStr = `@ ${firstInt.targetPaceMin}${firstInt.targetPaceMax ? `-${firstInt.targetPaceMax}` : ''}/km`;
    }

    // Recovery
    const recoveries = structured.steps.filter(s => s.type === 'recovery');
    let recStr = '';
    if (recoveries.length > 0) {
      recStr = `rec ${formatStepTarget(recoveries[0])}`;
    }

    const intervalFull = `${count}x (${intTarget}${paceStr ? ` ${paceStr}` : ''}${recStr ? ` | ${recStr}` : ''})`;
    parts.push(intervalFull);
  }

  // 3. Cooldown
  const cooldowns = structured.steps.filter(s => s.type === 'cooldown');
  if (cooldowns.length > 0) {
    const c = cooldowns[0];
    const cTarget = formatStepTarget(c);
    parts.push(`Desaquecimento: ${cTarget} regenerativo`);
  }

  return parts.join(' • ');
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

/**
 * Recalculates total distance and estimated duration for a structured workout
 */
export function recalculateStructuredWorkoutTotals(workout: StructuredWorkout): StructuredWorkout {
  let estDistMeters = 0;
  let estDurationSeconds = 0;

  for (const s of workout.steps) {
    if (s.targetType === 'distance') {
      estDistMeters += s.targetValue;
      // Assume baseline pace ~5:00 min/km (300s/km) if no duration
      estDurationSeconds += (s.targetValue / 1000) * 300;
    } else if (s.targetType === 'time') {
      estDurationSeconds += s.targetValue;
      // Assume distance equivalent
      estDistMeters += (s.targetValue / 300) * 1000;
    }
  }

  const updated: StructuredWorkout = {
    ...workout,
    totalDistanceEstimatedKm: estDistMeters > 0 ? Number((estDistMeters / 1000).toFixed(2)) : undefined,
    totalDurationEstimatedSeconds: estDurationSeconds > 0 ? Math.round(estDurationSeconds) : undefined,
  };
  updated.description = formatStructuredWorkoutFullDescription(updated);
  return updated;
}

/**
 * Toggles or removes warmup from a structured workout
 */
export function toggleWarmupInStructuredWorkout(workout: StructuredWorkout, include?: boolean, defaultMeters = 1500): StructuredWorkout {
  const hasWarmup = workout.steps.some(s => s.type === 'warmup');
  const shouldInclude = include !== undefined ? include : !hasWarmup;
  const stepsWithoutWarmup = workout.steps.filter(s => s.type !== 'warmup');

  if (!shouldInclude) {
    return recalculateStructuredWorkoutTotals({
      ...workout,
      steps: stepsWithoutWarmup
    });
  }

  // Add warmup to beginning
  const existingWarmup = workout.steps.find(s => s.type === 'warmup');
  const warmupStep: WorkoutStep = existingWarmup || {
    id: `step-warmup-${Date.now()}`,
    name: 'Aquecimento',
    type: 'warmup',
    targetType: 'distance',
    targetValue: defaultMeters,
    notes: `${(defaultMeters / 1000).toFixed(1)} km ritmo leve`
  };

  return recalculateStructuredWorkoutTotals({
    ...workout,
    steps: [warmupStep, ...stepsWithoutWarmup]
  });
}

/**
 * Toggles or removes cooldown from a structured workout
 */
export function toggleCooldownInStructuredWorkout(workout: StructuredWorkout, include?: boolean, defaultMeters = 1000): StructuredWorkout {
  const hasCooldown = workout.steps.some(s => s.type === 'cooldown');
  const shouldInclude = include !== undefined ? include : !hasCooldown;
  const stepsWithoutCooldown = workout.steps.filter(s => s.type !== 'cooldown');

  if (!shouldInclude) {
    return recalculateStructuredWorkoutTotals({
      ...workout,
      steps: stepsWithoutCooldown
    });
  }

  const existingCooldown = workout.steps.find(s => s.type === 'cooldown');
  const cooldownStep: WorkoutStep = existingCooldown || {
    id: `step-cooldown-${Date.now()}`,
    name: 'Desaquecimento',
    type: 'cooldown',
    targetType: 'distance',
    targetValue: defaultMeters,
    notes: `${(defaultMeters / 1000).toFixed(1)} km regenerativo`
  };

  return recalculateStructuredWorkoutTotals({
    ...workout,
    steps: [...stepsWithoutCooldown, cooldownStep]
  });
}

/**
 * Adjusts the interval count (repeats) in a structured workout by adding or removing one repeat
 */
export function adjustIntervalCountInStructuredWorkout(workout: StructuredWorkout, delta: number): StructuredWorkout {
  const warmupSteps = workout.steps.filter(s => s.type === 'warmup');
  const cooldownSteps = workout.steps.filter(s => s.type === 'cooldown');
  const otherSteps = workout.steps.filter(s => s.type !== 'warmup' && s.type !== 'cooldown');
  
  // Find sample interval and recovery
  const sampleInterval = otherSteps.find(s => s.type === 'interval');
  const sampleRecovery = otherSteps.find(s => s.type === 'recovery');

  if (!sampleInterval) return workout;

  // Group into pairs of (interval + optional recovery)
  const currentIntervals = otherSteps.filter(s => s.type === 'interval');
  const currentCount = currentIntervals.length;
  const newCount = Math.max(1, Math.min(30, currentCount + delta));

  if (newCount === currentCount) return workout;

  const newOtherSteps: WorkoutStep[] = [];
  for (let i = 1; i <= newCount; i++) {
    // Work
    newOtherSteps.push({
      ...sampleInterval,
      id: `step-int-${i}-${Date.now()}`,
      name: `Tiro ${i}/${newCount}`,
      repeatIndex: i,
      repeatTotal: newCount
    });

    // Recovery
    if (sampleRecovery) {
      newOtherSteps.push({
        ...sampleRecovery,
        id: `step-rec-${i}-${Date.now()}`,
        name: `Recuperação ${i}/${newCount}`,
        repeatIndex: i,
        repeatTotal: newCount
      });
    }
  }

  return recalculateStructuredWorkoutTotals({
    ...workout,
    steps: [...warmupSteps, ...newOtherSteps, ...cooldownSteps]
  });
}

/**
 * Increases or decreases all recovery/rest steps duration or distance
 */
export function adjustRestDurationInStructuredWorkout(workout: StructuredWorkout, deltaSeconds: number): StructuredWorkout {
  const updatedSteps = workout.steps.map(s => {
    if (s.type === 'recovery') {
      if (s.targetType === 'time') {
        const newVal = Math.max(15, s.targetValue + deltaSeconds);
        const mins = Math.floor(newVal / 60);
        const secs = newVal % 60;
        const notes = mins > 0 ? (secs > 0 ? `${mins}m ${secs}s trote/caminhada` : `${mins} min trote/caminhada`) : `${newVal}s trote/caminhada`;
        return {
          ...s,
          targetValue: newVal,
          notes
        };
      } else if (s.targetType === 'distance') {
        // adjust distance by ~50m per 30s delta
        const deltaMeters = Math.round((deltaSeconds / 30) * 50);
        const newVal = Math.max(50, s.targetValue + deltaMeters);
        return {
          ...s,
          targetValue: newVal,
          notes: `${newVal}m trote/caminhada`
        };
      }
    }
    return s;
  });

  return recalculateStructuredWorkoutTotals({
    ...workout,
    steps: updatedSteps
  });
}


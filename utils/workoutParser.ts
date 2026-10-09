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
  warmupPaceMin?: string;
  warmupPaceMax?: string;
  cooldownValue?: number; // meters or seconds
  cooldownTargetType?: 'distance' | 'time';
  cooldownPaceMin?: string;
  cooldownPaceMax?: string;
}

/**
 * Converts pace string "MM:SS" to total seconds
 */
export function parsePaceToSeconds(paceStr?: string): number {
  if (!paceStr || paceStr === '--:--' || paceStr === '00:00') return 0;
  const clean = paceStr.replace(/[^\d:]/g, '').trim();
  const parts = clean.split(':');
  if (parts.length !== 2) return 0;
  const m = parseInt(parts[0], 10);
  const s = parseInt(parts[1], 10);
  if (isNaN(m) || isNaN(s)) return 0;
  return m * 60 + s;
}

export interface PaceComplianceResult {
  status: 'in_range' | 'too_slow' | 'too_fast' | 'no_target' | 'no_data';
  label: string;
  diffText: string;
  diffSeconds: number;
  gaugePositionPct: number; // 0% (muito lento) -> 50% (faixa ideal) -> 100% (muito rápido)
  targetRangeText: string;
}

/**
 * Evaluates in real time if current running pace is within the target pace range
 * Running pace logic: fewer seconds = faster; more seconds = slower
 */
export function evaluatePaceCompliance(
  currentPaceStr: string,
  targetPaceMin?: string,
  targetPaceMax?: string
): PaceComplianceResult {
  const cur = parsePaceToSeconds(currentPaceStr);
  const targetText = targetPaceMin
    ? (targetPaceMax && targetPaceMax !== targetPaceMin ? `${targetPaceMin} a ${targetPaceMax}/km` : `${targetPaceMin}/km`)
    : 'Ritmo Livre';

  if (!cur || cur <= 0) {
    return {
      status: 'no_data',
      label: 'Sincronizando sinal GPS...',
      diffText: '',
      diffSeconds: 0,
      gaugePositionPct: 50,
      targetRangeText: targetText
    };
  }

  if (!targetPaceMin) {
    return {
      status: 'no_target',
      label: 'Ritmo Livre (Sem meta estrita)',
      diffText: 'Livre',
      diffSeconds: 0,
      gaugePositionPct: 50,
      targetRangeText: targetText
    };
  }

  const minSec = parsePaceToSeconds(targetPaceMin);
  const maxSec = targetPaceMax ? parsePaceToSeconds(targetPaceMax) : minSec + 15;
  const tolerance = 4; // 4s/km de tolerância suave

  if (cur >= minSec - tolerance && cur <= maxSec + tolerance) {
    const rangeSpan = Math.max(1, maxSec - minSec);
    const relOffset = (cur - minSec) / rangeSpan;
    const pct = Math.round(58 - relOffset * 16);
    return {
      status: 'in_range',
      label: 'Dentro do Ritmo Alvo',
      diffText: 'Na Faixa',
      diffSeconds: 0,
      gaugePositionPct: Math.max(42, Math.min(58, pct)),
      targetRangeText: targetText
    };
  } else if (cur > maxSec + tolerance) {
    const diff = cur - maxSec;
    const pct = Math.max(6, 40 - Math.round((diff / 45) * 34));
    return {
      status: 'too_slow',
      label: `Abaixo do Ritmo • Acelere +${diff}s/km`,
      diffText: `+${diff}s/km mais lento`,
      diffSeconds: diff,
      gaugePositionPct: pct,
      targetRangeText: targetText
    };
  } else {
    const diff = minSec - cur;
    const pct = Math.min(94, 60 + Math.round((diff / 45) * 34));
    return {
      status: 'too_fast',
      label: `Acima do Ritmo • Controle -${diff}s/km`,
      diffText: `-${diff}s/km mais rápido`,
      diffSeconds: diff,
      gaugePositionPct: pct,
      targetRangeText: targetText
    };
  }
}

/**
 * Generates StructuredWorkout from structured builder parameters
 */
export function buildStructuredWorkout(params: IntervalBuilderParams): StructuredWorkout {
  const steps: WorkoutStep[] = [];

  // 1. Warm-up (Aquecimento)
  if (params.warmupValue && params.warmupValue > 0) {
    const isDist = params.warmupTargetType !== 'time';
    const distText = isDist 
      ? (params.warmupValue >= 1000 ? (params.warmupValue / 1000).toFixed(1).replace('.0', '') + ' km' : params.warmupValue + 'm')
      : `${Math.round(params.warmupValue / 60)} min`;
    const paceNotes = params.warmupPaceMin 
      ? ` • Ritmo: ${params.warmupPaceMin}${params.warmupPaceMax ? ' a ' + params.warmupPaceMax : ''}/km`
      : ' • Ritmo leve';

    steps.push({
      id: `step-warmup-${Date.now()}`,
      name: 'Aquecimento',
      type: 'warmup',
      targetType: isDist ? 'distance' : 'time',
      targetValue: params.warmupValue,
      targetPaceMin: params.warmupPaceMin,
      targetPaceMax: params.warmupPaceMax,
      notes: `${distText}${paceNotes}`
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
    const paceNotes = params.targetPaceMin
      ? ` • Ritmo: ${params.targetPaceMin}${params.targetPaceMax ? ' a ' + params.targetPaceMax : ''}/km`
      : '';

    steps.push({
      id: `step-int-${i}-${Date.now()}`,
      name: workName,
      type: 'interval',
      targetType: isWorkDist ? 'distance' : 'time',
      targetValue: params.intervalValue,
      targetPaceMin: params.targetPaceMin?.trim() || undefined,
      targetPaceMax: params.targetPaceMax?.trim() || undefined,
      notes: `${workNotes}${paceNotes}`,
      repeatIndex: i,
      repeatTotal: reps
    });

    // Recovery / Descanso
    const isRecDist = params.recoveryTargetType === 'distance';
    const recName = `Recuperação ${i}/${reps}`;
    const recNotes = isRecDist
      ? `${params.recoveryValue}m trote/caminhada`
      : (() => {
          const m = Math.floor(params.recoveryValue / 60);
          const s = params.recoveryValue % 60;
          if (m > 0 && s > 0) return `${m}m ${s}s trote/caminhada`;
          if (m > 0) return `${m} min trote/caminhada`;
          return `${s}s trote/caminhada`;
        })();

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
    const distText = isDist 
      ? (params.cooldownValue >= 1000 ? (params.cooldownValue / 1000).toFixed(1).replace('.0', '') + ' km' : params.cooldownValue + 'm')
      : `${Math.round(params.cooldownValue / 60)} min`;
    const paceNotes = params.cooldownPaceMin 
      ? ` • Ritmo: ${params.cooldownPaceMin}${params.cooldownPaceMax ? ' a ' + params.cooldownPaceMax : ''}/km`
      : ' • Regenerativo';

    steps.push({
      id: `step-cooldown-${Date.now()}`,
      name: 'Desaquecimento',
      type: 'cooldown',
      targetType: isDist ? 'distance' : 'time',
      targetValue: params.cooldownValue,
      targetPaceMin: params.cooldownPaceMin,
      targetPaceMax: params.cooldownPaceMax,
      notes: `${distText}${paceNotes}`
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
 * - "Aq. 1k + 5x 500m com 1min e 30seg. De Rec."
 * - "5x1000m rec 2min"
 * - "2km aq + 6x400m rec 1min + 1km des"
 * - "Longão 18km"
 * - "Limiar 8km"
 */
export function parseWorkoutTextToStructure(
  text: string,
  workoutType?: string,
  athletePaces?: TrainingPace[]
): StructuredWorkout | null {
  if (!text || text.trim().length === 0) return null;
  const clean = text.toLowerCase().trim();

  // Normalize thousand dots like 1.000m -> 1000m
  const normalizedText = clean.replace(/(\d+)\.(\d{3})/g, '$1$2');

  const fallbackPaces = calculatePaces(38);
  const paces = (athletePaces && athletePaces.length > 0) ? athletePaces : fallbackPaces;
  const z1Pace = paces.find(p => p.zone === 'Z1') || paces[0];
  const workoutSuggested = getSuggestedPaces(workoutType, paces).suggestedPace;

  // Tokens for units (longer first so 'min' is matched before 'm', 'metros' before 'm')
  const unitGroup = "(km|k|minutos|min|segundos|seg|metros|m|s|'|\")";

  // 1. Warm-up search (ex: "Aq. 1k", "Aq: 1km", "Aquec. 1k", "1k aq.", "1.5km de aquec", "10min aq.")
  let warmupValue = 0;
  let warmupTargetType: 'distance' | 'time' = 'distance';

  const warmupPrefixRegex = new RegExp("(?:aq(?:uec(?:imento)?)?|warm(?:up)?)\\.?\\s*(?:de|:|-)?\\s*(\\d+(?:[.,]\\d+)?)\\s*" + unitGroup + "?", "i");
  const warmupPostfixRegex = new RegExp("(\\d+(?:[.,]\\d+)?)\\s*" + unitGroup + "?\\s*(?:de\\s+)?(?:aq(?:uec(?:imento)?)?|warm(?:up)?)\\.?", "i");

  let warmupMatch = normalizedText.match(warmupPostfixRegex);
  if (!warmupMatch) {
    warmupMatch = normalizedText.match(warmupPrefixRegex);
  }

  if (warmupMatch) {
    const rawVal = warmupMatch[1];
    const rawUnit = (warmupMatch[2] || '').toLowerCase();
    if (rawVal) {
      const wNum = parseFloat(rawVal.replace(',', '.'));
      if (rawUnit === 'min' || rawUnit === 'minutos' || rawUnit === "'" || rawUnit === '"') {
        warmupTargetType = 'time';
        warmupValue = Math.round(wNum * 60);
      } else if (rawUnit === 'km' || rawUnit === 'k') {
        warmupTargetType = 'distance';
        warmupValue = Math.round(wNum * 1000);
      } else if (rawUnit === 'm' || rawUnit === 'metros') {
        warmupTargetType = 'distance';
        warmupValue = Math.round(wNum);
      } else {
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

  // 2. Cool-down search (ex: "Des. 1k", "1k des.", "Desaq. 1km", "10min des.", "5' des.")
  let cooldownValue = 0;
  let cooldownTargetType: 'distance' | 'time' = 'distance';

  const cooldownPrefixRegex = new RegExp("(?:des(?:aq(?:uec(?:imento)?)?)?|cool(?:down)?|volta [àa] calma)\\.?\\s*(?:de|:|-)?\\s*(\\d+(?:[.,]\\d+)?)\\s*" + unitGroup + "?", "i");
  const cooldownPostfixRegex = new RegExp("(\\d+(?:[.,]\\d+)?)\\s*" + unitGroup + "?\\s*(?:de\\s+)?(?:des(?:aq(?:uec(?:imento)?)?)?|cool(?:down)?|volta [àa] calma)\\.?", "i");

  let cooldownMatch = normalizedText.match(cooldownPostfixRegex);
  if (!cooldownMatch) {
    cooldownMatch = normalizedText.match(cooldownPrefixRegex);
  }

  if (cooldownMatch) {
    const rawVal = cooldownMatch[1];
    const rawUnit = (cooldownMatch[2] || '').toLowerCase();
    if (rawVal) {
      const cNum = parseFloat(rawVal.replace(',', '.'));
      if (rawUnit === 'min' || rawUnit === 'minutos' || rawUnit === "'" || rawUnit === '"') {
        cooldownTargetType = 'time';
        cooldownValue = Math.round(cNum * 60);
      } else if (rawUnit === 'km' || rawUnit === 'k') {
        cooldownTargetType = 'distance';
        cooldownValue = Math.round(cNum * 1000);
      } else if (rawUnit === 'm' || rawUnit === 'metros') {
        cooldownTargetType = 'distance';
        cooldownValue = Math.round(cNum);
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

  // 3. Repeat interval search, e.g. "5x1000", "5x 1km", "8x400m", "10x 1min", "5x 500m"
  const repeatRegex = /(\d{1,2})\s*x\s*(\d+(?:[.,]\d+)?)\s*(km|k|minutos|min|segundos|seg|metros|m|s|'|")?/i;
  const repeatMatch = normalizedText.match(repeatRegex);

  // If there are NO interval repeats, check if this is a continuous workout (Longão, Limiar, Maratona, etc.)
  if (!repeatMatch) {
    const continuousDistRegex = /(\d+(?:[.,]\d+)?)\s*(km|k|metros|m)/i;
    const contMatch = normalizedText.match(continuousDistRegex);

    if (contMatch) {
      const rawVal = parseFloat(contMatch[1].replace(',', '.'));
      const unit = contMatch[2].toLowerCase();
      const distMeters = (unit === 'km' || unit === 'k') ? Math.round(rawVal * 1000) : Math.round(rawVal);

      const targetPace = workoutSuggested;
      const stepName = workoutType ? `${workoutType}` : 'Corrida Contínua';
      const mainStep: WorkoutStep = {
        id: `step-cont-${Date.now()}`,
        name: stepName,
        type: 'interval',
        targetType: 'distance',
        targetValue: distMeters,
        targetPaceMin: targetPace?.minPace,
        targetPaceMax: targetPace?.maxPace,
        notes: `${(distMeters / 1000).toFixed(1).replace('.0', '')} km • Ritmo Alvo: ${targetPace?.minPace || ''}${targetPace?.maxPace ? ' a ' + targetPace.maxPace : ''}/km (${targetPace?.name || workoutType || ''})`
      };

      const steps: WorkoutStep[] = [];
      if (warmupValue > 0) {
        steps.push({
          id: `step-warmup-${Date.now()}`,
          name: 'Aquecimento',
          type: 'warmup',
          targetType: warmupTargetType,
          targetValue: warmupValue,
          targetPaceMin: z1Pace?.minPace,
          targetPaceMax: z1Pace?.maxPace,
          notes: `${warmupTargetType === 'distance' ? (warmupValue / 1000).toFixed(1).replace('.0', '') + ' km' : Math.round(warmupValue / 60) + ' min'} • Ritmo Leve (Z1: ${z1Pace?.minPace} - ${z1Pace?.maxPace}/km)`
        });
      }
      steps.push(mainStep);
      if (cooldownValue > 0) {
        steps.push({
          id: `step-cooldown-${Date.now()}`,
          name: 'Desaquecimento',
          type: 'cooldown',
          targetType: cooldownTargetType,
          targetValue: cooldownValue,
          targetPaceMin: z1Pace?.minPace,
          targetPaceMax: z1Pace?.maxPace,
          notes: `${cooldownTargetType === 'distance' ? (cooldownValue / 1000).toFixed(1).replace('.0', '') + ' km' : Math.round(cooldownValue / 60) + ' min'} • Regenerativo (Z1: ${z1Pace?.minPace} - ${z1Pace?.maxPace}/km)`
        });
      }

      return {
        title: `${workoutType || 'Corrida'} ${(distMeters / 1000).toFixed(1).replace('.0', '')}km`,
        steps,
        totalDistanceEstimatedKm: Number(((distMeters + (warmupTargetType === 'distance' ? warmupValue : 0) + (cooldownTargetType === 'distance' ? cooldownValue : 0)) / 1000).toFixed(2))
      };
    }

    return null;
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
    if (rawIntervalNum <= 10) {
      intervalTargetType = 'distance';
      intervalValue = Math.round(rawIntervalNum * 1000);
    } else {
      intervalTargetType = 'distance';
      intervalValue = Math.round(rawIntervalNum);
    }
  }

  // 4. Recovery search (composite min+sec or single value with prefix or postfix)
  // e.g.: "com 1min e 30seg. De Rec.", "rec 1min e 30s", "1'30\" de rec", "rec 90s", "rec 2min"
  let recoveryTargetType: 'distance' | 'time' = 'time';
  let recoveryValue = 90; // Default 90 seconds (1min 30s)

  const compAfter = /(?:com|c\/)?\s*(\d{1,2})\s*(?:min|minutos|m|'|:)\s*(?:e|\+)?\s*(\d{1,2})\s*(?:seg|segundos|s|"|\.)*?\s*(?:de\s+)?(?:rec|r:|desc|recup|recuperação|intervalo|interval|pausa)\.?/i;
  const compBefore = /(?:com|c\/)?\s*(?:rec|r:|desc|recup|recuperação|intervalo|interval|pausa)\.?\s*(?:de|:)?\s*(\d{1,2})\s*(?:min|minutos|m|'|:)\s*(?:e|\+)?\s*(\d{1,2})\s*(?:seg|segundos|s|")?/i;

  let recComp = normalizedText.match(compAfter);
  if (!recComp) {
    recComp = normalizedText.match(compBefore);
  }

  if (recComp) {
    const mins = parseInt(recComp[1], 10);
    const secs = parseInt(recComp[2], 10);
    recoveryTargetType = 'time';
    recoveryValue = mins * 60 + secs;
  } else {
    const recSingleAfter = /(?:com|c\/)?\s*(\d+(?:[.,]\d+)?)\s*(km|k|minutos|min|segundos|seg|metros|m|s|'|")?\s*(?:de\s+)?(?:rec|r:|desc|recup|recuperação|intervalo|interval|pausa)\.?/i;
    const recSingleBefore = /(?:com|c\/)?\s*(?:rec|r:|desc|recup|recuperação|intervalo|interval|pausa)\.?\s*(?:de|:)?\s*(\d+(?:[.,]\d+)?)\s*(km|k|minutos|min|segundos|seg|metros|m|s|'|")?/i;

    let recSingle = normalizedText.match(recSingleAfter);
    if (!recSingle) {
      recSingle = normalizedText.match(recSingleBefore);
    }

    if (recSingle) {
      const rawRecNum = parseFloat(recSingle[1].replace(',', '.'));
      const recUnit = (recSingle[2] || '').toLowerCase();

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
        if (rawRecNum <= 15) {
          recoveryTargetType = 'time';
          recoveryValue = Math.round(rawRecNum * 60);
        } else {
          recoveryTargetType = 'time';
          recoveryValue = Math.round(rawRecNum);
        }
      }
    }
  }

  // 5. Pace search in text (ex: "ritmo 04:15", "pace 04:10 a 04:25", "pace: 04:10-04:25", "p: 04:15")
  let targetPaceMin: string | undefined;
  let targetPaceMax: string | undefined;
  const paceRegex = /(?:ritmo|pace|p:)\s*:?\s*(\d{1,2}[:.]\d{2})(?:\s*(?:a|-|ate|à)\s*(\d{1,2}[:.]\d{2}))?/i;
  const paceMatch = normalizedText.match(paceRegex);
  if (paceMatch) {
    targetPaceMin = paceMatch[1].replace('.', ':');
    if (paceMatch[2]) {
      targetPaceMax = paceMatch[2].replace('.', ':');
    }
  } else if (workoutSuggested) {
    // If not explicitly mentioned in text, use suggested paces from athlete zones
    targetPaceMin = workoutSuggested.minPace;
    targetPaceMax = workoutSuggested.maxPace;
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
    warmupPaceMin: z1Pace?.minPace,
    warmupPaceMax: z1Pace?.maxPace,
    cooldownValue: cooldownValue > 0 ? cooldownValue : undefined,
    cooldownTargetType,
    cooldownPaceMin: z1Pace?.minPace,
    cooldownPaceMax: z1Pace?.maxPace
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


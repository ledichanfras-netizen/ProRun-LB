import { FreeRun, TrainingWeek } from '../types';

import { getTrainingActivities } from './trainingActivities';
import { getAppNow, getLocalDateString, getWorkoutDateString, parseDateString } from './time';

// Função para obter o RPE padrão se não estiver preenchido
export function getDefaultRpeForType(type: string): number {
  switch (type) {
    case 'Regenerativo': return 3;
    case 'Longão': return 5;
    case 'Limiar': return 7;
    case 'Intervalado': return 8;
    case 'Maratona': return 6;
    case 'Velocidade': return 9;
    case 'Transição': return 6;
    case 'Ciclismo': return 5;
    case 'Natação': return 6;
    case 'Fortalecimento': return 4;
    case 'Prova': return 9;
    default: return 5;
  }
}

// Estimar o pace (ritmo) em minutos por km com base no VDOT e no tipo de treino
export function getEstimatedPace(type: string, vdot: number): number {
  if (type === 'Ciclismo') {
    return 2.0; // 30 km/h -> 2.0 min/km
  }
  if (type === 'Natação') {
    return 20.0; // 1000m em 20 min -> 20.0 min/km
  }
  if (type === 'Fortalecimento' || type === 'Descanso') {
    return 0;
  }

  // Para corrida, vamos calcular o pace leve de rodagem de acordo com o VDOT do atleta.
  // Regressão simples baseada na fisiologia Daniels VDOT:
  // VDOT 30: Pace de rodagem ~ 7:30 min/km
  // VDOT 45: Pace de rodagem ~ 5:40 min/km
  // VDOT 60: Pace de rodagem ~ 4:20 min/km
  const basePace = 10.5 - (vdot * 0.11);
  const clampedBase = Math.max(3.5, Math.min(9.0, basePace));

  switch (type) {
    case 'Regenerativo':
      return clampedBase * 1.15; // 15% mais lento
    case 'Longão':
      return clampedBase * 1.05; // 5% mais lento
    case 'Limiar':
      return clampedBase * 0.85; // 15% mais rápido
    case 'Maratona':
      return clampedBase * 0.90; // 10% mais rápido (ritmo maratona)
    case 'Intervalado':
    case 'Velocidade':
      return clampedBase * 0.75; // 25% mais rápido
    case 'Prova':
      return clampedBase * 0.82; // 18% mais rápido
    default:
      return clampedBase;
  }
}

// Converte string de duração (ex: "45:00", "01:00:00", "45") em minutos
export function parseWorkoutDurationToMinutes(dur?: string | number): number {
  if (dur === undefined || dur === null || dur === '') return 0;
  if (typeof dur === 'number') return dur > 0 ? dur : 0;
  const clean = String(dur).trim().replace(/[^0-9:.,]/g, '');
  if (!clean) return 0;
  if (clean.includes(':')) {
    const parts = clean.split(':').map(Number);
    if (parts.length === 3) {
      return (parts[0] || 0) * 60 + (parts[1] || 0) + (parts[2] || 0) / 60;
    }
    if (parts.length === 2) {
      return (parts[0] || 0) + (parts[1] || 0) / 60;
    }
  }
  const num = parseFloat(clean.replace(',', '.'));
  return isNaN(num) || num <= 0 ? 0 : num;
}

// Calcula o TRIMP (ou carga de treino) baseado no sRPE (session RPE)
export function calculateWorkoutTRIMP(workout: {
  type: string;
  distance?: number;
  actualDistance?: number;
  durationMinutes?: number;
  actualDuration?: string;
  rpe?: number;
  completed?: boolean;
  gpsRoute?: { totalDurationSeconds?: number };
}, vdot?: number): number {
  if (!workout.completed || workout.type === 'Descanso') return 0;

  const dist = workout.actualDistance ?? workout.distance ?? 0;
  const rpe = typeof workout.rpe === 'number' && Number.isFinite(workout.rpe) && workout.rpe >= 0 && workout.rpe <= 10 ? workout.rpe : getDefaultRpeForType(workout.type);

  const explicitDurationMin = parseWorkoutDurationToMinutes(workout.actualDuration) || ((workout.gpsRoute?.totalDurationSeconds || 0) / 60) || (workout.durationMinutes && workout.durationMinutes > 0 ? workout.durationMinutes : 0);

  let durationMin = 0;
  const isStrength = Boolean(workout.type && (workout.type.toLowerCase().includes('fortalecimento') || workout.type.toLowerCase().includes('força') || workout.type.toLowerCase().includes('mobilidade')));

  if (isStrength) {
    durationMin = explicitDurationMin > 0 ? explicitDurationMin : 45;
  } else if (explicitDurationMin > 0) {
    durationMin = explicitDurationMin;
  } else if (dist > 0) {
    const pace = getEstimatedPace(workout.type, vdot ?? 45);
    durationMin = dist * pace;
  } else {
    durationMin = 30;
  }

  // Carga sRPE = Duração (minutos) * RPE (1-10)
  return Math.round(durationMin * rpe);
}

export interface DailyStressMetrics {
  dayIndex: number;
  date: string;
  dateStr: string;
  weekNumber: number;
  workoutType?: string;
  trimp: number;
  ctl: number;
  atl: number;
  tsb: number;
}

export function calculateATL_CTL_TSB(
  weeks: TrainingWeek[], vdot: number, startDateStr?: string, freeRuns: FreeRun[] = [], now = getAppNow()
): DailyStressMetrics[] {
  const activities = getTrainingActivities({weeks, startDate: startDateStr, freeRuns});
  if (!activities.length) return [];
  const buckets = new Map<string, typeof activities>();
  for (const activity of activities) buckets.set(activity.date, [...(buckets.get(activity.date) || []), activity]);
  const dates = [...buckets.keys()].sort();
  const start = parseDateString(dates[0]);
  const today = getLocalDateString(now);
  const end = dates[dates.length-1] > today ? dates[dates.length-1] : today;
  const timeline: DailyStressMetrics[] = [];
  let prevCTL = 0, prevATL = 0;
  const anchor = startDateStr || dates[0];
  for (let day = new Date(start), index = 0; getLocalDateString(day) <= end; day.setDate(day.getDate()+1), index++) {
    const date = getLocalDateString(day);
    const workouts = buckets.get(date) || [];
    const trimp = workouts.reduce((sum, workout)=>sum+calculateWorkoutTRIMP(workout, vdot), 0);
    const ctl = prevCTL + (trimp-prevCTL)/42;
    const atl = prevATL + (trimp-prevATL)/7;
    const weekNumber = Math.floor((parseDateString(date).getTime()-parseDateString(getWorkoutDateString(anchor,0,0)).getTime())/604800000)+1;
    timeline.push({dayIndex:index, date, dateStr: day.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}), weekNumber,
      workoutType: workouts.filter(w=>w.completed && w.type !== 'Descanso').map(w=>w.isFreeRun ? 'Corrida livre' : w.type).join(' + ') || undefined,
      trimp, ctl:Math.round(ctl*10)/10, atl:Math.round(atl*10)/10, tsb:Math.round((ctl-atl)*10)/10});
    prevCTL=ctl;prevATL=atl;
  }
  return timeline;
}

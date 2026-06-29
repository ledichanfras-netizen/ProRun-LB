import { TrainingWeek } from '../types';

// Função para obter o RPE padrão se não estiver preenchido
export function getDefaultRpeForType(type: string): number {
  switch (type) {
    case 'Regenerativo': return 3;
    case 'Longão': return 5;
    case 'Limiar': return 7;
    case 'Intervalado': return 8;
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
    case 'Intervalado':
    case 'Velocidade':
      return clampedBase * 0.75; // 25% mais rápido
    case 'Prova':
      return clampedBase * 0.82; // 18% mais rápido
    default:
      return clampedBase;
  }
}

// Calcula o TRIMP (ou carga de treino) baseado no sRPE (session RPE)
export function calculateWorkoutTRIMP(workout: {
  type: string;
  distance?: number;
  actualDistance?: number;
  rpe?: number;
  completed?: boolean;
}, vdot?: number): number {
  if (!workout.completed || workout.type === 'Descanso') return 0;

  const dist = workout.actualDistance ?? workout.distance ?? 0;
  const rpe = workout.rpe ?? getDefaultRpeForType(workout.type);

  let durationMin = 0;
  if (dist > 0) {
    const pace = getEstimatedPace(workout.type, vdot ?? 45);
    durationMin = dist * pace;
  } else {
    // Treinos sem distância (ex: fortalecimento)
    if (workout.type === 'Fortalecimento') {
      durationMin = 45; // 45 minutos padrão
    } else {
      durationMin = 30; // 30 minutos padrão
    }
  }

  // Carga sRPE = Duração (minutos) * RPE (1-10)
  return Math.round(durationMin * rpe);
}

export interface DailyStressMetrics {
  dayIndex: number;
  dateStr: string;
  weekNumber: number;
  workoutType?: string;
  trimp: number;
  ctl: number;
  atl: number;
  tsb: number;
}

export function calculateATL_CTL_TSB(
  weeks: TrainingWeek[],
  vdot: number,
  startDateStr?: string
): DailyStressMetrics[] {
  const dailyWorkouts: {
    weekNumber: number;
    dayName: string;
    dayIndexInWeek: number;
    workout: any;
  }[] = [];

  const sortedWeeks = [...weeks].sort((a, b) => a.weekNumber - b.weekNumber);

  sortedWeeks.forEach((week) => {
    week.workouts.forEach((workout, idx) => {
      dailyWorkouts.push({
        weekNumber: week.weekNumber,
        dayName: workout.day,
        dayIndexInWeek: idx,
        workout,
      });
    });
  });

  const timeline: DailyStressMetrics[] = [];
  let prevCTL = 0;
  let prevATL = 0;

  const startDate = startDateStr ? new Date(startDateStr) : new Date();

  dailyWorkouts.forEach((day, index) => {
    const trimp = calculateWorkoutTRIMP(day.workout, vdot);

    // Fórmulas exponenciais clássicas (EWMA):
    // CTL (42 dias): CTL_t = CTL_t-1 + (TRIMP_t - CTL_t-1) / 42
    // ATL (7 dias): ATL_t = ATL_t-1 + (TRIMP_t - ATL_t-1) / 7
    const currentCTL = prevCTL + (trimp - prevCTL) / 42;
    const currentATL = prevATL + (trimp - prevATL) / 7;
    const currentTSB = currentCTL - currentATL;

    const dateObj = new Date(startDate);
    dateObj.setDate(startDate.getDate() + index);
    const dateStr = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    timeline.push({
      dayIndex: index,
      dateStr,
      weekNumber: day.weekNumber,
      workoutType: day.workout.completed ? day.workout.type : undefined,
      trimp,
      ctl: Math.round(currentCTL * 10) / 10,
      atl: Math.round(currentATL * 10) / 10,
      tsb: Math.round(currentTSB * 10) / 10,
    });

    prevCTL = currentCTL;
    prevATL = currentATL;
  });

  return timeline;
}

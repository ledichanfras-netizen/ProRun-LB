import type { Athlete, AthletePlan, RunningShoe, ShoeCategory } from '../types';
import { activityDistance, getTrainingActivities } from './trainingActivities';

export const SHOE_CATEGORY_META: Record<ShoeCategory, {
  label: string;
  shortLabel: string;
  description: string;
  recommendedFor: string[];
  badgeClass: string;
}> = {
  daily: {
    label: 'Rodagem / Uso Diário',
    shortLabel: 'Rodagem',
    description: 'Versátil para rodagens, longões e corridas livres do dia a dia.',
    recommendedFor: ['Rodagem', 'Longão', 'Maratona', 'Corrida livre', 'Corrida', 'Transição'],
    badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  speed: {
    label: 'Velocidade / Treino Rápido',
    shortLabel: 'Velocidade',
    description: 'Mais leve e responsivo para tiros, intervalados e treinos de limiar.',
    recommendedFor: ['Intervalado', 'Limiar', 'Velocidade'],
    badgeClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  race: {
    label: 'Competição / Placa',
    shortLabel: 'Competição',
    description: 'Máxima performance para dias de prova e testes de ritmo.',
    recommendedFor: ['Prova'],
    badgeClass: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  },
  recovery: {
    label: 'Regenerativo / Máx. Amortecimento',
    shortLabel: 'Regenerativo',
    description: 'Proteção e conforto extra para treinos leves e recuperação.',
    recommendedFor: ['Regenerativo'],
    badgeClass: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  },
  trail: {
    label: 'Trilha / Terreno Misto',
    shortLabel: 'Trilha',
    description: 'Maior aderência e tração para terra, cascalho ou montanha.',
    recommendedFor: [],
    badgeClass: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  },
};

export const SHOE_BRAND_PRESETS = [
  'Olympikus',
  'Asics',
  'Nike',
  'Adidas',
  'New Balance',
  'Mizuno',
  'Saucony',
  'Hoka',
  'Fila',
  'On',
  'Brooks',
  'Puma',
];

export const SHOE_COLOR_META: Record<NonNullable<RunningShoe['color']>, { label: string; dotClass: string; accentClass: string }> = {
  emerald: { label: 'Verde', dotClass: 'bg-emerald-500', accentClass: 'border-emerald-500/40' },
  amber: { label: 'Laranja', dotClass: 'bg-amber-500', accentClass: 'border-amber-500/40' },
  sky: { label: 'Azul', dotClass: 'bg-sky-500', accentClass: 'border-sky-500/40' },
  violet: { label: 'Roxo', dotClass: 'bg-violet-500', accentClass: 'border-violet-500/40' },
  rose: { label: 'Coral', dotClass: 'bg-rose-500', accentClass: 'border-rose-500/40' },
};

export const isRunningShoeWorkout = (workoutType?: string): boolean => {
  if (!workoutType) return true;
  const normalized = workoutType.trim().toLowerCase();
  return !(
    normalized === 'descanso' ||
    normalized.includes('fortalecimento') ||
    normalized.includes('força') ||
    normalized.includes('mobilidade') ||
    normalized.includes('natação') ||
    normalized.includes('natacao') ||
    normalized.includes('ciclismo')
  );
};

export const formatShoeLabel = (shoe?: Pick<RunningShoe, 'brand' | 'name'> | null): string => {
  if (!shoe) return '';
  const brand = (shoe.brand || '').trim();
  const name = (shoe.name || '').trim();
  if (!brand) return name;
  if (!name) return brand;
  if (name.toLowerCase().startsWith(brand.toLowerCase())) return name;
  return `${brand} ${name}`;
};

export const getSuggestedCategoryForWorkout = (workoutType?: string): ShoeCategory => {
  const normalized = (workoutType || '').trim().toLowerCase();
  if (normalized.includes('prova')) return 'race';
  if (normalized.includes('interval') || normalized.includes('limiar') || normalized.includes('velocidade') || normalized.includes('tiro')) {
    return 'speed';
  }
  if (normalized.includes('regenerativ')) return 'recovery';
  if (normalized.includes('trilha') || normalized.includes('trail')) return 'trail';
  return 'daily';
};

export const suggestShoeForWorkout = (
  shoes: RunningShoe[] | undefined,
  workoutType?: string
): { shoe: RunningShoe | null; reason: 'category' | 'default' | 'first' | null } => {
  const activeShoes = (shoes || []).filter(s => !s.retired);
  if (activeShoes.length === 0) return { shoe: null, reason: null };

  const targetCategory = getSuggestedCategoryForWorkout(workoutType);
  const categoryMatches = activeShoes.filter(s => s.category === targetCategory);
  if (categoryMatches.length > 0) {
    const preferred = categoryMatches.find(s => s.isDefault) || categoryMatches[0];
    return { shoe: preferred, reason: 'category' };
  }

  const defaultShoe = activeShoes.find(s => s.isDefault);
  if (defaultShoe) return { shoe: defaultShoe, reason: 'default' };

  return { shoe: activeShoes[0], reason: 'first' };
};

export interface ShoeActivityRecord {
  id: string;
  date: string;
  title: string;
  type: string;
  distanceKm: number;
  duration?: string;
  isFreeRun: boolean;
}

export interface ShoeStats {
  appKm: number;
  totalKm: number;
  workoutsCount: number;
  usagePercent: number;
  remainingKm: number;
  status: 'ok' | 'warning' | 'replace';
  activities: ShoeActivityRecord[];
}

export const calculateShoeStats = (
  shoe: RunningShoe,
  plan?: AthletePlan | null,
  archivedPlans?: Athlete['archivedPlans']
): ShoeStats => {
  const activities: ShoeActivityRecord[] = [];
  let appKm = 0;

  // 1. Current plan weeks + free runs
  const currentActivities = getTrainingActivities(plan);
  for (const act of currentActivities) {
    if (!act.completed || act.type === 'Descanso' || act.shoeId !== shoe.id) continue;
    const km = activityDistance(act);
    appKm += km;
    activities.push({
      id: act.activityId,
      date: act.date,
      title: act.customDescription || act.type || 'Corrida',
      type: act.type,
      distanceKm: km,
      duration: act.actualDuration,
      isFreeRun: act.isFreeRun,
    });
  }

  // 2. Archived cycles (if any workout was tracked with this shoe before archiving)
  if (archivedPlans && archivedPlans.length > 0) {
    archivedPlans.forEach((archived, aIdx) => {
      (archived.weeks || []).forEach((week, wIdx) => {
        (week.workouts || []).forEach((workout, dIdx) => {
          if (!workout.completed || workout.type === 'Descanso' || workout.shoeId !== shoe.id) return;
          const km = activityDistance(workout);
          appKm += km;
          activities.push({
            id: `archived:${archived.id || aIdx}:${wIdx}:${dIdx}`,
            date: workout.date || archived.endDate || archived.startDate || '',
            title: workout.customDescription || workout.type || 'Corrida',
            type: workout.type,
            distanceKm: km,
            duration: workout.actualDuration,
            isFreeRun: false,
          });
        });
      });
    });
  }

  const initialKm = Math.max(0, Number(shoe.initialKm) || 0);
  const maxKm = Math.max(1, Number(shoe.maxKm) || 600);
  const totalKm = Math.round((initialKm + appKm) * 100) / 100;
  const usagePercent = Math.round((totalKm / maxKm) * 100);
  const remainingKm = Math.max(0, Math.round((maxKm - totalKm) * 10) / 10);
  const status: ShoeStats['status'] =
    usagePercent >= 100 ? 'replace' : usagePercent >= 80 ? 'warning' : 'ok';

  activities.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return {
    appKm: Math.round(appKm * 100) / 100,
    totalKm,
    workoutsCount: activities.length,
    usagePercent,
    remainingKm,
    status,
    activities,
  };
};

export const getNewShoeWearAlert = (
  shoe: RunningShoe,
  stats: ShoeStats
): { level: '80' | '100'; title: string; message: string; type: 'warning' | 'critical' } | null => {
  if (!shoe.maxKm || shoe.maxKm <= 0 || shoe.retired) return null;
  const label = formatShoeLabel(shoe);

  if (stats.usagePercent >= 100 && shoe.alertedLevel !== '100') {
    return {
      level: '100',
      title: `Hora de trocar o tênis: ${label}`,
      message: `${label} atingiu ${stats.totalKm.toFixed(1).replace('.', ',')} km (${stats.usagePercent}% da meta de ${shoe.maxKm} km). Considere aposentar este par.`,
      type: 'critical',
    };
  }

  if (stats.usagePercent >= 80 && stats.usagePercent < 100 && !shoe.alertedLevel) {
    return {
      level: '80',
      title: `Desgaste em ${stats.usagePercent}%: ${label}`,
      message: `${label} chegou a ${stats.totalKm.toFixed(1).replace('.', ',')} km de ${shoe.maxKm} km. Faltam ${stats.remainingKm.toFixed(1).replace('.', ',')} km para a troca recomendada.`,
      type: 'warning',
    };
  }

  return null;
};

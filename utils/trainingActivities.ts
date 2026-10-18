import type { AthletePlan, TrainingWeek } from '../types';
import { getAppNow, getLocalDateString, getWorkoutDateString, parseDateString } from './time';

export type TrainingActivity = TrainingWeek['workouts'][number] & { activityId: string; isFreeRun: boolean; date: string; weekIndex: number; dayIndex: number; visible: boolean };
export const activityDistance = (workout: TrainingWeek['workouts'][number]): number => {
  const actual = workout.actualDistance;
  const value = actual !== undefined && actual !== null && String(actual).trim() !== '' ? actual : workout.gpsRoute?.totalDistanceKm ?? workout.distance ?? 0;
  const number = Number(String(value).replace(',', '.'));
  return Number.isFinite(number) ? Math.max(0, number) : 0;
};
export function weekStart(date: string): string {
  const day = parseDateString(date);
  day.setDate(day.getDate() - (day.getDay() + 6) % 7);
  return getLocalDateString(day);
}
const validDate = (date?: string) => !!date && /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parseDateString(date).getTime());

/** A read-only activity view: free runs never replace or complete a prescription. */
export function getTrainingActivities(plan?: AthletePlan | null): TrainingActivity[] {
  if (!plan) return [];
  const anchor = plan.startDate || weekStart(getLocalDateString(getAppNow()));
  const activities: TrainingActivity[] = [];
  (plan.weeks || []).forEach((week, weekIndex) => (week.workouts || []).forEach((workout, dayIndex) => {
    activities.push({ ...workout,
      date: validDate(workout.date) ? workout.date! : getWorkoutDateString(anchor, weekIndex, dayIndex),
      activityId: `planned:${week.id || weekIndex}:${dayIndex}`, isFreeRun: false, weekIndex, dayIndex, visible: week.isVisible === true
    });
  }));
  const unique = new Map((plan.freeRuns || []).filter(run => run.completed && validDate(run.date)).map(run => [run.id, run]));
  for (const run of unique.values()) {
    activities.push({ ...run, distance: 0, actualDistance: activityDistance(run), date: run.date!, activityId: `free:${run.id}`, isFreeRun: true, weekIndex: -1, dayIndex: (parseDateString(run.date!).getDay()+6)%7, visible: true });
  }
  return activities.sort((a,b) => a.date.localeCompare(b.date) || Number(a.isFreeRun)-Number(b.isFreeRun));
}

/** Calendar weeks for totals/charts only. Never use these indexes for editing the plan. */
export function getActivityWeeks(plan?: AthletePlan | null, visibleOnly = false): (TrainingWeek & { weekStart: string })[] {
  const groups = new Map<string, TrainingWeek & { weekStart: string }>();
  const anchor = weekStart(plan?.startDate || getLocalDateString(getAppNow()));
  for (const activity of getTrainingActivities(plan)) {
    if (visibleOnly && !activity.visible) continue;
    const date = weekStart(activity.date);
    if (!groups.has(date)) {
      const original = activity.weekIndex >= 0 ? plan?.weeks[activity.weekIndex] : undefined;
      const index = Math.round((parseDateString(date).getTime()-parseDateString(anchor).getTime())/604800000);
      groups.set(date, { ...original, id: original?.id || `activity-${date}`, phase: original?.phase || 'Base', weekNumber: original?.weekNumber || index+1, totalVolume: 0, weekStart: date, isVisible: false, workouts: [] });
    }
    const group = groups.get(date)!;
    group.isVisible ||= activity.visible;
    // Hidden prescription entries stay excluded from adherence/volume views.
    group.workouts.push(activity);
    group.totalVolume += activity.distance || 0;
  }
  return [...groups.values()].sort((a,b)=>a.weekStart.localeCompare(b.weekStart));
}

export function freeRunsInWeek(plan: AthletePlan | undefined | null, date: string) {
  const start = weekStart(date);
  return getTrainingActivities(plan).filter(activity=>activity.isFreeRun && weekStart(activity.date) === start);
}

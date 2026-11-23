import type { AthletePlan, TrainingWeek } from '../types';
import { getLocalDateString, getWorkoutDateString, parseDateString } from './time';
import { safeDeepClone } from './helpers';

const WEEK_DAYS = [
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
  'Domingo',
] as const;

const isValidIsoDate = (date?: string): date is string =>
  Boolean(
    date &&
      /^\d{4}-\d{2}-\d{2}$/.test(date) &&
      getLocalDateString(parseDateString(date)) === date
  );

export function recalculateWeekVolumes(week: TrainingWeek): TrainingWeek {
  const workouts = week.workouts || [];
  const plannedKm = workouts.reduce((acc, curr) => acc + (Number(curr.distance) || 0), 0);
  const realKm = workouts.reduce((acc, curr) => {
    if (curr.completed) {
      const d =
        curr.actualDistance !== undefined &&
        curr.actualDistance !== null &&
        String(curr.actualDistance) !== ''
          ? Number(String(curr.actualDistance).replace(',', '.'))
          : Number(curr.distance) || 0;
      return acc + (Number.isNaN(d) ? 0 : d);
    }
    return acc;
  }, 0);

  return {
    ...week,
    totalVolume: Math.round(plannedKm * 10) / 10,
    actualVolume: Math.round(realKm * 10) / 10,
  };
}

/**
 * Re-aligns workout `.day` and `.date` fields to match each week/day slot's real calendar date
 * when the plan (or week) defines a valid start date. Prevents calendar mismatch errors after
 * moving, swapping, inserting, deleting, or reordering weeks/workouts.
 */
export function syncPlanWorkoutDates(plan: AthletePlan): AthletePlan {
  if (!plan || !Array.isArray(plan.weeks)) return plan;

  const hasPlanStart = isValidIsoDate(plan.startDate);
  let changed = false;

  const nextWeeks = plan.weeks.map((week, weekIndex) => {
    const workouts = week.workouts || [];
    const hasWeekStart = isValidIsoDate(week.calendarStartDate);
    if (!hasPlanStart && !hasWeekStart) return week;
    if (week.id?.startsWith('import-') || workouts.length !== 7) return week;

    const weekHasAnyDate = workouts.some((w) => Boolean(w.date));
    let weekChanged = false;

    const nextWorkouts = workouts.map((workout, dayIndex) => {
      const expectedDay = WEEK_DAYS[dayIndex] || workout.day;
      const expectedDate = hasWeekStart
        ? getWorkoutDateString(week.calendarStartDate!, 0, dayIndex)
        : getWorkoutDateString(plan.startDate!, weekIndex, dayIndex);

      const shouldSetDate = weekHasAnyDate || Boolean(workout.date) || Boolean(plan.prescriptionReview);
      const nextDate = shouldSetDate ? expectedDate : workout.date;

      if (workout.day !== expectedDay || workout.date !== nextDate) {
        weekChanged = true;
        return {
          ...workout,
          day: expectedDay,
          ...(nextDate ? { date: nextDate } : {}),
        };
      }
      return workout;
    });

    if (!weekChanged) return week;
    changed = true;
    return { ...week, workouts: nextWorkouts };
  });

  if (!changed) return plan;
  return { ...plan, weeks: nextWeeks };
}

/**
 * Swaps two workout slots in a plan (within the same week or across weeks) while keeping
 * each slot's day label and calendar date strictly synchronized to its slot position.
 */
export function swapWorkoutsInPlan(
  plan: AthletePlan,
  fromWeekIndex: number,
  fromDayIndex: number,
  toWeekIndex: number,
  toDayIndex: number,
  explicitTargetDate?: string
): AthletePlan {
  if (!plan || !Array.isArray(plan.weeks)) {
    throw new Error('Plano inexistente.');
  }
  const fromWeek = plan.weeks[fromWeekIndex];
  const toWeek = plan.weeks[toWeekIndex];
  if (!fromWeek?.workouts?.[fromDayIndex] || !toWeek?.workouts?.[toDayIndex]) {
    throw new Error('Posição de treino inválida.');
  }

  const nextPlan: AthletePlan = safeDeepClone(plan);
  const fromWorkout = { ...nextPlan.weeks[fromWeekIndex].workouts[fromDayIndex] };
  const toWorkout = { ...nextPlan.weeks[toWeekIndex].workouts[toDayIndex] };

  const fromDayName = WEEK_DAYS[fromDayIndex] || fromWorkout.day;
  const toDayName = WEEK_DAYS[toDayIndex] || toWorkout.day;

  const resolveSlotDate = (
    wIdx: number,
    dIdx: number,
    existingWorkoutDate?: string
  ): string | undefined => {
    const w = nextPlan.weeks[wIdx];
    if (isValidIsoDate(w?.calendarStartDate)) {
      return getWorkoutDateString(w.calendarStartDate!, 0, dIdx);
    }
    if (isValidIsoDate(nextPlan.startDate) && (w?.workouts?.length ?? 0) === 7) {
      return getWorkoutDateString(nextPlan.startDate!, wIdx, dIdx);
    }
    return existingWorkoutDate;
  };

  const fromSlotDate = resolveSlotDate(fromWeekIndex, fromDayIndex, fromWorkout.date);
  const toSlotDate =
    resolveSlotDate(toWeekIndex, toDayIndex, toWorkout.date) ||
    (isValidIsoDate(explicitTargetDate) ? explicitTargetDate : undefined);

  const nextFromSlot = { ...toWorkout, day: fromDayName };
  if (fromSlotDate) nextFromSlot.date = fromSlotDate;
  else delete nextFromSlot.date;

  const nextToSlot = { ...fromWorkout, day: toDayName };
  if (toSlotDate) nextToSlot.date = toSlotDate;
  else delete nextToSlot.date;

  nextPlan.weeks[fromWeekIndex].workouts[fromDayIndex] = nextFromSlot;
  nextPlan.weeks[toWeekIndex].workouts[toDayIndex] = nextToSlot;

  const affectedWeeks = Array.from(new Set([fromWeekIndex, toWeekIndex]));
  for (const wIdx of affectedWeeks) {
    nextPlan.weeks[wIdx] = recalculateWeekVolumes(nextPlan.weeks[wIdx]);
  }

  return syncPlanWorkoutDates(nextPlan);
}

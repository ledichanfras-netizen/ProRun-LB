import test from 'node:test';
import assert from 'node:assert/strict';
import type { AthletePlan, TrainingWeek } from '../types';
import { swapWorkoutsInPlan, syncPlanWorkoutDates } from '../utils/planSchedule';
import {
  inspectPrescription,
  prescriptionDays,
  type PrescriptionConstraints,
} from '../utils/prescriptionIntelligence';

type WeekWorkout = TrainingWeek['workouts'][number];

const makeWorkout = (
  dayIndex: number,
  overrides: Partial<WeekWorkout> = {}
): WeekWorkout => ({
  day: prescriptionDays[dayIndex],
  type: 'Descanso',
  distance: 0,
  objective: 'Recuperação',
  capacity: 'Recuperação',
  method: 'Descanso',
  ...overrides,
});

const makeWeek = (
  weekNumber: number,
  startDate: string,
  workoutsOverrides: Record<number, Partial<WeekWorkout>> = {}
): TrainingWeek => {
  const baseDate = new Date(`${startDate}T00:00:00`);
  const workouts = prescriptionDays.map((_, dayIndex) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + (weekNumber - 1) * 7 + dayIndex);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const iso = `${yyyy}-${mm}-${dd}`;
    return makeWorkout(dayIndex, { date: iso, ...(workoutsOverrides[dayIndex] || {}) });
  });

  return {
    id: `w-${weekNumber}`,
    weekNumber,
    phase: 'Base',
    totalVolume: 0,
    workouts,
  };
};

test('swapWorkoutsInPlan moves Friday workout to Saturday and keeps dates synced to calendar slots', () => {
  const plan: AthletePlan = {
    startDate: '2026-11-02',
    weeks: [
      makeWeek(1, '2026-11-02'),
      makeWeek(2, '2026-11-02'),
      makeWeek(3, '2026-11-02'),
      makeWeek(4, '2026-11-02', {
        4: {
          type: 'Regenerativo',
          distance: 4,
          customDescription: 'Rodagem regenerativa 4km ritmo 05:53 a 06:47',
        },
        5: {
          type: 'Descanso',
          distance: 0,
          customDescription: 'Descanso total',
        },
      }),
    ],
  };

  // Move Friday (index 4, 2026-11-27) -> Saturday (index 5, 2026-11-28)
  const updated = swapWorkoutsInPlan(plan, 3, 4, 3, 5);
  const week4 = updated.weeks[3];

  assert.equal(week4.workouts[4].day, 'Sexta-feira');
  assert.equal(week4.workouts[4].date, '2026-11-27');
  assert.equal(week4.workouts[4].type, 'Descanso');
  assert.equal(week4.workouts[4].distance, 0);

  assert.equal(week4.workouts[5].day, 'Sábado');
  assert.equal(week4.workouts[5].date, '2026-11-28');
  assert.equal(week4.workouts[5].type, 'Regenerativo');
  assert.equal(week4.workouts[5].distance, 4);
  assert.equal(week4.totalVolume, 4);
});

test('swapWorkoutsInPlan swaps across different weeks and recalculates both week volumes', () => {
  const plan: AthletePlan = {
    startDate: '2026-11-02',
    weeks: [
      makeWeek(1, '2026-11-02', {
        4: { type: 'Regenerativo', distance: 6 },
      }),
      makeWeek(2, '2026-11-02', {
        5: { type: 'Longão', distance: 12 },
      }),
    ],
  };

  const updated = swapWorkoutsInPlan(plan, 0, 4, 1, 5);

  assert.equal(updated.weeks[0].workouts[4].day, 'Sexta-feira');
  assert.equal(updated.weeks[0].workouts[4].date, '2026-11-06');
  assert.equal(updated.weeks[0].workouts[4].type, 'Longão');
  assert.equal(updated.weeks[0].totalVolume, 12);

  assert.equal(updated.weeks[1].workouts[5].day, 'Sábado');
  assert.equal(updated.weeks[1].workouts[5].date, '2026-11-14');
  assert.equal(updated.weeks[1].workouts[5].type, 'Regenerativo');
  assert.equal(updated.weeks[1].totalVolume, 6);
});

test('syncPlanWorkoutDates repairs corrupted slot dates like Sábado showing 27/11', () => {
  const w4 = makeWeek(4, '2026-11-02', {
    4: { type: 'Descanso', distance: 0, date: '2026-11-28' },
    5: { type: 'Regenerativo', distance: 4, date: '2026-11-27' },
  });

  const repaired = syncPlanWorkoutDates({
    startDate: '2026-11-02',
    weeks: [
      makeWeek(1, '2026-11-02'),
      makeWeek(2, '2026-11-02'),
      makeWeek(3, '2026-11-02'),
      w4,
    ],
  });

  assert.equal(repaired.weeks[3].workouts[4].day, 'Sexta-feira');
  assert.equal(repaired.weeks[3].workouts[4].date, '2026-11-27');
  assert.equal(repaired.weeks[3].workouts[5].day, 'Sábado');
  assert.equal(repaired.weeks[3].workouts[5].date, '2026-11-28');
});

test('inspectPrescription with allowCoachOverrides permits coach date moves, longão shifts, custom phases, and added weeks without blocking errors', () => {
  // Saturday (index 5) was NOT in runningDays/gymDays originally
  const constraints: PrescriptionConstraints = {
    weeks: 4,
    startDate: '2026-11-02',
    raceDate: '2026-11-29',
    runningDays: [0, 2, 4, 6],
    gymDays: [1, 3],
    longRunDay: 6,
  };

  const basePlan: AthletePlan = {
    startDate: '2026-11-02',
    weeks: [
      makeWeek(1, '2026-11-02', { 0: { type: 'Rodagem', distance: 5 } }),
      makeWeek(2, '2026-11-02', { 2: { type: 'Limiar', distance: 8 } }),
      makeWeek(3, '2026-11-02', { 4: { type: 'Intervalado', distance: 7 } }),
      makeWeek(4, '2026-11-02', {
        4: { type: 'Regenerativo', distance: 4 },
        6: { type: 'Longão', distance: 12 },
      }),
    ],
  };

  // Coach moves Friday Regenerativo -> Saturday (unavailable day in original constraints),
  // moves Longão from Sunday -> Saturday of week 3, changes phase to custom text, and adds week 5
  let edited = swapWorkoutsInPlan(basePlan, 3, 4, 3, 5);
  edited.weeks[2].phase = 'Transição Especial' as TrainingWeek['phase'];
  edited.weeks.push(makeWeek(5, '2026-11-02', { 0: { type: 'Descanso', distance: 0 } }));
  edited = syncPlanWorkoutDates(edited);

  // Strict AI mode blocks this as expected
  const strictReport = inspectPrescription(edited, constraints);
  assert.ok(strictReport.errors.length > 0);

  // Coach override mode allows manual edits without blocking errors
  const coachReport = inspectPrescription(edited, constraints, undefined, {
    allowCoachOverrides: true,
  });
  assert.equal(coachReport.errors.length, 0);
  assert.ok(
    coachReport.warnings.some((w) => w.includes('ajustadas manualmente pelo treinador'))
  );

  // Still catches real structural/data bugs (e.g. negative distance) even with allowCoachOverrides
  edited.weeks[0].workouts[0].distance = -5;
  const brokenReport = inspectPrescription(edited, constraints, undefined, {
    allowCoachOverrides: true,
  });
  assert.ok(brokenReport.errors.some((e) => e.includes('distância inválida')));
});


/**
 * Centralized time utility to handle the simulated application time.
 * User requested "now" to be 2026-05-03 23:28.
 * Metadata says real "now" is around 2026-05-04 02:29.
 */

// We define the target "now" for the simulated app date.
// User says race was yesterday (May 3rd), so today is Monday May 4th.
export const APP_NOW = new Date('2026-05-04T00:15:00');

export function getAppNow() {
  // We use a fixed simulation start point to keep time moving forward relative to real time
  const simulationStartReal = new Date('2026-05-04T03:15:00').getTime();
  const simulationStartApp = APP_NOW.getTime();
  const realNow = Date.now();
  
  const elapsed = realNow - simulationStartReal;
  return new Date(simulationStartApp + elapsed);
}

export function formatAppDate(date: Date): string {
  return date.toLocaleDateString('pt-BR');
}

export function formatAppDateTime(date: Date): string {
  return date.toLocaleString('pt-BR');
}

export function getWorkoutDate(planStartDate: string, weekIndex: number, dayIndex: number): Date {
  const start = new Date(planStartDate + 'T00:00:00');
  const startDay = start.getDay() === 0 ? 6 : start.getDay() - 1;
  const firstMonday = new Date(start);
  firstMonday.setDate(start.getDate() - startDay);
  firstMonday.setHours(0, 0, 0, 0);
  
  const workoutDate = new Date(firstMonday);
  workoutDate.setDate(firstMonday.getDate() + (weekIndex * 7) + dayIndex);
  return workoutDate;
}

export function formatWorkoutDateShort(date: Date): string {
  const d = date.getDate();
  const m = date.getMonth() + 1;
  return `${d < 10 ? '0' + d : d}/${m < 10 ? '0' + m : m}`;
}

export function getWeekDateRange(planStartDate: string, weekIndex: number): { start: Date; end: Date } {
  const start = getWorkoutDate(planStartDate, weekIndex, 0); // Monday
  const end = getWorkoutDate(planStartDate, weekIndex, 6);   // Sunday
  return { start, end };
}

export function formatWeekDateRange(planStartDate: string, weekIndex: number): string {
  const { start, end } = getWeekDateRange(planStartDate, weekIndex);
  return `${formatWorkoutDateShort(start)} a ${formatWorkoutDateShort(end)}`;
}


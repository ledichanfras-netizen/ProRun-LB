
/**
 * Centralized time utility for date and time handling across the application.
 * Ensures consistent local timezone formatting without UTC date shifts at nighttime (e.g. 22:00 in UTC-3).
 */

export function getAppNow(): Date {
  return new Date();
}

/**
 * Returns a 'YYYY-MM-DD' string formatted strictly in the user's local timezone.
 * Avoids the UTC date shift caused by date.toISOString().split('T')[0] when registering at night (e.g. 22:00).
 */
export function getLocalDateString(date: Date = getAppNow()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayDateString(): string {
  return getLocalDateString(getAppNow());
}

/**
 * Safely parses a 'YYYY-MM-DD' string into a local Date without timezone shift.
 */
export function parseDateString(dateStr: string): Date {
  if (!dateStr) return getAppNow();
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day, 12, 0, 0);
  }
  return new Date(dateStr);
}

export function formatAppDate(date: Date): string {
  return date.toLocaleDateString('pt-BR');
}

export function formatAppDateTime(date: Date): string {
  return date.toLocaleString('pt-BR');
}

export function getWorkoutDate(planStartDate: string, weekIndex: number, dayIndex: number): Date {
  const start = parseDateString(planStartDate);
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


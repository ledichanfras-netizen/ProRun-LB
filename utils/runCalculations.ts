/** Calculations in seconds, kilometers and steps/minute; missing inputs stay missing. */
export function paceFromTotals(seconds: number, kilometers: number): string {
  if (!Number.isFinite(seconds) || !Number.isFinite(kilometers) || seconds <= 0 || kilometers <= 0) return '--:--';
  const pace = Math.round(seconds / kilometers);
  if (pace > 1800 || pace <= 0) return '--:--';
  return `${Math.floor(pace / 60).toString().padStart(2, '0')}:${(pace % 60).toString().padStart(2, '0')}`;
}

export interface DistanceSample { seconds: number; kilometers: number }
export function rollingPace(samples: DistanceSample[], windowSeconds = 20): string {
  const end = samples[samples.length - 1];
  if (!end) return '--:--';
  const start = samples.find(s => s.seconds >= end.seconds - windowSeconds);
  if (!start || end.seconds - start.seconds < 5 || end.kilometers - start.kilometers < 0.01) return '--:--';
  return paceFromTotals(end.seconds - start.seconds, end.kilometers - start.kilometers);
}

/** Time at an exact kilometer crossing, interpolated within a GPS segment. */
export function crossingSeconds(from: DistanceSample, to: DistanceSample, targetKm: number): number {
  if (to.kilometers <= from.kilometers) return to.seconds;
  const fraction = Math.min(1, Math.max(0, (targetKm - from.kilometers) / (to.kilometers - from.kilometers)));
  return from.seconds + (to.seconds - from.seconds) * fraction;
}

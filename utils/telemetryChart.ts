import type { TelemetryPoint } from './runningMetrics';
export type TelemetryMetric = 'paceSeconds' | 'heartRate' | 'cadenceSpm' | 'altitudeMeters';
export const telemetryMetricNames: Record<TelemetryMetric,string> = {paceSeconds:'Ritmo',heartRate:'Frequência cardíaca',cadenceSpm:'Cadência',altitudeMeters:'Elevação'};
export function telemetryChartData(samples: TelemetryPoint[]) {
  const valid = (value: unknown, positive = true): number | null => typeof value==='number' && Number.isFinite(value) && (!positive || value>0) ? value : null;
  return samples.filter(p=>Number.isFinite(p.distanceKm)&&p.distanceKm>=0&&Number.isFinite(p.durationSeconds)&&p.durationSeconds>=0).map(p=>({...p,
    paceSeconds:valid(p.paceSeconds),heartRate:valid(p.heartRate),cadenceSpm:valid(p.cadenceSpm),altitudeMeters:valid(p.altitudeMeters,false)
  }));
}
/** GPS callbacks outlive React renders; only a recent sensor reading belongs to this sample. */
export function freshTelemetryHeartRate(reading: {bpm:number;timestamp:number} | null, now:number): number | undefined {
  return reading && Number.isFinite(reading.bpm) && reading.bpm>0 && Number.isFinite(reading.timestamp) && now>=reading.timestamp && now-reading.timestamp<=15000 ? reading.bpm : undefined;
}

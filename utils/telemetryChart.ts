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

export type SampleRange = {start:number;end:number};
export function zoomTelemetryRange(range:SampleRange,factor:number,length:number):SampleRange {
  if(length<2)return {start:0,end:Math.max(0,length-1)};
  const span=Math.min(length-1,Math.max(1,Math.round((range.end-range.start)*factor)));
  const start=Math.max(0,Math.min(length-1-span,Math.round((range.start+range.end-span)/2)));
  return {start,end:start+span};
}
export function panTelemetryRange(range:SampleRange,offset:number,length:number):SampleRange {
  const span=range.end-range.start;
  const start=Math.max(0,Math.min(Math.max(0,length-1-span),range.start+Math.round(offset)));
  return {start,end:start+span};
}
export function cardiacTelemetryCoverage(samples:TelemetryPoint[]) {
  const valid=telemetryChartData(samples);
  const recorded=valid.filter(p=>p.heartRate!==null);
  const last=recorded[recorded.length-1];
  const final=valid[valid.length-1];
  return {count:recorded.length,last,final,endsEarly:!!last&&!!final&&final.durationSeconds-last.durationSeconds>30};
}

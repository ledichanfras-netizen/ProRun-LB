import React from 'react';
import { RouteData, formatDuration, formatPace } from '../utils/gpsUtils';

/** Shared recorded metrics for the completion screen and saved running sessions. */
export function RunMetricsGrid({route, distanceKm, durationSeconds, avgHeartRate}: {
  route?: Partial<RouteData> | null; distanceKm: number; durationSeconds: number; avgHeartRate?: number;
}) {
  const value = (number: number | undefined, unit: string, decimals = 0) => number !== undefined && Number.isFinite(number) ? `${number.toLocaleString('pt-BR', {minimumFractionDigits: decimals, maximumFractionDigits: decimals})} ${unit}` : 'Não informado';
  const metrics: [string,string][] = [
    ['Distância',value(distanceKm>0?distanceKm:undefined,'km',2)],
    [route?.source === 'gpx_file' ? 'Tempo registrado (GPX)' : 'Tempo ativo',durationSeconds>0?formatDuration(durationSeconds):'Não informado'],
    ['Pace geral',`${formatPace(durationSeconds,distanceKm)} /km`],
    ['Velocidade média',value(durationSeconds>0&&distanceKm>0?distanceKm*3600/durationSeconds:undefined,'km/h',1)],
    ['Cadência média',value(route?.avgCadence,'passadas/min')],['Cadência máxima',value(route?.maxCadence,'passadas/min')],
    ['FC média',value(avgHeartRate ?? route?.avgHeartRate,'bpm')],['FC máxima',value(route?.maxHeartRate,'bpm')],
    ['Calorias estimadas',value(route?.calories,'kcal')],['Ganho de elevação',value(route?.elevationGainMeters,'m')],
    ['Perda de elevação',value(route?.elevationLossMeters,'m')],['Velocidade máxima GPS',value(route?.maxSpeedKmh,'km/h',1)]
  ];
  return <div className="grid grid-cols-2 gap-3">{metrics.map(([label,metric])=><div key={label} className="prorun-run-metric rounded-2xl bg-white/5 border border-white/10 p-3 min-w-0">
    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1">{label}</span>
    <strong className="block break-words text-sm font-black text-white">{metric}</strong>
  </div>)}</div>;
}

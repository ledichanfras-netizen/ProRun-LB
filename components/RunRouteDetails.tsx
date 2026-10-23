import { formatDistance } from '../utils/formatDistance';
import React from 'react';
import { RouteData, formatDuration } from '../utils/gpsUtils';
import { normalizeGpsPoints } from '../utils/socialCardUtils';
import { WorkoutMap } from './WorkoutMap';
import { WorkoutTelemetryCharts } from './WorkoutTelemetryCharts';

/** The same map, splits and telemetry for prescribed and free running sessions. */
export function RunRouteDetails({route,isLight=false}:{route:Partial<RouteData>;isLight?:boolean}) {
  const points=normalizeGpsPoints(route);
  const distance=route.totalDistanceKm ?? (route as {distanceKm?:number}).distanceKm;
  return <div className="space-y-4 pt-2" data-run-route-details>
    {points.length>1 && <div className="rounded-2xl overflow-hidden border border-white/10 h-52 relative shadow-md"><WorkoutMap points={points} height="100%" interactive />
      <span className="absolute top-2 left-2 bg-slate-950/80 px-3 py-1 rounded-lg text-[9px] text-emerald-400 font-black uppercase italic pointer-events-none">Rota percorrida{distance != null ? ` · ${formatDistance(distance)} km` : ''}</span>
    </div>}
    {!!route.kmSplits?.length && <section className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-3">
      <h3 className="text-[10px] font-black uppercase italic tracking-wider text-emerald-400">Parciais por quilômetro</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{route.kmSplits.map((split,index)=><div key={`${split.km}-${index}`} className="p-3 rounded-xl bg-slate-900 border border-white/10 min-w-0">
        <span className="text-[9px] text-slate-400 font-bold">KM {split.km}</span>
        <p className="text-sm font-black font-mono text-emerald-400">{split.pace}/km</p>
        <p className="text-[9px] text-slate-400">Tempo: {formatDuration(split.durationSeconds)}</p>
        {split.avgCadence != null && <p className="text-[9px] text-slate-300">{split.avgCadence} passadas/min</p>}
      </div>)}</div>
    </section>}
    <WorkoutTelemetryCharts telemetrySamples={route.telemetrySamples || (route as any).telemetry} kmSplits={route.kmSplits} avgHeartRate={route.avgHeartRate} maxHeartRate={route.maxHeartRate} avgPace={route.avgPace} avgCadence={route.avgCadence} maxCadence={route.maxCadence} calories={route.calories} elevationGainMeters={route.elevationGainMeters} totalDistanceKm={distance} totalDurationSeconds={route.totalDurationSeconds} isLight={isLight}/>
  </div>;
}

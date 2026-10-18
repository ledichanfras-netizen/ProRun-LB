import type { Athlete, FreeRun } from '../types';
import type { WorkoutShareData } from '../components/WorkoutShareModal';
import { getLocalDateString } from './time';
import { RouteData, formatPace } from './gpsUtils';
import { activityDistance } from './trainingActivities';
import { parseWorkoutDurationToMinutes } from './stressModel';
import { normalizeGpsPoints } from './socialCardUtils';
import { parseDateString } from './time';

export function freeRunDurationSeconds(run: FreeRun): number {
  return Math.round(parseWorkoutDurationToMinutes(run.actualDuration)*60) || run.gpsRoute?.totalDurationSeconds || 0;
}
export function freeRunRoute(run:FreeRun):RouteData|undefined {
  const route=run.gpsRoute || run.route;
  if(!route)return undefined;
  return {...route,polyline:route.polyline||'',points:normalizeGpsPoints(route),kmSplits:route.kmSplits?.map(split=>({...split,paceSeconds:split.paceSeconds ?? parseWorkoutDurationToMinutes(split.pace)*60}))};
}
export function freeRunShareData(run:FreeRun,athlete:Pick<Athlete,'name'>):WorkoutShareData {
  const km=activityDistance(run),seconds=freeRunDurationSeconds(run),route=freeRunRoute(run);
  return {title:run.customDescription || 'Corrida livre',athleteName:athlete.name,date:run.date,distanceKm:km,durationSeconds:seconds,avgPace:formatPace(seconds,km),rpe:run.rpe,avgHeartRate:run.avgHeartRate ?? route?.avgHeartRate,elevationGainMeters:route?.elevationGainMeters,calories:route?.calories,
    route:route?{...route,polyline:route.polyline||'',points:normalizeGpsPoints(route),totalDistanceKm:km,totalDurationSeconds:seconds,avgPace:formatPace(seconds,km)}:undefined};
}
export function applyFreeRunEdits(run:FreeRun,fields:{title:string;date:string;startTime:string;distance:string;duration:string;rpe:string;heartRate:string;observations:string}):FreeRun {
  const km=Number(fields.distance.replace(',','.')),pse=Number(fields.rpe),heartRate=fields.heartRate.trim()===''?undefined:Number(fields.heartRate);
  if(!Number.isFinite(km)||km<=0||!/^\d+:[0-5]\d(?::[0-5]\d)?$/.test(fields.duration)||parseWorkoutDurationToMinutes(fields.duration)<=0||fields.rpe===''||!Number.isInteger(pse)||pse<0||pse>10)throw Error('Informe distância maior que zero, tempo em minutos:segundos e PSE de 0 a 10.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(fields.date)||!Number.isFinite(parseDateString(fields.date).getTime())||getLocalDateString(parseDateString(fields.date))!==fields.date|| (fields.startTime!==''&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(fields.startTime)))throw Error('Confira a data e o horário do treino.');
  if(heartRate!==undefined&&(!Number.isInteger(heartRate)||heartRate<=0||heartRate>300))throw Error('Informe uma frequência cardíaca válida.');
  return {...run,day:parseDateString(fields.date).toLocaleDateString('pt-BR',{weekday:'long'}),date:fields.date,startTime:fields.startTime||undefined,customDescription:fields.title.trim()||'Corrida livre',actualDistance:km,actualDuration:fields.duration,rpe:pse,avgHeartRate:heartRate,feedback:fields.observations.trim(),updatedAt:new Date().toISOString()};
}

import type {ActiveWorkoutBackup} from './gpsUtils';
/** A GPS fix after resume seeds the next segment; it must not replace recorded points. */
export function appendRecoveryFix(points:[number,number][],point:[number,number]):[number,number][]{const last=points[points.length-1];return last&&last[0]===point[0]&&last[1]===point[1]?[...points]:[...points,point];}
export function restoredHeartRateSummary(backup:ActiveWorkoutBackup){
 const saved=backup.heartRateSummary;
 if(saved&&saved.count>0&&Number.isFinite(saved.sum)&&Number.isFinite(saved.count)&&saved.sum>0)return {...saved,max:Math.max(saved.max||0,backup.heartRateMax||0)};
 const values=(backup.telemetrySamples||[]).map(s=>s.heartRate).filter((b):b is number=>typeof b==='number'&&b>0&&b<260);
 return {sum:values.reduce((s,b)=>s+b,0),count:values.length,max:Math.max(backup.heartRateMax||0,...values,0)};
}

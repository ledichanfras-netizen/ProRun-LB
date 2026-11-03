import test from 'node:test';import assert from 'node:assert/strict';
import {appendRecoveryFix,restoredHeartRateSummary} from '../utils/workoutRecovery';
import {saveActiveWorkoutBackup,getActiveWorkoutBackup,ActiveWorkoutBackup} from '../utils/gpsUtils';
test('first GPS fix after resume retains the entire prior route and does not mutate the checkpoint',()=>{const before:[number,number][]=[[-23.30,-51.10],[-23.31,-51.11]];const after=appendRecoveryFix(before,[-23.32,-51.12]);assert.deepEqual(after.slice(0,2),before);assert.equal(before.length,2);assert.equal(after.length,3);assert.equal(appendRecoveryFix(after,after[2]).length,3);});
test('checkpoint serialization retains route endpoints, totals and sensor authorization across remount',()=>{const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),values=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{setItem:(k:string,v:string)=>values.set(k,v),getItem:(k:string)=>values.get(k)||null,removeItem:(k:string)=>values.delete(k)}});try{const points=Array.from({length:900},(_,i)=>[-23-i*.00001,-51] as [number,number]);saveActiveWorkoutBackup({gpsPoints:points,distanceKm:6.7,durationSeconds:2107,heartRateDeviceId:'sensor',heartRateExpected:true,heartRateSummary:{sum:17000,count:100,max:183},savedAt:new Date().toISOString()} as ActiveWorkoutBackup);const restored=getActiveWorkoutBackup()!;assert.equal(restored.distanceKm,6.7);assert.equal(restored.durationSeconds,2107);assert.deepEqual(restored.gpsPoints[0],points[0]);assert.deepEqual(restored.gpsPoints[restored.gpsPoints.length-1],points[899]);assert.equal(restored.heartRateDeviceId,'sensor');assert.deepEqual(restoredHeartRateSummary(restored),{sum:17000,count:100,max:183});}finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else Reflect.deleteProperty(globalThis,'localStorage');}});
test('legacy heart-rate recovery uses saved readings only, never reconstructs missing oscillations from an average',()=>{const summary=restoredHeartRateSummary({heartRateAverage:180,heartRateMax:190,telemetrySamples:[{heartRate:150},{heartRate:170},{}]} as ActiveWorkoutBackup);assert.equal(summary.sum,320);assert.equal(summary.count,2);assert.equal(summary.max,190);assert.equal(restoredHeartRateSummary({heartRateAverage:180,telemetrySamples:[]} as unknown as ActiveWorkoutBackup).count,0);});

test('full GPS and cardiac history survives restart without downsampling or 24h expiry',()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),values=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{setItem:(k:string,v:string)=>values.set(k,v),getItem:(k:string)=>values.get(k)||null,removeItem:(k:string)=>values.delete(k)}});
 try{
  const gpsPoints=Array.from({length:7200},(_,i)=>[-23-i*.000001,-51] as [number,number]);
  const telemetrySamples=Array.from({length:2400},(_,i)=>({durationSeconds:i*3,distanceKm:i*.004,heartRate:130+i%50}));
  assert.equal(saveActiveWorkoutBackup({gpsPoints,telemetrySamples,distanceKm:10,durationSeconds:7200} as ActiveWorkoutBackup),true);
  const key='prorun_active_gps_workout_backup_v1';
  const raw=JSON.parse(values.get(key)!);raw.savedAt='2020-01-01T00:00:00Z';values.set(key,JSON.stringify(raw));
  const restored=getActiveWorkoutBackup()!;
  assert.deepEqual(restored.gpsPoints,gpsPoints);assert.deepEqual(restored.telemetrySamples,telemetrySamples);
 }finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else Reflect.deleteProperty(globalThis,'localStorage');}
});

test('corrupt current snapshot falls back to the previous committed run and discard clears both',async()=>{
 const {clearActiveWorkoutBackup}=await import('../utils/gpsUtils');
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),values=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{setItem:(k:string,v:string)=>values.set(k,v),getItem:(k:string)=>values.get(k)||null,removeItem:(k:string)=>values.delete(k)}});
 try{
  saveActiveWorkoutBackup({gpsPoints:[[1,2]],distanceKm:6,durationSeconds:2000} as ActiveWorkoutBackup);
  saveActiveWorkoutBackup({gpsPoints:[[1,2],[3,4]],distanceKm:7,durationSeconds:2300} as ActiveWorkoutBackup);
  values.set('prorun_active_gps_workout_backup_v1','{broken');
  assert.equal(getActiveWorkoutBackup()!.distanceKm,6);
  clearActiveWorkoutBackup();assert.equal(getActiveWorkoutBackup(),null);assert.equal(values.size,0);
 }finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else Reflect.deleteProperty(globalThis,'localStorage');}
});

test('storage quota retries without redundant copy and reports failure without destroying the last checkpoint',()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),values=new Map<string,string>();let full=false;
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{setItem:(k:string,v:string)=>{if(full||values.has('prorun_active_gps_workout_backup_v1_previous'))throw new Error('quota');values.set(k,v);},getItem:(k:string)=>values.get(k)||null,removeItem:(k:string)=>values.delete(k)}});
 try{
  assert.equal(saveActiveWorkoutBackup({gpsPoints:[[1,2]],distanceKm:6,durationSeconds:2000} as ActiveWorkoutBackup),true);
  // Rotation can fit but updating the main copy requires releasing that redundant space.
  values.set('prorun_active_gps_workout_backup_v1_previous','reserved');
  assert.equal(saveActiveWorkoutBackup({gpsPoints:[[1,2]],distanceKm:7,durationSeconds:2300} as ActiveWorkoutBackup),true);
  full=true;
  const warn=console.warn;console.warn=()=>{};
  try{assert.equal(saveActiveWorkoutBackup({gpsPoints:[],distanceKm:8,durationSeconds:2600} as unknown as ActiveWorkoutBackup),false);}finally{console.warn=warn;}
  assert.equal(getActiveWorkoutBackup()!.distanceKm,7);
 }finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else Reflect.deleteProperty(globalThis,'localStorage');}
});

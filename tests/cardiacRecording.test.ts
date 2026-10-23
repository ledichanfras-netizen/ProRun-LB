import assert from 'node:assert/strict';
import test from 'node:test';
import {appendTimedTelemetry,compactWorkoutTelemetry,type TelemetryPoint} from '../utils/runningMetrics';
import {convertBackupToRouteData,type ActiveWorkoutBackup} from '../utils/gpsUtils';
const point=(time:number,bpm?:number):TelemetryPoint=>({durationSeconds:time,distanceKm:0,heartRate:bpm,paceSeconds:0,paceFormatted:'--:--',cadenceSpm:null,calories:0});
test('time sampling keeps rising and falling FC at zero distance with a gap on loss of signal',()=>{
 const samples:TelemetryPoint[]=[];
 for(let t=0;t<=8;t++)appendTimedTelemetry(samples,point(t,[120,125,135,140,170,160,145,130,undefined][t]));
 assert.deepEqual(samples.map(p=>p.durationSeconds),[0,2,4,6,8]);
 assert.deepEqual(samples.map(p=>p.heartRate),[120,135,170,145,undefined]);
 assert.ok(samples.every(p=>p.distanceKm===0));
 appendTimedTelemetry(samples,point(9,128),true);assert.equal(samples[samples.length-1].heartRate,128);
});
test('long sessions retain brief peaks and troughs missed by uniform 75-point sampling',()=>{
 const samples=Array.from({length:3600},(_,i)=>point(i,i===701?190:i===704?90:i===712?undefined:130));
 const saved=compactWorkoutTelemetry(samples);assert.ok(saved.length<=1200);assert.ok(saved.length>75);
 assert.ok(saved.some(p=>p.heartRate===190));assert.ok(saved.some(p=>p.heartRate===90));assert.ok(saved.some(p=>p.heartRate===undefined));
 assert.equal(saved[0],samples[0]);assert.equal(saved[saved.length-1],samples[3599]);assert.ok(saved.every(p=>samples.includes(p)));
 for(let i=1;i<saved.length;i++)assert.ok(saved[i].durationSeconds>saved[i-1].durationSeconds);
});
test('indoor recovery backup and JSON round trip retain the full saved waveform',()=>{
 const telemetrySamples=Array.from({length:300},(_,i)=>point(i*2,120+Math.round(50*Math.abs(Math.sin(i/10)))));
 const backup={distanceKm:0,durationSeconds:600,gpsPoints:[],currentCalories:0,heartRateAverage:150,heartRateMax:170,telemetrySamples,kmSplits:[],savedAt:'2026-10-23T01:00:00Z'} as unknown as ActiveWorkoutBackup;
 const restored=convertBackupToRouteData(JSON.parse(JSON.stringify(backup)));
 assert.equal(restored.source,'manual_or_indoor');assert.deepEqual(restored.telemetrySamples,telemetrySamples);assert.equal(new Set(restored.telemetrySamples!.map(p=>p.heartRate)).size>10,true);
});
test('non-cardiac workouts retain compact storage and no heart rate is synthesized',()=>{
 const saved=compactWorkoutTelemetry(Array.from({length:300},(_,i)=>point(i)));
 assert.equal(saved.length,75);assert.ok(saved.every(p=>p.heartRate===undefined));
});

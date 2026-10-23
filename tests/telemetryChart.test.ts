import assert from 'node:assert/strict';
import test from 'node:test';
import {freshTelemetryHeartRate,telemetryChartData} from '../utils/telemetryChart';
import {downsampleTelemetry,type TelemetryPoint} from '../utils/runningMetrics';
const sample=(patch:Partial<TelemetryPoint>={}):TelemetryPoint=>({distanceKm:1,durationSeconds:300,paceSeconds:300,paceFormatted:'05:00',cadenceSpm:170,calories:70,...patch});
test('overlays retain the original sample positions and gaps without filling heart rate',()=>{
 const source=[sample({distanceKm:.1,heartRate:130}),sample({distanceKm:.2}),sample({distanceKm:.3,heartRate:145})];
 const before=JSON.stringify(source);const chart=telemetryChartData(source);
 assert.deepEqual(chart.map(p=>p.heartRate),[130,null,145]);assert.deepEqual(chart.map(p=>p.distanceKm),[.1,.2,.3]);assert.equal(JSON.stringify(source),before);
});
test('zero or invalid sensor values are absent; zero and below-sea-level elevation remain real',()=>{
 const chart=telemetryChartData([sample({heartRate:0,cadenceSpm:null,paceSeconds:NaN,altitudeMeters:0}),sample({heartRate:Infinity,altitudeMeters:-15}),sample({distanceKm:NaN})]);
 assert.equal(chart.length,2);assert.equal(chart[0].heartRate,null);assert.equal(chart[0].paceSeconds,null);assert.equal(chart[0].altitudeMeters,0);assert.equal(chart[1].altitudeMeters,-15);
});
test('long-running GPS callbacks get the latest sensor value and drop stale/disconnected readings',()=>{
 let reading:{bpm:number;timestamp:number}|null={bpm:130,timestamp:1000};const callback=()=>freshTelemetryHeartRate(reading,3000);
 assert.equal(callback(),130);reading={bpm:155,timestamp:2500};assert.equal(callback(),155);assert.equal(freshTelemetryHeartRate(reading,18000),undefined);assert.equal(freshTelemetryHeartRate(reading,2000),undefined);reading=null;assert.equal(callback(),undefined);
});
test('saved telemetry downsampling keeps recorded FC instead of replacing it with an average',()=>{
 const samples=Array.from({length:100},(_,i)=>sample({distanceKm:i/10,heartRate:120+i}));
 const saved=downsampleTelemetry(samples,75);assert.equal(saved.length,75);assert.equal(saved[0].heartRate,120);assert.equal(saved[74].heartRate,219);assert.ok(saved.every(p=>samples.includes(p)));
});

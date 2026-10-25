import test from 'node:test';import assert from 'node:assert/strict';
import {zoomTelemetryRange,panTelemetryRange,cardiacTelemetryCoverage} from '../utils/telemetryChart';
import {type TelemetryPoint} from '../utils/runningMetrics';
test('zoom and pan stay in bounds and preserve at least two real samples',()=>{
 const range=zoomTelemetryRange({start:0,end:100},.5,101);assert.deepEqual(range,{start:25,end:75});assert.deepEqual(panTelemetryRange(range,1000,101),{start:50,end:100});assert.deepEqual(panTelemetryRange(range,-1000,101),{start:0,end:50});assert.equal(zoomTelemetryRange(range,.001,101).end-zoomTelemetryRange(range,.001,101).start,1);assert.deepEqual(zoomTelemetryRange(range,100,101),{start:0,end:100});
});
test('a ten-kilometer session with FC ending at 3.31 km is identified without extending the cardiac curve',()=>{
 const samples=[{distanceKm:0,durationSeconds:1,heartRate:98},{distanceKm:3.31,durationSeconds:1107,heartRate:175},{distanceKm:5,durationSeconds:1800},{distanceKm:10.02,durationSeconds:3671}] as TelemetryPoint[];const before=JSON.stringify(samples),coverage=cardiacTelemetryCoverage(samples);assert.equal(coverage.count,2);assert.equal(coverage.last?.distanceKm,3.31);assert.equal(coverage.endsEarly,true);assert.equal(coverage.final?.distanceKm,10.02);assert.equal(JSON.stringify(samples),before);
});

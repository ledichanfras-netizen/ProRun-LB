import test from 'node:test';
import assert from 'node:assert/strict';
import type { FreeRun } from '../types';
import { applyFreeRunEdits, freeRunShareData, freeRunRoute, freeRunDurationSeconds } from '../utils/freeRunSession';
import { calculateWorkoutTRIMP } from '../utils/stressModel';
const run:FreeRun={id:'afternoon',day:'Domingo',date:'2026-10-18',startTime:'17:30',createdAt:'2026-10-18T20:30:00Z',type:'Rodagem',completed:true,actualDistance:5,actualDuration:'30:00',rpe:4,feedback:'Leve',gpsRoute:{polyline:'',points:[[-23.3,-51.16],[-23.31,-51.16]],source:'live_gps',recordedAt:'2026-10-18T21:00:00Z',totalDistanceKm:5,totalDurationSeconds:1800,avgPace:'06:00',avgCadence:165,calories:300,kmSplits:[{km:1,durationSeconds:360,splitTimeSeconds:360,pace:'06:00'}]}};
const fields={title:'Rodagem leve à noite',date:'2026-10-18',startTime:'19:30',distance:'6,0',duration:'36:00',rpe:'0',heartRate:'142',observations:'Confortável.'};
test('editing retains session identity, GPS, sensors and original splits',()=>{
 const before=JSON.stringify(run);const edited=applyFreeRunEdits(run,fields);
 assert.equal(edited.id,run.id);assert.equal(edited.date,'2026-10-18');assert.equal(edited.startTime,'19:30');assert.equal(edited.actualDistance,6);assert.equal(edited.rpe,0);assert.equal(edited.avgHeartRate,142);
 assert.deepEqual(edited.gpsRoute,run.gpsRoute);assert.equal(JSON.stringify(run),before);assert.equal(calculateWorkoutTRIMP(edited),0);
});
test('reposting uses corrected totals and PSE, retains the recorded route and sensors',()=>{
 const edited=applyFreeRunEdits(run,{...fields,rpe:'3'}),share=freeRunShareData(edited,{name:'Atleta'});
 assert.equal(share.distanceKm,6);assert.equal(share.durationSeconds,2160);assert.equal(share.avgPace,'06:00');assert.equal(share.rpe,3);assert.equal(share.avgHeartRate,142);assert.equal(share.route?.avgCadence,165);
 assert.deepEqual(share.route?.points,run.gpsRoute?.points);assert.equal(run.gpsRoute?.totalDistanceKm,5);assert.equal(calculateWorkoutTRIMP(edited),108);
});
test('legacy routes normalize missing split pace seconds without inventing metrics',()=>{
 assert.equal(freeRunRoute(run)?.kmSplits?.[0].paceSeconds,360);
 const manual={...run,gpsRoute:undefined};assert.equal(freeRunShareData(manual,{name:'Atleta'}).route,undefined);assert.equal(freeRunRoute(manual),undefined);
});
test('invalid dates, times, totals and effort are rejected without modifying stored sessions',()=>{
 for(const bad of [{date:'2026-02-31'},{startTime:'25:00'},{distance:'0'},{duration:'0:00'},{rpe:''},{rpe:'11'},{heartRate:'abc'}])assert.throws(()=>applyFreeRunEdits(run,{...fields,...bad}));
 assert.equal(freeRunDurationSeconds({...run,actualDuration:'1:30:00'}),5400);
});

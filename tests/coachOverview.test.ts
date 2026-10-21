import assert from 'node:assert/strict';
import test from 'node:test';
import {buildCoachOverview} from '../utils/coachOverview';
import type {Athlete,AthletePlan} from '../types';
const today='2026-10-21';
const readiness=(date:string,score=80)=>({date,readinessScore:score,sleepScore:8,stressScore:2,sorenessScore:1,moodScore:8});
const athlete=(patch:Partial<Athlete>={})=>({id:'a',name:'Atleta',readiness:'ready',...patch} as Athlete);
const plan={startDate:'2026-10-19',weeks:[{id:'w',isVisible:true,workouts:[{date:today,type:'Regenerativo',distance:6,completed:true,actualDistance:5.392276834052889,actualDuration:'30:00',rpe:0}]}],freeRuns:[{id:'f',date:today,type:'Corrida livre',completed:true,actualDistance:4.2,actualDuration:'25:00',rpe:4},{id:'f',date:today,type:'Corrida livre',completed:true,actualDistance:4.2,actualDuration:'25:00',rpe:4}]} as unknown as AthletePlan;
test('legacy ready never substitutes a current response; future responses stay excluded',()=>{
 const row=buildCoachOverview(athlete({lastReadiness:readiness('2026-10-20'),readinessHistory:[{...readiness('2026-10-22'),id:'future'}]}),undefined,today);
 assert.equal(row.score,null);assert.equal(row.lastReadiness?.date,'2026-10-20');assert.equal(row.reasons.length,0);
});
test('history wins over legacy snapshot, including score zero; falling readiness gets dated reasons',()=>{
 const row=buildCoachOverview(athlete({lastReadiness:readiness(today),readinessHistory:[{...readiness(today,0),id:'new'},{...readiness('2026-10-20',90),id:'old'}]}),undefined,today);
 assert.equal(row.score,0);assert.ok(row.reasons.some(r=>r.text.includes('Queda de 90')&&r.date===today));
});
test('multiple sessions, free run deduplication and PSE zero preserve totals and prescription',()=>{
 const before=JSON.stringify(plan);const row=buildCoachOverview(athlete(),plan,today);
 assert.equal(row.sessionsToday.length,2);assert.equal(row.completedKm,9.592276834052889);assert.equal(row.plannedKm,6);assert.equal(row.extras,1);assert.equal(row.recentLoad,100);assert.equal(row.fatigue,14.3);assert.equal(row.missingRpe,0);assert.equal(row.unregistered,0);assert.equal(JSON.stringify(plan),before);
});
test('unpublished workouts are pending; missing effort produces partial load without invented PSE',()=>{
 const p=structuredClone(plan);p.freeRuns![0].rpe=undefined;p.freeRuns=p.freeRuns!.slice(0,1);p.weeks[0].isVisible=false;
 const row=buildCoachOverview(athlete(),p,today);assert.equal(row.plannedKm,0);assert.equal(row.unpublished,true);assert.equal(row.missingRpe,1);assert.equal(row.loadIncomplete,true);assert.equal(row.recentLoad,0);
});
test('cycle phase alone never generates an alert and stale discomfort never becomes today alert',()=>{
 const a=athlete({gender:'female',lastReadiness:{...readiness(today),menstrualPhase:'menstrual'},readinessHistory:[{...readiness('2026-10-20'),id:'old',sorenessScore:9}]});
 assert.equal(buildCoachOverview(a,undefined,today).reasons.length,0);
 a.lastReadiness!.menstrualSymptoms=['Cólica'];assert.ok(buildCoachOverview(a,undefined,today).reasons.some(r=>r.text.includes('Sintomas')));
});
test('Sunday/Monday use the calendar week and missing recorded session never means absence',()=>{
 const row=buildCoachOverview(athlete(),plan,'2026-10-26');assert.equal(row.completedKm,0);assert.equal(row.missingRpe,0);assert.equal(row.score,null);
});

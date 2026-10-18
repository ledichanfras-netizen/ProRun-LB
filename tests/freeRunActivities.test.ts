import test from 'node:test';
import assert from 'node:assert/strict';
import type { AthletePlan, FreeRun, TrainingWeek } from '../types';
import { activityDistance, freeRunsInWeek, getActivityWeeks, getTrainingActivities } from '../utils/trainingActivities';
import { calculateATL_CTL_TSB, calculateWorkoutTRIMP } from '../utils/stressModel';
import { calculateAthleteGamification, countCompletedWorkouts } from '../services/gamificationService';
const run = (id: string, date='2026-10-18', km=5, rpe=6): FreeRun => ({id,date,day:'Domingo',type:'Rodagem',completed:true,actualDistance:km,actualDuration:'30:00',rpe});
const week: TrainingWeek = {id:'w1',phase:'Base',weekNumber:1,totalVolume:10,isVisible:true,workouts:Array.from({length:7},(_,i)=>({day:['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'][i],type:i===0?'Rodagem':'Descanso',distance:i===0?10:0,completed:false}))};
test('free run counts without a plan and never changes the original prescription',()=>{
 const plan:AthletePlan={startDate:'2026-10-12',weeks:[structuredClone(week)],freeRuns:[run('r1')]}; const before=JSON.stringify(plan);
 const activities=getTrainingActivities(plan), weeks=getActivityWeeks(plan,true);
 assert.equal(activities.filter(a=>a.completed).length,1);assert.equal(weeks[0].workouts.reduce((a,w)=>a+(w.completed?activityDistance(w):0),0),5);
 assert.equal(JSON.stringify(plan),before); assert.equal(plan.weeks[0].workouts[6].completed,false);
 assert.equal(getActivityWeeks({weeks:[],freeRuns:[run('r1')]}).length,1);
});
test('Sunday and Monday stay in their actual calendar weeks',()=>{
 const plan={startDate:'2026-10-12',weeks:[week],freeRuns:[run('sun'),run('mon','2026-10-19',7)]};
 assert.equal(freeRunsInWeek(plan,'2026-10-18').reduce((sum,a)=>sum+activityDistance(a),0),5);
 assert.equal(freeRunsInWeek(plan,'2026-10-19').reduce((sum,a)=>sum+activityDistance(a),0),7);
});
test('multiple sessions add distances and loads on one day, duplicate ID replaces instead of adding',()=>{
 const runs=[run('a'),run('b','2026-10-18',3,4),run('a','2026-10-18',6,6)];
 const plan={weeks:[],freeRuns:runs};const activities=getTrainingActivities(plan);assert.equal(activities.length,2);
 assert.equal(activities.reduce((sum,w)=>sum+activityDistance(w),0),9);
 const day=calculateATL_CTL_TSB([],45,undefined,runs,new Date('2026-10-18T12:00:00')).find(d=>d.date==='2026-10-18')!;
 assert.equal(day.trimp,300);assert.equal(day.atl,42.9);assert.equal(day.ctl,7.1);
});
test('completed prescribed and free sessions produce the same fatigue and sum correctly',()=>{
 const prescribed={...week,workouts:[{...run('normal'),type:'Rodagem' as const}]};
 const a=calculateATL_CTL_TSB([prescribed],45,'2026-10-12',[],new Date('2026-10-18T12:00:00')).find(d=>d.date==='2026-10-18')!;
 const b=calculateATL_CTL_TSB([],45,'2026-10-12',[run('free')],new Date('2026-10-18T12:00:00')).find(d=>d.date==='2026-10-18')!;
 assert.equal(a.trimp,b.trimp);assert.equal(a.atl,b.atl);assert.equal(a.ctl,b.ctl);
 const both=calculateATL_CTL_TSB([prescribed],45,'2026-10-12',[run('free')],new Date('2026-10-18T12:00:00')).find(d=>d.date==='2026-10-18')!;
 assert.equal(both.trimp,360);
});
test('PSE zero is valid; later rest days decay fatigue even without a prescription',()=>{
 assert.equal(calculateWorkoutTRIMP(run('zero','2026-10-18',5,0)),0);
 const timeline=calculateATL_CTL_TSB([],45,undefined,[run('free')],new Date('2026-10-21T12:00:00'));
 assert.equal(timeline.length,4);assert.equal(timeline[1].trimp,0);assert.ok(timeline[3].atl<timeline[0].atl);
});
test('old saved free runs contribute to workouts, XP and volume goals, including archived cycles',()=>{
 const plan={weeks:[],freeRuns:[run('a'),run('b','2026-10-19')]};
 assert.equal(countCompletedWorkouts({athlete:plan},'athlete'),2);
 const result=calculateAthleteGamification({athlete:plan},'athlete',undefined,[{weeks:[],freeRuns:[run('old','2026-10-01')]}]);
 assert.equal(result.updatedData.totalWorkouts,3);assert.ok(result.updatedData.xp>=300);assert.equal(result.updatedData.lastWorkoutDate,'2026-10-19');
});
test('hidden prescriptions remain excluded from visible totals while free activity remains counted',()=>{
 const plan={startDate:'2026-10-12',weeks:[{...week,isVisible:false}],freeRuns:[run('free')]};
 const weeks=getActivityWeeks(plan,true);assert.equal(weeks.length,1);assert.equal(weeks[0].workouts.length,1);assert.equal(weeks[0].totalVolume,0);
});

test('legacy empty actual distance falls back to planned volume while true zero stays zero',()=>{
 assert.equal(activityDistance({type:'Rodagem',day:'Domingo',distance:5,actualDistance:'' as any}),5);
 assert.equal(activityDistance({type:'Rodagem',day:'Domingo',distance:5,actualDistance:0}),0);
});

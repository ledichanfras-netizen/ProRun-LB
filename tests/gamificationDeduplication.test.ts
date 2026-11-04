import test from 'node:test';import assert from 'node:assert/strict';
import {calculateAthleteGamification,countCompletedWorkouts} from '../services/gamificationService';
const plan=(startDate='2026-10-26')=>({startDate,weeks:[{workouts:[{day:'Segunda-feira',type:'Regenerativo',completed:true,actualDistance:5},{day:'Terça-feira',type:'Longão',completed:true,actualDistance:10}]}],freeRuns:[{id:'free1',date:'2026-10-26',type:'Regenerativo',completed:true,actualDistance:3}]});
test('current cycle and repeated archive snapshots award each actual session only once',()=>{
 const current=plan(),archive=structuredClone(current);
 const once=calculateAthleteGamification({a:current},'a').updatedData;
 const copies=calculateAthleteGamification({a:current},'a',undefined,[archive,structuredClone(archive)]).updatedData;
 assert.deepEqual(copies,once);assert.equal(countCompletedWorkouts({a:current},'a',[archive]),3);assert.equal(copies.totalWorkouts,3);
});
test('two different free runs on the same date remain distinct, including archived copies',()=>{
 const current=plan();current.freeRuns.push({...current.freeRuns[0],id:'free2'});
 assert.equal(countCompletedWorkouts({a:current},'a',[structuredClone(current)]),4);
});
test('historical cycles on different dates still contribute and current uncompletion wins over stale snapshot',()=>{
 const current=plan(),archived=structuredClone(current);current.weeks[0].workouts[0].completed=false;
 assert.equal(countCompletedWorkouts({a:current},'a',[archived]),2);
 const old=plan('2026-10-19');old.freeRuns=[];
 assert.equal(countCompletedWorkouts({a:current},'a',[archived,old]),4);
});
test('reopening the screen does not increase XP, level or totals',()=>{
 const p=plan();const first=calculateAthleteGamification({a:p},'a',undefined,[structuredClone(p)]).updatedData;
 const second=calculateAthleteGamification({a:p},'a',first,[structuredClone(p)]).updatedData;
 assert.equal(first.xp,second.xp);assert.equal(first.level,second.level);assert.equal(first.totalWorkouts,second.totalWorkouts);
});
test('achievement bonuses crossing a level threshold settle in one calculation',()=>{
 const p={startDate:'2026-09-01',weeks:[{workouts:Array.from({length:39},()=>({type:'Regenerativo',completed:true,actualDistance:0}))}]};
 const first=calculateAthleteGamification({a:p},'a').updatedData;
 const second=calculateAthleteGamification({a:p},'a',first).updatedData;
 assert.equal(first.level,5);assert.equal(first.xp,second.xp);assert.equal(first.achievements.length,second.achievements.length);
});

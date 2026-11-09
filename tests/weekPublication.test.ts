import test from 'node:test';
import assert from 'node:assert/strict';
import {currentPublicationWeeks,publishTrainingWeek} from '../utils/weekPublication';
import {selectPortalSchedule} from '../utils/portalSchedule';
import {buildCoachOverview} from '../utils/coachOverview';
import type {Athlete,AthletePlan} from '../types';
const plan=()=>({startDate:'2026-11-04',endDate:'2026-12-13',weeks:[0,1,2].map(index=>({id:`w${index}`,weekNumber:index+1,isVisible:index===0,phase:'Base',workouts:[{date:['2026-11-02','2026-11-09','2026-11-16'][index],day:'Segunda-feira',type:'Regenerativo',distance:5}]}))} as AthletePlan);
test('publishing the pending current week removes the card and the weekly publication warning',()=>{
 const p=plan(),before=JSON.stringify(p),today='2026-11-09';const a={id:'qa',name:'QA'} as Athlete;
 assert.deepEqual(currentPublicationWeeks(p,today),[1]);assert.equal(selectPortalSchedule(p,today).state,'unpublished');assert.equal(buildCoachOverview(a,p,today).unpublished,true);
 const published=publishTrainingWeek(p,1);assert.equal(selectPortalSchedule(published,today).state,'available');assert.equal(buildCoachOverview(a,published,today).unpublished,false);assert.equal(buildCoachOverview(a,published,today).hasPublishedWeek,true);assert.equal(published.weeks[2].isVisible,false);assert.equal(JSON.stringify(p),before);
});
test('publishing yesterday\'s week never silently releases another hidden week',()=>{const p=publishTrainingWeek(plan(),0);assert.equal(selectPortalSchedule(p,'2026-11-09').state,'unpublished');assert.deepEqual(currentPublicationWeeks(p,'2026-11-08'),[0]);});
test('publication rejects invalid indexes and handles undated programs without inventing today',()=>{assert.throws(()=>publishTrainingWeek(plan(),-1));assert.throws(()=>publishTrainingWeek(plan(),99));assert.deepEqual(currentPublicationWeeks({weeks:[{workouts:[{day:'Segunda-feira',type:'Regenerativo',distance:5}]}]} as AthletePlan,'2026-11-09'),[]);});

import test from 'node:test';
import assert from 'node:assert/strict';
import type {AthletePlan} from '../types';
import {acceptPrescriptionReview,isPrescriptionReviewAccepted,prescriptionReviewFingerprint} from '../utils/prescriptionReviewAcceptance';
const fixture=()=>({startDate:'2026-11-16',prescriptionReview:{generatedAt:'2026-11-13',constraints:{runningDays:[0,2]},context:{asOf:'2026-11-13'}},weeks:[{id:'w',weekNumber:1,phase:'Base',totalVolume:5,workouts:[{day:'Segunda',type:'Rodagem',distance:5,customDescription:'Leve'}]}]} as unknown as AthletePlan);
test('acknowledgement follows reviewed prescription content and is scoped to its athlete',()=>{
 const original=fixture(),accepted=acceptPrescriptionReview(original,'athlete-a');
 assert.equal(original.prescriptionReviewAcceptance,undefined);
 assert.ok(isPrescriptionReviewAccepted(accepted,'athlete-a'));
 assert.equal(isPrescriptionReviewAccepted(accepted,'athlete-b'),false);
 const reordered=JSON.parse(JSON.stringify(accepted),(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.entries(v).reverse()):v);
 assert.equal(prescriptionReviewFingerprint(reordered),prescriptionReviewFingerprint(accepted));
 const execution=structuredClone(accepted);execution.weeks[0].isVisible=true;execution.weeks[0].actualVolume=6;execution.weeks[0].totalVolume=5.1;Object.assign(execution.weeks[0].workouts[0],{completed:true,actualDistance:6,feedback:'Bom',rpe:5,gpsRoute:{points:[[0,0],[0,1]]}});
 assert.ok(isPrescriptionReviewAccepted(execution,'athlete-a'));
 for(const change of [(p:AthletePlan)=>p.weeks[0].workouts[0].distance=8,(p:AthletePlan)=>p.weeks[0].workouts[0].customDescription='Intervalado',(p:AthletePlan)=>p.startDate='2026-11-23',(p:AthletePlan)=>p.prescriptionReview!.generatedAt='2026-11-14']){
  const edited=structuredClone(accepted);change(edited);assert.equal(isPrescriptionReviewAccepted(edited,'athlete-a'),false);
 }
});
test('local review survives returning before publication and remains usable if browser storage fails',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),values=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>values.get(key)||null,setItem:(key:string,value:string)=>values.set(key,value)}});
 try{
  const plan=fixture();acceptPrescriptionReview(plan,'a');assert.ok(isPrescriptionReviewAccepted(plan,'a'));assert.equal(isPrescriptionReviewAccepted(plan,'b'),false);
  plan.weeks[0].workouts[0].distance=12;assert.equal(isPrescriptionReviewAccepted(plan,'a'),false);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get(){throw Error('blocked')}});
  const accepted=acceptPrescriptionReview(fixture(),'a');assert.ok(isPrescriptionReviewAccepted(accepted,'a'));assert.equal(isPrescriptionReviewAccepted(fixture(),'a'),false);
 }finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else delete (globalThis as any).localStorage;}
});

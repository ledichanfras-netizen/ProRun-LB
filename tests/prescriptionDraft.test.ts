import test from 'node:test';
import assert from 'node:assert/strict';
import {savePrescriptionDraft,readPrescriptionDraft,clearPrescriptionDraft} from '../utils/prescriptionDraft';
import type {AthletePlan} from '../types';
const values=new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>values.get(k)||null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)}});
const draft={startDate:'2026-11-03',weeks:[{weekNumber:1,isVisible:true,workouts:[{day:'Terça-feira',type:'Regenerativo',distance:5}]}],prescriptionReview:{generatedAt:'new'}} as unknown as AthletePlan;
test('navigation and reload retain the new proposal and selected first week independently of the old plan',()=>{
 values.clear();const old={...draft,startDate:'2026-09-18'};
 assert.equal(savePrescriptionDraft('a',draft),true);
 const restored=readPrescriptionDraft('a')!;assert.equal(restored.startDate,'2026-11-03');assert.equal(restored.weeks[0].isVisible,true);assert.equal(old.startDate,'2026-09-18');
});
test('drafts are isolated by athlete and removed only for the published/discarded athlete',()=>{
 values.clear();savePrescriptionDraft('a',draft);savePrescriptionDraft('b',draft);clearPrescriptionDraft('a');assert.equal(readPrescriptionDraft('a'),null);assert.ok(readPrescriptionDraft('b'));
});
test('a corrupt or non-proposal checkpoint is ignored without deleting other data',()=>{
 values.clear();values.set('prorun_prescription_draft_v1:a','{bad');values.set('other','keep');assert.equal(readPrescriptionDraft('a'),null);values.set('prorun_prescription_draft_v1:a','{"weeks":[]}');assert.equal(readPrescriptionDraft('a'),null);assert.equal(values.get('other'),'keep');
});
test('storage failure reports failure rather than claiming the draft was saved',()=>{
 const saved=globalThis.localStorage;Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{setItem:()=>{throw new Error('quota');}}});try{assert.equal(savePrescriptionDraft('a',draft),false);}finally{Object.defineProperty(globalThis,'localStorage',{configurable:true,value:saved});}
});

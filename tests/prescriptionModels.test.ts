import test from 'node:test';
import assert from 'node:assert/strict';
import {withPrescriptionModelFallback,modelFailureKind,prescriptionModels} from '../utils/prescriptionModels';
test('primary stable model returns without fallback',async()=>{
 const calls:string[]=[];assert.equal(await withPrescriptionModelFallback(async model=>{calls.push(model);return 'ok';}),'ok');
 assert.deepEqual(calls,[prescriptionModels[0]]);assert.ok(prescriptionModels.every(m=>!m.includes('preview')));
});
test('503 retries primary then succeeds on alternative with the same request callback',async()=>{
 const calls:string[]=[],delays:number[]=[];
 const result=await withPrescriptionModelFallback(async model=>{calls.push(model);if(model===prescriptionModels[0])throw Object.assign(new Error('UNAVAILABLE'),{status:503});return {weeks:[1,2]};},async ms=>{delays.push(ms);},()=>0);
 assert.deepEqual(result,{weeks:[1,2]});assert.deepEqual(calls,[prescriptionModels[0],prescriptionModels[0],prescriptionModels[1]]);assert.deepEqual(delays,[2000]);
});
test('retired model switches immediately and secondary temporary failure is bounded',async()=>{
 const calls:string[]=[];
 await assert.rejects(()=>withPrescriptionModelFallback(async model=>{calls.push(model);throw Object.assign(new Error('failure'),{status:model===prescriptionModels[0]?404:503});},async()=>{}),/failure/);
 assert.deepEqual(calls,[prescriptionModels[0],prescriptionModels[1],prescriptionModels[1]]);
});
test('auth, billing, quota and invalid request do not trigger another model',async()=>{
 for(const status of [400,401,402,403,429]){let count=0;const error=Object.assign(new Error('request failed'),{status});
 await assert.rejects(()=>withPrescriptionModelFallback(async()=>{count++;throw error;},async()=>{}),e=>e===error);assert.equal(count,1);}
});
test('both models unavailable exhaust at most four calls and preserve final error',async()=>{
 let count=0;const error=Object.assign(new Error('503 UNAVAILABLE'),{status:503});
 await assert.rejects(()=>withPrescriptionModelFallback(async()=>{count++;throw error;},async()=>{}),e=>e===error);assert.equal(count,4);
});
test('unknown errors and validation failures never switch models',async()=>{
 let count=0;await assert.rejects(()=>withPrescriptionModelFallback(async()=>{count++;throw new Error('REVIEW: invalid calendar');},async()=>{}),/REVIEW/);assert.equal(count,1);
 assert.equal(modelFailureKind(new Error('503 UNAVAILABLE')),'temporary');assert.equal(modelFailureKind(new Error('RESOURCE_EXHAUSTED')),'quota');
 assert.equal(modelFailureKind(new Error('API key invalid')),'other');
});

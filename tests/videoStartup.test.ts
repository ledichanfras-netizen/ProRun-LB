import test from 'node:test';
import assert from 'node:assert/strict';
import {recordRouteVideo} from '../utils/recordRouteVideo';
async function withDevice(options:{wakeLock?:any;rejectMp4?:boolean},run:(state:any)=>Promise<void>){
 const previous=new Map<string,PropertyDescriptor|undefined>();
 const set=(key:string,value:any)=>{previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});};
 const state={stops:0,attempts:[] as string[],phases:[] as string[]};const page=new EventTarget() as any;page.hidden=false;
 class Canvas {width=720;height=1280;captureStream(){return {getTracks:()=>[{stop:()=>state.stops++}]};}}
 class Recorder {
  static isTypeSupported(){return true;}
  state='inactive';mimeType:string;ondataavailable:any;onstop:any;onerror:any;onstart:any;
  constructor(_stream:any,options:any){state.attempts.push(options.mimeType);if(options.mimeType.startsWith('video/mp4')&&optionsRejectMp4)throw new Error('Encoder unavailable');this.mimeType=options.mimeType;}
  start(){this.state='recording';queueMicrotask(()=>this.onstart?.());}
  stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(['video'],{type:this.mimeType})});this.onstop?.();});}
 }
 const optionsRejectMp4=options.rejectMp4;
 set('HTMLCanvasElement',Canvas);set('MediaRecorder',Recorder);set('document',page);set('navigator',{wakeLock:options.wakeLock});set('requestAnimationFrame',(fn:any)=>setTimeout(()=>fn(performance.now()),5));set('cancelAnimationFrame',(id:any)=>clearTimeout(id));
 try{await run({...state,canvas:new Canvas(),scene:{draw:()=>{},warnings:[],dispose:()=>{}},state});}
 finally{for(const [key,value] of previous){if(value)Object.defineProperty(globalThis,key,value);else delete (globalThis as any)[key];}}
}
async function bounded<T>(promise:Promise<T>,ms=2200):Promise<T>{let timer:ReturnType<typeof setTimeout>;try{return await Promise.race([promise,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('Recording stayed stuck waiting for optional phone API')),ms);})]);}finally{clearTimeout(timer!);}}
test('a phone wake-lock request that never answers cannot block video generation',()=>withDevice({wakeLock:{request:()=>new Promise(()=>{})}},async({canvas,scene,state})=>{
 const result=await bounded(recordRouteVideo(canvas,scene,1,new AbortController().signal,()=>{}));assert.equal(result.extension,'mp4');assert.equal(state.stops,1);
}));
test('a phone wake-lock release that never answers cannot hide the completed video',()=>withDevice({wakeLock:{request:async()=>({release:()=>new Promise(()=>{})})}},async({canvas,scene,state})=>{
 const result=await bounded(recordRouteVideo(canvas,scene,1,new AbortController().signal,()=>{}));assert.ok(result.blob.size);assert.equal(state.stops,1);
}));
test('a phone claiming MP4 support falls back if the MP4 encoder cannot actually start',()=>withDevice({rejectMp4:true},async({canvas,scene,state})=>{
 const result=await bounded(recordRouteVideo(canvas,scene,1,new AbortController().signal,()=>{}));assert.equal(result.extension,'webm');assert.ok(state.attempts.some((mime:string)=>mime.startsWith('video/webm')));assert.equal(state.stops,state.attempts.length);
}));
test('cancel works while the optional wake-lock request never answers',()=>withDevice({wakeLock:{request:()=>new Promise(()=>{})}},async({canvas,scene,state})=>{
 const controller=new AbortController();const promise=recordRouteVideo(canvas,scene,10,controller.signal,()=>{});setTimeout(()=>controller.abort(),20);
 await assert.rejects(bounded(promise,300),(error:any)=>error.name==='AbortError');assert.equal(state.stops,1);
}));
test('a wake lock granted after cancellation is released without blocking',()=>withDevice({},async({canvas,scene})=>{
 let grant:(lock:any)=>void=()=>{},released=0;Object.defineProperty(navigator,'wakeLock',{value:{request:()=>new Promise(resolve=>grant=resolve)},configurable:true});
 const controller=new AbortController();const promise=recordRouteVideo(canvas,scene,10,controller.signal,()=>{});controller.abort();await assert.rejects(promise,(error:any)=>error.name==='AbortError');grant({release:async()=>{released++;}});await Promise.resolve();assert.equal(released,1);
}));

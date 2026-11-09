import test from 'node:test';
import assert from 'node:assert/strict';
import {recordRouteVideo} from '../utils/recordRouteVideo';

test('recording waits for final data, preserves the actual MIME and releases capture tracks',async()=>{
 const previous=new Map<string,PropertyDescriptor|undefined>();
 const set=(key:string,value:any)=>{previous.set(key,Object.getOwnPropertyDescriptor(globalThis,key));Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});};
 let trackStops=0,frames=0,recorderStops=0;const page=new EventTarget() as any;page.hidden=false;
 const stream={getTracks:()=>[{stop:()=>trackStops++}]};
 class Canvas {width=720;height=1280;captureStream(){return stream;}}
 class Recorder {
  static isTypeSupported(type:string){return type.startsWith('video/mp4');}
  state='inactive';mimeType='video/mp4;codecs=avc1.42E01F';ondataavailable:any;onstop:any;onerror:any;
  constructor(_stream:any,_options:any){}
  start(){this.state='recording';}
  stop(){this.state='inactive';recorderStops++;queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(['final-media-chunk'],{type:'video/mp4'})});this.onstop?.();});}
 }
 try{
  set('HTMLCanvasElement',Canvas);set('MediaRecorder',Recorder);set('document',page);set('navigator',{});
  set('requestAnimationFrame',(fn:any)=>setTimeout(()=>fn(performance.now()),5));set('cancelAnimationFrame',(id:any)=>clearTimeout(id));
  const canvas=new Canvas() as any,scene={draw:()=>frames++,dispose:()=>{},warnings:[]};
  const result=await recordRouteVideo(canvas,scene,1,new AbortController().signal,()=>{});
  assert.equal(await result.blob.text(),'final-media-chunk');assert.equal(result.blob.type,'video/mp4');assert.equal(result.extension,'mp4');assert.ok(frames>2);assert.equal(trackStops,1);assert.equal(recorderStops,1);
  const cancel=new AbortController();const interrupted=recordRouteVideo(canvas,scene,2,cancel.signal,()=>{});setTimeout(()=>cancel.abort(),20);
  await assert.rejects(interrupted,(e:any)=>e.name==='AbortError');assert.equal(trackStops,2);
  const hidden=recordRouteVideo(canvas,scene,2,new AbortController().signal,()=>{});setTimeout(()=>{page.hidden=true;page.dispatchEvent(new Event('visibilitychange'));},20);
  await assert.rejects(hidden,/interrompida/);assert.equal(trackStops,3);
 }finally{for(const [key,descriptor] of previous){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete (globalThis as any)[key];}}
});

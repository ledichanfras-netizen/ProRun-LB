import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
function mount(){
 const slots:any[]=[];let cursor=0,pending:(()=>void)[]=[];const events=new Map<string,Function>();
 const calls={fit:0,pan:0,zoom:13};const map:any={setView:(_p:any,z:number)=>{calls.zoom=z;return map;},fitBounds:()=>{calls.fit++;return map;},panTo:()=>{calls.pan++;return map;},getZoom:()=>calls.zoom,on:(names:string,fn:Function)=>{names.split(' ').forEach(n=>events.set(n,fn));return map;},off:()=>map,invalidateSize:()=>{},remove:()=>{},getBounds:()=>({contains:()=>true}),latLngToContainerPoint:(p:number[])=>({distanceTo:()=>100})};
 const layer=()=>({addTo(){return this;},setLatLngs(){return this;},setLatLng(){return this;},bindTooltip(){return this;},clearLayers(){},remove(){}});
 const createElement=(type:any,props:any,...children:any[])=>{if(props?.ref)props.ref.current={};return {type,props,children};};
 const React={__esModule:true,default:{createElement},useRef:(v:any)=>{const i=cursor++;return slots[i]??(slots[i]={current:v});},useState:(v:any)=>{const i=cursor++;if(!(i in slots))slots[i]=v;return [slots[i],(next:any)=>{slots[i]=next;}];},useEffect:(fn:()=>any,deps:any[])=>{const i=cursor++,old=slots[i];if(!old||deps.some((d,k)=>d!==old.deps[k]))pending.push(()=>{old?.cleanup?.();slots[i]={deps,cleanup:fn()};});}};
 const leaflet={__esModule:true,default:{map:()=>map,tileLayer:layer,layerGroup:layer,polyline:layer,circleMarker:layer,marker:layer,divIcon:(x:any)=>x,latLngBounds:(x:any)=>x}};
 const module={exports:{} as any};const source=ts.transpileModule(fs.readFileSync('components/WorkoutMap.tsx','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true,target:ts.ScriptTarget.ES2020}}).outputText;
 vm.runInNewContext(source,{module,exports:module.exports,require:(name:string)=>name==='react'?React:name==='leaflet'?leaflet:name==='lucide-react'?{LocateFixed:()=>null,Route:()=>null,Navigation:()=>null}:require('../utils/mapRoute.ts'),window:{setTimeout:()=>1,clearTimeout:()=>{}},console});
 return {calls,events,render:(props:any)=>{cursor=0;pending=[];const tree=module.exports.WorkoutMap(props);pending.forEach(fn=>fn());return tree;}};
}
const props={points:[[0,0],[0,.02]],currentPosition:[0,.02],live:true};
function button(tree:any,title:string):any{if(tree?.props?.title===title)return tree;for(const child of tree?.children?.flat(Infinity)||[]){const found=button(child,title);if(found)return found;}}
test('live updates retain user zoom; manual drag pauses following; center resumes it',()=>{
 const m=mount();let tree=m.render(props);m.calls.zoom=18;
 m.render({...props,currentPosition:[0,.021]});assert.equal(m.calls.zoom,18);assert.equal(m.calls.fit,0);assert.equal(m.calls.pan,1);
 m.events.get('dragstart')!();m.render({...props,currentPosition:[0,.022]});assert.equal(m.calls.pan,1);
 tree=m.render(props);button(tree,'Centralizar na posição GPS').props.onClick();m.render({...props,currentPosition:[0,.023]});assert.equal(m.calls.pan,2);
});
test('full-route control pauses tracking and static updates do not reset framing',()=>{
 const m=mount();const tree=m.render(props);button(tree,'Enquadrar o percurso completo').props.onClick();assert.equal(m.calls.fit,1);
 m.render({...props,currentPosition:[0,.024]});assert.equal(m.calls.fit,1);assert.equal(m.calls.pan,0);
 const staticMap=mount();staticMap.render({...props,live:false,currentPosition:null});staticMap.render({...props,points:[...props.points],live:false,currentPosition:null});assert.equal(staticMap.calls.fit,1);
});

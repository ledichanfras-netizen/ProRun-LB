import React,{useEffect,useRef} from 'react';
import {DEFAULT_VIDEO_FRAMING,gestureVideoFraming,type RouteVideoFraming} from '../utils/routeVideoFraming';
type Point={x:number;y:number};
const midpoint=(points:Point[])=>points.length>1?{x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2}:points[0];
const distance=(points:Point[],aspect:number)=>points.length>1?Math.hypot((points[0].x-points[1].x)*aspect,points[0].y-points[1].y):0;
const angle=(points:Point[],aspect:number)=>Math.atan2(points[1].y-points[0].y,(points[1].x-points[0].x)*aspect);
const angleDelta=(a:number,b:number)=>Math.atan2(Math.sin(b-a),Math.cos(b-a))*180/Math.PI;
/** Mounted only while editing: scrolling elsewhere in the modal keeps its normal behavior. */
export default function RouteVideoMapGesture({value,onChange,onStart,fullPanel=false}:{fullPanel?:boolean;value:RouteVideoFraming;onChange:(value:RouteVideoFraming)=>void;onStart:()=>void}){
 const element=useRef<HTMLDivElement>(null),pointers=useRef(new Map<number,Point>()),latest=useRef({value,onChange,onStart});latest.current={value,onChange,onStart};
 const update=(next:RouteVideoFraming)=>{latest.current.value=next;latest.current.onChange(next);};
 const point=(event:React.PointerEvent)=>{const rect=event.currentTarget.getBoundingClientRect();return {x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height};};
 const finish=(event:React.PointerEvent<HTMLDivElement>)=>{pointers.current.delete(event.pointerId);if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);};
 useEffect(()=>{
  const target=element.current;if(!target)return;
  const wheel=(event:WheelEvent)=>{event.preventDefault();const rect=target.getBoundingClientRect(),anchor={x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height};latest.current.onStart();update(gestureVideoFraming(latest.current.value,anchor,anchor,Math.exp(-Math.max(-100,Math.min(100,event.deltaY))*.002)));};
  target.addEventListener('wheel',wheel,{passive:false});return()=>{target.removeEventListener('wheel',wheel);pointers.current.clear();};
 },[]);
 return <div ref={element} role="group" aria-label="Mapa ajustável do vídeo" tabIndex={0} className="absolute inset-0 focus:outline focus:outline-2 focus:outline-emerald-300" style={{...(fullPanel?{inset:0}:{left:`${32/720*100}%`,top:`${300/1280*100}%`,width:`${656/720*100}%`,height:`${650/1280*100}%`}),touchAction:'none',cursor:'grab'}}
  onPointerDown={event=>{if(event.pointerType==='mouse'&&event.button!==0)return;event.preventDefault();latest.current.onStart();event.currentTarget.setPointerCapture(event.pointerId);pointers.current.set(event.pointerId,point(event));}}
  onPointerMove={event=>{if(!pointers.current.has(event.pointerId))return;event.preventDefault();const rect=event.currentTarget.getBoundingClientRect(),aspect=rect.width/rect.height;const before=Array.from(pointers.current.values()).slice(0,2);pointers.current.set(event.pointerId,point(event));const after=Array.from(pointers.current.values()).slice(0,2),a=midpoint(before),b=midpoint(after),d=distance(before,aspect),rotation=d>0&&after.length>1?angleDelta(angle(before,aspect),angle(after,aspect)):0;if(a&&b)update(gestureVideoFraming(latest.current.value,a,b,d>0?distance(after,aspect)/d:1,rotation,aspect));}}
  onPointerUp={finish} onPointerCancel={finish} onLostPointerCapture={event=>pointers.current.delete(event.pointerId)}
  onKeyDown={event=>{const shifts:Record<string,Point>={ArrowLeft:{x:-.06,y:0},ArrowRight:{x:.06,y:0},ArrowUp:{x:0,y:-.06},ArrowDown:{x:0,y:.06}};let next:RouteVideoFraming|undefined;const center={x:.5,y:.5},shift=shifts[event.key];if(shift)next=gestureVideoFraming(latest.current.value,center,{x:.5+shift.x,y:.5+shift.y});else if(['+','=','-'].includes(event.key))next=gestureVideoFraming(latest.current.value,center,center,event.key==='-'?1/1.2:1.2);else if(event.key==='['||event.key===']')next=gestureVideoFraming(latest.current.value,center,center,1,event.key==='['?-10:10);else if(event.key==='Home')next={...DEFAULT_VIDEO_FRAMING};if(next){event.preventDefault();latest.current.onStart();update(next);}}}/>;
}

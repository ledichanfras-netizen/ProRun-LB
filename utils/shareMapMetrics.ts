import {mapSegmentMeters,validMapPoint,type MapPoint} from './mapRoute';
import type {KmSplit} from './runningMetrics';
export interface ShareKmMarker {km:number;point:MapPoint;pace?:string;paceSeconds?:number;color:string;}
export interface ShareKmSegment {points:MapPoint[];color?:string;}
const paceText=(seconds:number)=>{const n=Math.round(seconds);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;};
/** Places km boundaries proportionally on the saved geometry, which can be compressed.
 * Paces come only from saved complete-km splits, never from the overall average. */
export function shareMapMetrics(points:MapPoint[],recordedKm?:number,splits:KmSplit[]=[]){
 const markers:ShareKmMarker[]=[],segments:ShareKmSegment[]=[];
 if(points.length<2||points.some(p=>!validMapPoint(p)))return {markers,segments};
 const lengths=points.slice(1).map((p,i)=>mapSegmentMeters(points[i],p));
 const geometry=lengths.reduce((a,b)=>a+b,0);
 if(!geometry)return {markers,segments};
 const total=typeof recordedKm==='number'&&Number.isFinite(recordedKm)&&recordedKm>0?recordedKm*1000:geometry;
 const valid=splits.filter(s=>Number.isInteger(s.km)&&s.km>0&&s.km<=Math.floor(total/1000+1e-7)&&Number.isFinite(s.paceSeconds)&&s.paceSeconds>0);
 const times=valid.map(s=>s.paceSeconds),min=Math.min(...times),max=Math.max(...times);
 const color=(seconds?:number)=>seconds===undefined?'#065f46':max===min?'#059669':(seconds-min)/(max-min)<.34?'#047857':(seconds-min)/(max-min)<.67?'#10b981':'#6ee7b7';
 let traveled=0,next=1000,current:MapPoint[]=[points[0]];
 for(let i=1;i<points.length;i++){
  const distance=lengths[i-1]*total/geometry;if(!distance)continue;
  while(traveled+distance>=next-1e-7&&next<=total+1e-7&&markers.length<1000){
   const t=Math.min(1,Math.max(0,(next-traveled)/distance));
   const point:MapPoint=[points[i-1][0]+(points[i][0]-points[i-1][0])*t,points[i-1][1]+(points[i][1]-points[i-1][1])*t];
   const km=next/1000,split=valid.find(s=>s.km===km),c=color(split?.paceSeconds);
   markers.push({km,point,color:c,...(split?{pace:paceText(split.paceSeconds),paceSeconds:split.paceSeconds}:{})});
   current.push(point);segments.push({points:current,color:split?c:undefined});current=[point];next+=1000;
  }
  current.push(points[i]);traveled+=distance;
 }
 if(current.length>1)segments.push({points:current});
 return {markers,segments};
}

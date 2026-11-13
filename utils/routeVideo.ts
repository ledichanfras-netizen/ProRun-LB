import type {ShareKmMarker} from './shareMapMetrics';
import {mapSegmentMeters,validMapPoint,type MapPoint} from './mapRoute';

export const ROUTE_VIDEO_WIDTH=720;
export const ROUTE_VIDEO_HEIGHT=1280;
export const ROUTE_VIDEO_FPS=24;
export const ROUTE_VIDEO_DURATIONS=[10,12,15,30,45,60] as const;
export const ROUTE_VIDEO_MAX_SECONDS=60;
export const VIDEO_MIME_TYPES=['video/mp4;codecs=avc1.42E01F','video/mp4','video/webm;codecs=vp8','video/webm;codecs=vp9','video/webm'] as const;
export function supportedVideoMime(supports:(type:string)=>boolean):string|null {
 for(const type of VIDEO_MIME_TYPES){try{if(supports(type))return type;}catch{/* Some browsers throw for an unknown codec. */}}
 return null;
}
export function videoFileExtension(mime:string):'mp4'|'webm' {
 if(mime.toLowerCase().startsWith('video/mp4'))return 'mp4';
 if(mime.toLowerCase().startsWith('video/webm'))return 'webm';
 throw new Error('Formato de vídeo não reconhecido.');
}
export interface VideoRoute {points:MapPoint[];cumulative:number[];totalMeters:number;}
/** Copy only real saved positions; never substitute a demo route or phone location. */
export function prepareVideoRoute(input:MapPoint[]):VideoRoute {
 if(input.length<2||input.some(p=>!validMapPoint(p)))throw new Error('Este treino não tem um percurso GPS válido para animar. Use a postagem em imagem.');
 const points:MapPoint[]=[...input.map(p=>[p[0],p[1]] as MapPoint)];
 const cumulative=[0];for(let i=1;i<points.length;i++)cumulative.push(cumulative[i-1]+mapSegmentMeters(points[i-1],points[i]));
 const totalMeters=cumulative[cumulative.length-1];
 if(!Number.isFinite(totalMeters)||totalMeters<1)throw new Error('O percurso GPS é insuficiente para gerar o vídeo. Use a postagem em imagem.');
 return {points,cumulative,totalMeters};
}
/** Intro, accelerated geometric replay and a two-second final hold. Summary metrics stay recorded values. */
export function routeAnimationProgress(elapsedSeconds:number,durationSeconds:number):number {
 return Math.max(0,Math.min(1,(elapsedSeconds-1)/Math.max(1,durationSeconds-3)));
}
export function videoRoutePosition(route:VideoRoute,progress:number){
 const distance=Math.max(0,Math.min(1,progress))*route.totalMeters;
 let lo=0,hi=route.points.length-1;
 while(lo<hi){const mid=Math.floor((lo+hi)/2);if(route.cumulative[mid]<distance)lo=mid+1;else hi=mid;}
 const index=lo;if(!index)return {point:route.points[0],index:0};
 const before=route.cumulative[index-1],length=route.cumulative[index]-before;
 const t=length?Math.min(1,Math.max(0,(distance-before)/length)):0,a=route.points[index-1],b=route.points[index];
 return {point:[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t] as MapPoint,index};
}
export function safeVideoFilename(name:string,distanceKm:number,mime:string):string {
 const title=(name||'Treino').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'_').slice(0,45)||'Treino';
 const distance=Number.isFinite(distanceKm)&&distanceKm>0?distanceKm.toFixed(2).replace('.', '_')+'km':'percurso';
 return `ProRunLB_${title}_${distance}.${videoFileExtension(mime)}`;
}

/** Latest completed whole kilometre. Partial final kilometres never become checks. */
export function routeVideoKilometerCheck(markers:ShareKmMarker[],distanceKm:number,progress:number):ShareKmMarker|null {
 if(!Number.isFinite(distanceKm)||distanceKm<=0||!Number.isFinite(progress))return null;
 const completed=Math.floor(distanceKm*Math.max(0,Math.min(1,progress))+1e-7);
 return markers.find(marker=>marker.km===completed)||null;
}

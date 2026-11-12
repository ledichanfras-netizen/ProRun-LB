import {createFollowGroundGL} from './routeVideoFollowGL';
import {prepareVideoRoute,type VideoRoute} from './routeVideo';
import type {MapPoint} from './mapRoute';
import type {MapDisplayMode} from './socialCardUtils';
import {shareMapMetrics} from './shareMapMetrics';
import type {KmSplit} from './runningMetrics';
import {normalizeVideoFraming,type RouteVideoFraming} from './routeVideoFraming';

export interface FollowSettings {height:number;pitch:number;distance:number;}
export const DEFAULT_FOLLOW_SETTINGS:FollowSettings={height:45,pitch:25,distance:55};
const limit=(n:number,a:number,b:number,fallback:number)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:fallback));
export function normalizeFollowSettings(s:FollowSettings):FollowSettings{return {height:limit(s.height,15,120,45),pitch:limit(s.pitch,15,65,25),distance:limit(s.distance,15,150,55)};}
export interface GroundPoint{x:number;y:number;}
interface FollowTile{x:number;y:number;url:string;}
export interface FollowPlan {route:VideoRoute;points:GroundPoint[];headings:number[];step:number;zoom:number;metersPerPixel:number;tiles:FollowTile[];}
const FAR_METERS=350,MAX_TILES=128;
function world(point:MapPoint,z:number):GroundPoint{const size=256*2**z,lat=Math.max(-85,Math.min(85,point[0]))*Math.PI/180;return {x:(point[1]+180)/360*size,y:(1-Math.log(Math.tan(lat)+1/Math.cos(lat))/Math.PI)/2*size};}
export function followPoint(plan:Pick<FollowPlan,'route'|'points'>,meters:number):GroundPoint{
 const d=Math.max(0,Math.min(plan.route.totalMeters,meters)),c=plan.route.cumulative;let lo=0,hi=c.length-1;
 while(lo<hi){const m=(lo+hi)>>1;if(c[m]<d)lo=m+1;else hi=m;}
 if(!lo)return {...plan.points[0]};const span=c[lo]-c[lo-1],t=span?(d-c[lo-1])/span:0,a=plan.points[lo-1],b=plan.points[lo];return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
}
/** Preload a bounded corridor, never a large rectangular atlas or per-frame requests. */
export function prepareFollowPlan(input:MapPoint[],mode:MapDisplayMode):FollowPlan{
 const route=prepareVideoRoute(input),latitude=route.points.reduce((n,p)=>n+p[0],0)/route.points.length;
 for(let zoom=17;zoom>=3;zoom--){
  const size=256*2**zoom,mpp=156543.033928*Math.cos(Math.max(-85,Math.min(85,latitude))*Math.PI/180)/2**zoom;
  const points=route.points.map(p=>world(p,zoom));
  for(let i=1;i<points.length;i++){while(points[i].x-points[i-1].x>size/2)points[i].x-=size;while(points[i].x-points[i-1].x< -size/2)points[i].x+=size;}
  const plan:FollowPlan={route,points,headings:[],step:Math.max(10,route.totalMeters/2000),zoom,metersPerPixel:mpp,tiles:[]};
  const tiles=new Map<string,FollowTile>(),radius=(FAR_METERS+170)/mpp;
  if(mode!=='transparent')for(let d=0;d<=route.totalMeters+250;d+=250){
   const p=followPoint(plan,d),count=2**zoom;
   for(let x=Math.floor((p.x-radius)/256);x<=Math.floor((p.x+radius)/256);x++)for(let y=Math.floor((p.y-radius)/256);y<=Math.floor((p.y+radius)/256);y++){
    if(y<0||y>=count)continue;const key=`${x}:${y}`,wrapped=(x%count+count)%count;
    tiles.set(key,{x,y,url:`https://server.arcgisonline.com/ArcGIS/rest/services/${mode==='satellite'?'World_Imagery':'World_Street_Map'}/MapServer/tile/${zoom}/${y}/${wrapped}`});
   }
   if(tiles.size>MAX_TILES)break;
  }
  if(tiles.size>MAX_TILES&&zoom>3)continue;
  plan.tiles=[...tiles.values()].slice(0,MAX_TILES);
  // Unwrap turns before distance-based smoothing so crossing north never spins the camera.
  const count=Math.ceil(route.totalMeters/plan.step),raw:number[]=[];
  for(let i=0;i<=count;i++){
   const d=Math.min(route.totalMeters,i*plan.step),a=followPoint(plan,d-25),b=followPoint(plan,d+25),dx=b.x-a.x,dy=b.y-a.y;
   let angle=dx*dx+dy*dy>1e-8?Math.atan2(dx,-dy):(raw[i-1]??0);
   if(i){while(angle-raw[i-1]>Math.PI)angle-=2*Math.PI;while(angle-raw[i-1]< -Math.PI)angle+=2*Math.PI;}
   raw.push(angle);
  }
  const window=Math.max(1,Math.ceil(Math.max(35,Math.min(350,route.totalMeters*.03))/plan.step));
  plan.headings=raw.map((_,i)=>{let sum=0,weight=0;for(let j=Math.max(0,i-window);j<=Math.min(count,i+window);j++){const w=window+1-Math.abs(j-i);sum+=raw[j]*w;weight+=w;}return sum/weight;});
  return plan;
 }
 throw new Error('Não foi possível preparar a câmera do percurso.');
}
export function followPose(plan:FollowPlan,progress:number,settings:FollowSettings,framing:RouteVideoFraming,width=656,height=650){
 const p=limit(progress,0,1,0),d=p*plan.route.totalMeters,head=followPoint(plan,d),s=normalizeFollowSettings(settings),frame=normalizeVideoFraming(framing);
 const sample=d/plan.step,i=Math.min(plan.headings.length-1,Math.floor(sample)),j=Math.min(i+1,plan.headings.length-1),heading=plan.headings[i]+(plan.headings[j]-plan.headings[i])*Math.min(1,(d-i*plan.step)/Math.max(1e-6,Math.min(plan.route.totalMeters,j*plan.step)-i*plan.step))+(frame.rotation??0)*Math.PI/180;
 const forward={x:Math.sin(heading),y:-Math.cos(heading)},right={x:Math.cos(heading),y:Math.sin(heading)},mpp=plan.metersPerPixel;
 const pitch=s.pitch*Math.PI/180,h=s.height/mpp,back=s.distance/mpp,focal=width*.9*frame.zoom;
 const camera={x:head.x-forward.x*back,y:head.y-forward.y*back};
 const headRatio=(h*Math.cos(pitch)-back*Math.sin(pitch))/(back*Math.cos(pitch)+h*Math.sin(pitch));
 return {camera,head,forward,right,pitch,h,focal,cx:width*(.5+frame.panX),cy:height*(.74+frame.panY)-focal*headRatio,far:FAR_METERS/mpp,width,height};
}
export type FollowPose=ReturnType<typeof followPose>;
export function projectFollowPoint(point:GroundPoint,pose:FollowPose){
 const dx=point.x-pose.camera.x,dy=point.y-pose.camera.y,r=dx*pose.right.x+dy*pose.right.y,d=dx*pose.forward.x+dy*pose.forward.y;
 const z=d*Math.cos(pose.pitch)+pose.h*Math.sin(pose.pitch);
 if(z<=0||d< -1e-6||d>pose.far+1e-6)return null;
 return {x:pose.cx+pose.focal*r/z,y:pose.cy+pose.focal*(pose.h*Math.cos(pose.pitch)-d*Math.sin(pose.pitch))/z};
}
export interface FollowRenderer {draw:(ctx:CanvasRenderingContext2D,p:number,settings:FollowSettings,frame:RouteVideoFraming)=>void;dispose:()=>void;warnings:string[];hasMap:boolean;}
export async function createFollowRenderer(input:MapPoint[],mode:MapDisplayMode,color:string,loadImage:(url:string,signal?:AbortSignal)=>Promise<HTMLImageElement>,signal?:AbortSignal,metrics?:{distanceKm:number;showKm?:boolean;showKmPace?:boolean;kmSplits?:KmSplit[]}):Promise<FollowRenderer>{
 const plan=prepareFollowPlan(input,mode),controller=new AbortController(),images=new Map<string,HTMLCanvasElement>(),warnings:string[]=[];
 const abort=()=>controller.abort();signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
 const budget=setTimeout(abort,18000);let cursor=0;
 try{await Promise.all(Array.from({length:Math.min(6,plan.tiles.length)},async()=>{while(cursor<plan.tiles.length&&!controller.signal.aborted){const tile=plan.tiles[cursor++];try{const image=await loadImage(tile.url,controller.signal),raster=document.createElement('canvas');raster.width=256;raster.height=256;const rasterCtx=raster.getContext('2d');if(!rasterCtx)throw new Error('Mapa indisponível.');rasterCtx.drawImage(image,0,0,256,256);rasterCtx.getImageData(0,0,1,1);images.set(`${tile.x}:${tile.y}`,raster);}catch{/* Missing images use a local grid; no unbounded retries. */}}}));}
 finally{clearTimeout(budget);signal?.removeEventListener('abort',abort);}
 if(signal?.aborted){for(const image of images.values()){image.width=0;image.height=0;}images.clear();throw new DOMException('Geração cancelada.','AbortError');}
 if(images.size<plan.tiles.length)warnings.push('Algumas imagens do trajeto não carregaram. As áreas ausentes usarão fundo limpo.');
 const ground=document.createElement('canvas');ground.width=1024;ground.height=1024;const g=ground.getContext('2d');if(!g)throw new Error('Câmera de acompanhamento indisponível.');
 const gpu=images.size?createFollowGroundGL(plan.tiles.flatMap(tile=>{const image=images.get(`${tile.x}:${tile.y}`);return image?[{...tile,image}]:[];})):null;
 const markers=metrics?.showKm?shareMapMetrics(plan.route.points,metrics.distanceKm,metrics.kmSplits||[]).markers.map(marker=>{const point=world(marker.point,plan.zoom),size=256*2**plan.zoom;while(point.x-plan.points[0].x>size/2)point.x-=size;while(point.x-plan.points[0].x< -size/2)point.x+=size;return {...marker,point};}):[];
 let disposed=false;
 return {warnings,hasMap:images.size>0,dispose(){disposed=true;gpu?.dispose();for(const image of images.values()){image.width=0;image.height=0;}images.clear();ground.width=0;ground.height=0;},draw(ctx,p,settings,frame){
  if(disposed)return;const pose=followPose(plan,p,settings,frame),{width,height}=pose;
  const sky=ctx.createLinearGradient(0,0,0,height);sky.addColorStop(0,'#547e88');sky.addColorStop(.4,'#142e34');sky.addColorStop(1,'#061c21');ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
  const accelerated=gpu?.draw(pose);
  if(accelerated){ctx.drawImage(gpu!.canvas,0,0);drawFollowLines(ctx,plan,pose,p,color);}
  else{
  // Texture covers the full visible ground wedge, with no canvas atlas proportional to route size.
  const extent=pose.far*2.4,scale=1024/extent,offset=256;
  g.setTransform(1,0,0,1,0,0);g.fillStyle='#133b39';g.fillRect(0,0,1024,1024);
  g.save();g.setTransform(pose.right.x*scale,-pose.forward.x*scale,pose.right.y*scale,-pose.forward.y*scale,512-(pose.camera.x*pose.right.x+pose.camera.y*pose.right.y)*scale,1024-offset+(pose.camera.x*pose.forward.x+pose.camera.y*pose.forward.y)*scale);
  if(mode==='transparent'||images.size<plan.tiles.length){const cell=50/plan.metersPerPixel;g.strokeStyle='rgba(52,211,153,.16)';g.lineWidth=1/scale;g.beginPath();for(let x=Math.floor((pose.camera.x-extent)/cell)*cell;x<pose.camera.x+extent;x+=cell){g.moveTo(x,pose.camera.y-extent);g.lineTo(x,pose.camera.y+extent);}for(let y=Math.floor((pose.camera.y-extent)/cell)*cell;y<pose.camera.y+extent;y+=cell){g.moveTo(pose.camera.x-extent,y);g.lineTo(pose.camera.x+extent,y);}g.stroke();}
  for(const tile of plan.tiles){const dx=tile.x*256+128-pose.camera.x,dy=tile.y*256+128-pose.camera.y,r=dx*pose.right.x+dy*pose.right.y,d=dx*pose.forward.x+dy*pose.forward.y;if(Math.abs(r)>extent/2+182||d< -extent*.25-182||d>extent*.75+182)continue;const image=images.get(`${tile.x}:${tile.y}`);if(image)g.drawImage(image,tile.x*256,tile.y*256,256.5,256.5);}
  const current=limit(p,0,1,0)*plan.route.totalMeters;
  const line=(completed:boolean)=>{g.beginPath();for(let i=0;i<plan.points.length;i++){if(completed&&plan.route.cumulative[i]>current)break;const a=plan.points[i];if(!i)g.moveTo(a.x,a.y);else g.lineTo(a.x,a.y);}if(completed){const a=pose.head;g.lineTo(a.x,a.y);}};
  g.lineCap='round';g.lineJoin='round';line(false);g.strokeStyle='rgba(255,255,255,.75)';g.lineWidth=4/scale;g.stroke();
  if(p>0){line(true);g.strokeStyle='#062b24';g.lineWidth=7/scale;g.stroke();g.strokeStyle=color;g.lineWidth=4/scale;g.stroke();}g.restore();
  // Ground-plane inverse projection, front to back: a real moving pinhole camera on a flat map.
  for(let y=0;y<height;y+=3){
   const q=(y+.5-pose.cy)/pose.focal,den=q*Math.cos(pose.pitch)+Math.sin(pose.pitch);if(den<=.0001)continue;
   const depth=pose.h*(Math.cos(pose.pitch)-q*Math.sin(pose.pitch))/den;if(depth<0||depth>pose.far)continue;
   const z=depth*Math.cos(pose.pitch)+pose.h*Math.sin(pose.pitch),left=(0-pose.cx)*z/pose.focal,right=(width-pose.cx)*z/pose.focal;
   const sx=512+left*scale,sy=1024-offset-depth*scale,sw=(right-left)*scale;if(sx<0||sx+sw>1024||sy<0||sy>=1023)continue;
   ctx.drawImage(ground,sx,sy,sw,1,0,y,width,3.5);
   if(depth>pose.far*.7){ctx.fillStyle=`rgba(84,126,136,${Math.min(.85,(depth/pose.far-.7)/.3*.85)})`;ctx.fillRect(0,y,width,3.5);}
  }
  }
  for(const marker of markers){if(marker.km>(metrics?.distanceKm||0)*p+1e-6)continue;const pin=projectFollowPoint(marker.point,pose);if(!pin||pin.x<10||pin.x>width-10||pin.y<20||pin.y>height-15)continue;const label=`${marker.km} km${metrics?.showKmPace&&marker.pace?' · '+marker.pace:''}`;ctx.font='bold 15px Arial';const w=ctx.measureText(label).width+12;ctx.fillStyle='rgba(2,6,23,.85)';ctx.fillRect(pin.x-w/2,pin.y-25,w,22);ctx.fillStyle='#fff';ctx.fillText(label,pin.x-w/2+6,pin.y-9);}
  const pin=projectFollowPoint(pose.head,pose);if(pin){ctx.beginPath();ctx.arc(pin.x,pin.y,9,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();ctx.strokeStyle=color;ctx.lineWidth=4;ctx.stroke();}
 }};
}

/** Clip each GPS segment in ground space before projection; sparse tracks remain continuous. */
function drawFollowLines(ctx:CanvasRenderingContext2D,plan:FollowPlan,pose:FollowPose,progress:number,color:string){
 const depth=(p:GroundPoint)=>(p.x-pose.camera.x)*pose.forward.x+(p.y-pose.camera.y)*pose.forward.y;
 const segment=(a:GroundPoint,b:GroundPoint)=>{const da=depth(a),db=depth(b),delta=db-da;let t0=0,t1=1;if(Math.abs(delta)<1e-9){if(da<0||da>pose.far)return;}else{const x=-da/delta,y=(pose.far-da)/delta;t0=Math.max(0,Math.min(x,y));t1=Math.min(1,Math.max(x,y));if(t0>t1)return;}const p=projectFollowPoint({x:a.x+(b.x-a.x)*t0,y:a.y+(b.y-a.y)*t0},pose),q=projectFollowPoint({x:a.x+(b.x-a.x)*t1,y:a.y+(b.y-a.y)*t1},pose);if(p&&q){ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);}};
 ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();for(let i=1;i<plan.points.length;i++)segment(plan.points[i-1],plan.points[i]);ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=4;ctx.stroke();
 if(progress>0){ctx.beginPath();const distance=Math.max(0,Math.min(1,progress))*plan.route.totalMeters;let i=1;for(;i<plan.points.length&&plan.route.cumulative[i]<=distance;i++)segment(plan.points[i-1],plan.points[i]);if(i<plan.points.length)segment(plan.points[i-1],pose.head);ctx.strokeStyle='#062b24';ctx.lineWidth=8;ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=5;ctx.stroke();}
}

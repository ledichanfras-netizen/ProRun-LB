import {generateMapTileLayout,projectShareMapPoint,type MapDisplayMode} from './socialCardUtils';
import {shareMapMetrics} from './shareMapMetrics';
import type {MapPoint} from './mapRoute';
import type {KmSplit} from './runningMetrics';
import {DEFAULT_VIDEO_FRAMING,normalizeVideoFraming,type RouteVideoFraming} from './routeVideoFraming';
import {drawPerspectivePlane,routeCamera,projectCameraPoint,orientCameraPoint,type RouteVideoView} from './routeVideoCamera';
import {prepareVideoRoute,videoRoutePosition,ROUTE_VIDEO_WIDTH,ROUTE_VIDEO_HEIGHT} from './routeVideo';

export interface RouteVideoSceneInput {
 points:MapPoint[];title:string;athleteName?:string;date?:string;distanceKm:number;durationSeconds:number;avgPace:string;
 mapMode:MapDisplayMode;routeColor?:string;logoUrl?:string;showLogo?:boolean;showKm?:boolean;showKmPace?:boolean;kmSplits?:KmSplit[];
}
export interface RouteVideoScene {draw:(canvas:HTMLCanvasElement,progress:number,view?:RouteVideoView,framing?:RouteVideoFraming)=>void;dispose:()=>void;warnings:string[];}
const abortError=()=>new DOMException('Geração cancelada.','AbortError');
function loadImage(src:string,signal?:AbortSignal):Promise<HTMLImageElement> {
 return new Promise((resolve,reject)=>{
  const img=new Image();let done=false;
  const finish=(error?:Error)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',aborted);img.onload=null;img.onerror=null;if(error){img.src='';reject(error);}else resolve(img);};
  const aborted=()=>finish(abortError());const timer=setTimeout(()=>finish(new Error('Imagem indisponível.')),7000);
  img.crossOrigin='anonymous';img.onload=()=>finish();img.onerror=()=>finish(new Error('Imagem indisponível.'));
  signal?.addEventListener('abort',aborted,{once:true});if(signal?.aborted){aborted();return;}img.src=src;
 });
}
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
function fittedText(ctx:CanvasRenderingContext2D,text:string,x:number,y:number,width:number,size:number,min=18){
 let fontSize=size;ctx.font=`800 ${fontSize}px Arial, sans-serif`;
 while(ctx.measureText(text).width>width&&fontSize>min){fontSize--;ctx.font=`800 ${fontSize}px Arial, sans-serif`;}
 let shown=text;while(shown.length>1&&ctx.measureText(shown).width>width)shown=shown.slice(0,-2)+'…';
 ctx.fillText(shown,x,y);
}
const timeText=(seconds:number)=>{if(!Number.isFinite(seconds)||seconds<=0)return '—';const s=Math.round(seconds),h=Math.floor(s/3600),m=Math.floor(s%3600/60);return `${h?h+':':''}${h?String(m).padStart(2,'0'):m}:${String(s%60).padStart(2,'0')}`;};
const dateText=(date?:string)=>{if(!date)return '';const match=date.match(/^(\d{4})-(\d{2})-(\d{2})/);return match?`${match[3]}/${match[2]}/${match[1]}`:date.slice(0,30);};

/** Load map assets once, then draw only locally. No video upload or database calls. */
export async function createRouteVideoScene(input:RouteVideoSceneInput,signal?:AbortSignal):Promise<RouteVideoScene> {
 const route=prepareVideoRoute(input.points),width=656,height=650,mapX=32,mapY=300;
 if(signal?.aborted)throw abortError();
 const layout=generateMapTileLayout(route.points,width,height,input.mapMode,48);
 const warnings:string[]=[];
 const loaded=await Promise.all(layout.tiles.map(async tile=>{
  try{return {tile,image:await loadImage(tile.url,signal)};}catch(error){if(signal?.aborted)throw error;if(tile.fallbackUrl){try{return {tile,image:await loadImage(tile.fallbackUrl,signal)};}catch{if(signal?.aborted)throw abortError();}}return null;}
 }));
 if(signal?.aborted)throw abortError();
 const completeMap=layout.tiles.length>0&&loaded.every(Boolean);
 if(layout.tiles.length&&!completeMap)warnings.push('O mapa não carregou por completo. O vídeo usará o percurso GPS em fundo limpo.');
 const base=document.createElement('canvas');base.width=width;base.height=height;
 const baseCtx=base.getContext('2d');if(!baseCtx)throw new Error('Seu navegador não conseguiu preparar o vídeo.');
 baseCtx.fillStyle='#0b2627';baseCtx.fillRect(0,0,width,height);
 if(completeMap){for(const item of loaded)if(item)baseCtx.drawImage(item.image,item.tile.x,item.tile.y,item.tile.width,item.tile.height);baseCtx.fillStyle=input.mapMode==='satellite'?'rgba(2,6,23,.24)':'rgba(2,6,23,.12)';baseCtx.fillRect(0,0,width,height);}
 else{baseCtx.strokeStyle='rgba(52,211,153,.09)';baseCtx.lineWidth=1;for(let x=0;x<width;x+=48){baseCtx.beginPath();baseCtx.moveTo(x,0);baseCtx.lineTo(x,height);baseCtx.stroke();}for(let y=0;y<height;y+=48){baseCtx.beginPath();baseCtx.moveTo(0,y);baseCtx.lineTo(width,y);baseCtx.stroke();}}
 // Validate origin cleanliness before a recording is started.
 try{baseCtx.getImageData(0,0,1,1);}catch{base.width=0;throw new Error('Este fundo de mapa não permite exportação. Selecione o traçado em fundo limpo.');}
 let logo:HTMLImageElement|null=null;
 if(input.showLogo!==false&&input.logoUrl){try{logo=await loadImage(input.logoUrl,signal);}catch(error){if(signal?.aborted)throw error;warnings.push('A logo não carregou; a identificação ProRun LB será mantida em texto.');}}
 const projected=route.points.map(point=>projectShareMapPoint(layout,point));
 const km=shareMapMetrics(route.points,input.distanceKm,input.kmSplits||[]).markers.map(m=>({...m,...projectShareMapPoint(layout,m.point)}));
 const color=input.routeColor||'#10b981';let disposed=false;
 const plane=document.createElement('canvas'),surface=document.createElement('canvas'),panel=document.createElement('canvas');
 for(const buffer of [plane,surface,panel]){buffer.width=width;buffer.height=height;}
 const panelCtx=panel.getContext('2d');if(!panelCtx)throw new Error('Não foi possível preparar o enquadramento.');
 const planeCtx=plane.getContext('2d');if(!planeCtx)throw new Error('Não foi possível preparar o mapa do vídeo.');
 const trace=(ctx:CanvasRenderingContext2D,end:number,position?:{x:number;y:number})=>{ctx.beginPath();ctx.moveTo(projected[0].x,projected[0].y);for(let i=1;i<end;i++)ctx.lineTo(projected[i].x,projected[i].y);if(position)ctx.lineTo(position.x,position.y);};
 return {warnings,dispose(){disposed=true;base.width=0;base.height=0;plane.width=0;plane.height=0;surface.width=0;surface.height=0;panel.width=0;panel.height=0;logo=null;},draw(canvas,rawProgress,view='overhead',framing=DEFAULT_VIDEO_FRAMING){
  if(disposed)return;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Vídeo indisponível neste navegador.');
  if(canvas.width!==ROUTE_VIDEO_WIDTH)canvas.width=ROUTE_VIDEO_WIDTH;if(canvas.height!==ROUTE_VIDEO_HEIGHT)canvas.height=ROUTE_VIDEO_HEIGHT;
  const progress=clamp(rawProgress,0,1),position=videoRoutePosition(route,progress),head=projectShareMapPoint(layout,position.point);
  ctx.fillStyle='#03151a';ctx.fillRect(0,0,canvas.width,canvas.height);
  const bg=ctx.createLinearGradient(0,0,720,1280);bg.addColorStop(0,'rgba(6,78,59,.5)');bg.addColorStop(1,'rgba(2,6,23,.9)');ctx.fillStyle=bg;ctx.fillRect(0,0,720,1280);
  ctx.textAlign='left';ctx.fillStyle='#34d399';ctx.font='900 36px Arial, sans-serif';ctx.fillText('PRORUN LB',logo?116:32,79);
  if(logo)ctx.drawImage(logo,32,30,68,68);
  ctx.fillStyle='#f8fafc';fittedText(ctx,input.athleteName||'Treino de corrida',32,143,650,30);
  ctx.fillStyle='#a7c8bf';ctx.font='20px Arial, sans-serif';ctx.fillText(dateText(input.date),32,178);
  ctx.fillStyle='#f8fafc';fittedText(ctx,input.title||'TREINO CONCLUÍDO',32,243,656,39,22);
  ctx.fillStyle='#34d399';ctx.font='800 16px Arial, sans-serif';ctx.fillText(progress>=1?'PERCURSO CONCLUÍDO':'SEU PERCURSO',32,278);
  const camera=routeCamera(width,height,progress,head);
  const isOnPlane=(point:{x:number;y:number})=>{if(view!=='immersive')return true;const p=orientCameraPoint(point,camera);return p.x>=0&&p.x<=width&&p.y>=0&&p.y<=height;};
  const pointOnScreen=(point:{x:number;y:number})=>view==='immersive'?projectCameraPoint(point,camera):point;
  const mapCtx=planeCtx;mapCtx.clearRect(0,0,width,height);mapCtx.drawImage(base,0,0);
  mapCtx.lineCap='round';mapCtx.lineJoin='round';trace(mapCtx,projected.length);mapCtx.strokeStyle='rgba(255,255,255,.27)';mapCtx.lineWidth=10;mapCtx.stroke();
  if(progress>0){trace(mapCtx,position.index,head);mapCtx.strokeStyle='rgba(2,6,23,.9)';mapCtx.lineWidth=13;mapCtx.stroke();mapCtx.strokeStyle=color;mapCtx.lineWidth=7;mapCtx.stroke();}
  const output=panelCtx;output.clearRect(0,0,width,height);output.textAlign='left';
  if(view==='immersive')drawPerspectivePlane(output,plane,camera,surface);else output.drawImage(plane,0,0);
  if(input.showKm){const labelStep=Math.max(1,Math.ceil(km.length/7));for(let i=0;i<km.length;i++){
   if(!isOnPlane(km[i]))continue;const marker={...km[i],...pointOnScreen(km[i])};if(marker.km>input.distanceKm*progress+1e-6)continue;
   output.beginPath();output.arc(marker.x,marker.y,4,0,Math.PI*2);output.fillStyle='#fff';output.fill();
   if(i%labelStep!==0&&i!==km.length-1)continue;
   const label=`${marker.km} km${input.showKmPace&&marker.pace?' · '+marker.pace+'/km':''}`;output.font='800 15px Arial, sans-serif';
   const labelWidth=output.measureText(label).width+18,x=clamp(marker.x-labelWidth/2,4,width-labelWidth-4),y=clamp(marker.y-31,4,height-28);
   output.fillStyle='rgba(2,6,23,.9)';output.fillRect(x,y,labelWidth,25);output.fillStyle='#fff';output.fillText(label,x+9,y+18);
  }}
  const origin=pointOnScreen(projected[0]),cursor=pointOnScreen(head);
  if(isOnPlane(projected[0])){output.beginPath();output.arc(origin.x,origin.y,7,0,Math.PI*2);output.fillStyle='#fff';output.fill();}
  output.beginPath();output.arc(cursor.x,cursor.y,11,0,Math.PI*2);output.fillStyle='#fff';output.fill();output.strokeStyle='#065f46';output.lineWidth=4;output.stroke();
  output.beginPath();output.arc(cursor.x,cursor.y,4,0,Math.PI*2);output.fillStyle='#10b981';output.fill();
  const frame=normalizeVideoFraming(framing);
  ctx.save();ctx.beginPath();ctx.rect(mapX,mapY,width,height);ctx.clip();
  ctx.translate(mapX+width/2+frame.panX*width,mapY+height/2+frame.panY*height);ctx.rotate((frame.rotation??0)*Math.PI/180);ctx.scale(frame.zoom,frame.zoom);ctx.drawImage(panel,-width/2,-height/2);ctx.restore();
  const stats=[{value:Number.isFinite(input.distanceKm)&&input.distanceKm>0?input.distanceKm.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}):'—',label:'DISTÂNCIA · KM'},{value:input.avgPace&&input.avgPace!=='0:00'?input.avgPace.replace(/\s*\/km$/,''):'—',label:'PACE MÉDIO · /KM'},{value:timeText(input.durationSeconds),label:'TEMPO TOTAL'}];
  stats.forEach((stat,i)=>{const x=32+i*226;ctx.fillStyle='#f8fafc';fittedText(ctx,stat.value,x,1046,210,i===0?52:44,22);ctx.fillStyle='#8db7aa';ctx.font='800 14px Arial, sans-serif';ctx.fillText(stat.label,x,1078);});
  ctx.fillStyle='#10b981';ctx.fillRect(32,1134,656,3);ctx.fillStyle='#f8fafc';ctx.font='900 23px Arial, sans-serif';ctx.fillText('CADA TREINO CONTA.',32,1183);
  ctx.fillStyle='#8db7aa';ctx.font='16px Arial, sans-serif';ctx.fillText('PRORUN LB · SEU TREINO EM MOVIMENTO',32,1218);
  ctx.font='12px Arial, sans-serif';ctx.fillText(completeMap?'Mapa: Esri e colaboradores':'Percurso GPS registrado',32,1251);
 }};
}

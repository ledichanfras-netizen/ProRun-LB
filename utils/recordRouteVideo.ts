import {routeAnimationProgress,supportedVideoMime,videoFileExtension,ROUTE_VIDEO_FPS} from './routeVideo';
import type {RouteVideoScene} from './routeVideoCanvas';
export interface RecordedRouteVideo {blob:Blob;mimeType:string;extension:'mp4'|'webm';}
export function localVideoMime():string|null {
 if(typeof MediaRecorder==='undefined'||typeof HTMLCanvasElement==='undefined'||typeof HTMLCanvasElement.prototype.captureStream!=='function')return null;
 return supportedVideoMime(type=>MediaRecorder.isTypeSupported(type));
}
export async function recordRouteVideo(canvas:HTMLCanvasElement,scene:RouteVideoScene,durationSeconds:number,signal:AbortSignal,onProgress:(n:number)=>void):Promise<RecordedRouteVideo> {
 const mime=localVideoMime();if(!mime)throw new Error('Este navegador não permite gravar o vídeo. Use a postagem em imagem ou abra o app em um navegador atualizado.');
 if(!Number.isFinite(durationSeconds)||durationSeconds<1||durationSeconds>15)throw new Error('Escolha um vídeo de até 15 segundos.');
 if(signal.aborted)throw new DOMException('Geração cancelada.','AbortError');
 let stream:MediaStream|null=null,recorder:MediaRecorder|null=null,raf=0,finishTimer:ReturnType<typeof setTimeout>|undefined,watchdog:ReturnType<typeof setTimeout>|undefined,wakeLock:{release:()=>Promise<void>}|null=null;
 const chunks:Blob[]=[];let totalBytes=0;
 let aborted:()=>void=()=>{},hidden:()=>void=()=>{};
 try{
  scene.draw(canvas,0);stream=canvas.captureStream(ROUTE_VIDEO_FPS);
  recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2500000});
  const activeRecorder=recorder;
  try{wakeLock=await (navigator as any).wakeLock?.request('screen')||null;}catch{/* Encoding still works with the page visible. */}
  if(signal.aborted)throw new DOMException('Geração cancelada.','AbortError');
  return await new Promise<RecordedRouteVideo>((resolve,reject)=>{
   let settled=false,requestedStop=false;
   const fail=(error:Error)=>{if(settled)return;settled=true;cancelAnimationFrame(raf);clearTimeout(finishTimer);clearTimeout(watchdog);try{if(activeRecorder.state!=='inactive')activeRecorder.stop();}catch{}reject(error);};
   aborted=()=>fail(new DOMException('Geração cancelada.','AbortError'));
   hidden=()=>{if(document.hidden)fail(new Error('A geração foi interrompida ao sair da tela. Mantenha o aplicativo aberto e tente novamente.'));};
   signal.addEventListener('abort',aborted,{once:true});document.addEventListener('visibilitychange',hidden);
   activeRecorder.ondataavailable=event=>{if(event.data.size){totalBytes+=event.data.size;if(totalBytes>24*1024*1024){fail(new Error('O vídeo ultrapassou o tamanho previsto. Tente novamente com 10 segundos.'));return;}chunks.push(event.data);}};
   activeRecorder.onerror=()=>fail(new Error('O aparelho não conseguiu gravar o vídeo. Feche outros aplicativos e tente novamente.'));
   activeRecorder.onstop=()=>{
    if(settled)return;settled=true;
    if(!requestedStop){reject(new Error('A gravação foi interrompida antes de terminar. Tente novamente.'));return;}
    if(!chunks.length){reject(new Error('A gravação ficou vazia. Tente novamente ou use imagem.'));return;}
    const actual=(activeRecorder.mimeType||chunks[0].type||mime).split(';')[0];
    try{const blob=new Blob(chunks,{type:actual});onProgress(1);resolve({blob,mimeType:actual,extension:videoFileExtension(actual)});}catch{reject(new Error('O aparelho gerou um formato de vídeo incompatível. Use a postagem em imagem.'));}
   };
   try{
    activeRecorder.start(250);const started=performance.now();
    const tick=()=>{if(settled||activeRecorder.state!=='recording')return;try{const elapsed=(performance.now()-started)/1000;scene.draw(canvas,routeAnimationProgress(elapsed,durationSeconds));onProgress(Math.min(.99,elapsed/durationSeconds));raf=requestAnimationFrame(tick);}catch{fail(new Error('Não foi possível desenhar o percurso durante a gravação.'));}};
    scene.draw(canvas,0);raf=requestAnimationFrame(tick);
    finishTimer=setTimeout(()=>{if(settled)return;try{scene.draw(canvas,1);cancelAnimationFrame(raf);requestedStop=true;activeRecorder.stop();}catch{fail(new Error('Não foi possível finalizar o vídeo.'));}},durationSeconds*1000);
    watchdog=setTimeout(()=>fail(new Error('A gravação demorou mais que o previsto. Tente novamente com 10 segundos.')),durationSeconds*1000+8000);
   }catch{fail(new Error('Este formato não pôde ser iniciado no aparelho. Use a postagem em imagem.'));}
  });
 }finally{
  cancelAnimationFrame(raf);clearTimeout(finishTimer);clearTimeout(watchdog);signal.removeEventListener('abort',aborted);document.removeEventListener('visibilitychange',hidden);
  if(recorder){recorder.ondataavailable=null;recorder.onstop=null;recorder.onerror=null;try{if(recorder.state!=='inactive')recorder.stop();}catch{}}
  stream?.getTracks().forEach(track=>track.stop());try{await wakeLock?.release();}catch{}
 }
}

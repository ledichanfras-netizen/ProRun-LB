import {routeAnimationProgress,supportedVideoMime,videoFileExtension,VIDEO_MIME_TYPES,ROUTE_VIDEO_FPS,ROUTE_VIDEO_MAX_SECONDS} from './routeVideo';
import type {RouteVideoScene} from './routeVideoCanvas';
export interface RecordedRouteVideo {blob:Blob;mimeType:string;extension:'mp4'|'webm';}
export type RecordingStage='starting'|'recording'|'finalizing'|'retrying';
export function localVideoMime():string|null {
 if(typeof globalThis.VideoEncoder!=='undefined'&&typeof globalThis.VideoFrame!=='undefined')return 'video/mp4';
 if(typeof MediaRecorder==='undefined'||typeof HTMLCanvasElement==='undefined'||typeof HTMLCanvasElement.prototype.captureStream!=='function')return null;
 return supportedVideoMime(type=>MediaRecorder.isTypeSupported(type));
}
class EncoderError extends Error {}
export async function recordRouteVideo(canvas:HTMLCanvasElement,scene:RouteVideoScene,durationSeconds:number,signal:AbortSignal,onProgress:(n:number)=>void,onStage:(stage:RecordingStage)=>void=()=>{}):Promise<RecordedRouteVideo> {
 if(!localVideoMime())throw new Error('Este navegador não permite gravar o vídeo. Use a postagem em imagem ou abra o app em um navegador atualizado.');
 if(!Number.isFinite(durationSeconds)||durationSeconds<1||durationSeconds>ROUTE_VIDEO_MAX_SECONDS)throw new Error('Escolha um vídeo de até 60 segundos.');
 let finished=false,wakeLock:{release:()=>Promise<void>}|null=null;
 const release=(lock:typeof wakeLock)=>{try{void lock?.release().catch(()=>{});}catch{}};
 // A phone's optional screen-lock API must never delay starting, cancelling or delivering a video.
 try{void Promise.resolve((navigator as any).wakeLock?.request('screen')).then(lock=>{if(finished||signal.aborted)release(lock);else wakeLock=lock||null;}).catch(()=>{});}catch{}
 try{
  if(typeof globalThis.VideoEncoder!=='undefined'&&typeof globalThis.VideoFrame!=='undefined'){
   const {encodeRouteVideo}=await import('./routeVideoExport');
   const result=await encodeRouteVideo(canvas,scene,durationSeconds,signal,onProgress,onStage);
   if(result)return result;
   onStage('retrying');
  }
  for(const mime of VIDEO_MIME_TYPES){
   if(signal.aborted)throw new DOMException('Geração cancelada.','AbortError');
   let supported=false;try{supported=MediaRecorder.isTypeSupported(mime);}catch{}if(!supported)continue;
   onStage('starting');onProgress(0);
   try{return await recordAttempt(mime);}catch(error){if(!(error instanceof EncoderError))throw error;onStage('retrying');}
  }
  throw new Error('O aparelho não conseguiu iniciar nenhum formato de vídeo. Abra o app em um navegador atualizado ou use a postagem em imagem.');
 }finally{finished=true;release(wakeLock);}
 async function recordAttempt(mime:string):Promise<RecordedRouteVideo>{
  let stream:MediaStream|null=null,recorder:MediaRecorder|null=null,raf=0,finishTimer:ReturnType<typeof setTimeout>|undefined,watchdog:ReturnType<typeof setTimeout>|undefined;
  let aborted=()=>{},hidden=()=>{};
  try{
   scene.draw(canvas,0);stream=canvas.captureStream(ROUTE_VIDEO_FPS);
   try{recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2500000});}catch{throw new EncoderError('Formato indisponível.');}
   const activeRecorder=recorder;
   return await new Promise<RecordedRouteVideo>((resolve,reject)=>{
    let settled=false,requestedStop=false,totalBytes=0;const chunks:Blob[]=[];
    const fail=(error:Error)=>{if(settled)return;settled=true;cancelAnimationFrame(raf);clearTimeout(finishTimer);clearTimeout(watchdog);try{if(activeRecorder.state!=='inactive')activeRecorder.stop();}catch{}reject(error);};
    aborted=()=>fail(new DOMException('Geração cancelada.','AbortError'));
    hidden=()=>{if(document.hidden)fail(new Error('A geração foi interrompida ao sair da tela. Mantenha o aplicativo aberto e tente novamente.'));};
    signal.addEventListener('abort',aborted,{once:true});document.addEventListener('visibilitychange',hidden);
    if(signal.aborted){aborted();return;}if(document.hidden){hidden();return;}
    activeRecorder.ondataavailable=event=>{if(settled)return;if(event.data.size){totalBytes+=event.data.size;if(totalBytes>24*1024*1024){fail(new Error('O vídeo ultrapassou o tamanho previsto. Tente novamente com 10 segundos.'));return;}chunks.push(event.data);}};
    activeRecorder.onerror=()=>fail(new EncoderError('O aparelho não conseguiu gravar neste formato.'));
    activeRecorder.onstop=()=>{
     if(settled)return;settled=true;
     if(!requestedStop){reject(new EncoderError('A gravação foi interrompida.'));return;}
     if(!chunks.length){reject(new EncoderError('A gravação ficou vazia.'));return;}
     const actual=(activeRecorder.mimeType||chunks[0].type||mime).split(';')[0];
     try{const blob=new Blob(chunks,{type:actual});onProgress(1);resolve({blob,mimeType:actual,extension:videoFileExtension(actual)});}catch{reject(new Error('O aparelho gerou um formato de vídeo incompatível. Use a postagem em imagem.'));}
    };
    try{
     activeRecorder.start(250);onStage('recording');const started=performance.now();
     const tick=()=>{if(settled||activeRecorder.state!=='recording')return;try{const elapsed=(performance.now()-started)/1000;scene.draw(canvas,routeAnimationProgress(elapsed,durationSeconds));onProgress(Math.min(.99,elapsed/durationSeconds));raf=requestAnimationFrame(tick);}catch{fail(new Error('Não foi possível desenhar o percurso durante a gravação.'));}};
     raf=requestAnimationFrame(tick);
     finishTimer=setTimeout(()=>{if(settled)return;try{scene.draw(canvas,1);cancelAnimationFrame(raf);requestedStop=true;onStage('finalizing');activeRecorder.stop();}catch{fail(new EncoderError('Não foi possível finalizar neste formato.'));}},durationSeconds*1000);
     watchdog=setTimeout(()=>fail(new EncoderError('A gravação demorou mais que o previsto.')),durationSeconds*1000+8000);
    }catch{fail(new EncoderError('Este formato não pôde ser iniciado.'));}
   });
  }finally{
   cancelAnimationFrame(raf);clearTimeout(finishTimer);clearTimeout(watchdog);signal.removeEventListener('abort',aborted);document.removeEventListener('visibilitychange',hidden);
   if(recorder){recorder.ondataavailable=null;recorder.onstop=null;recorder.onerror=null;try{if(recorder.state!=='inactive')recorder.stop();}catch{}}
   stream?.getTracks().forEach(track=>track.stop());
  }
 }
}

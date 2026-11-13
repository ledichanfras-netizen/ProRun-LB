import {BufferTarget,CanvasSource,Output,Mp4OutputFormat,Quality,canEncodeVideo,Input,BlobSource,MP4,WEBM,Conversion} from 'mediabunny';
import {ROUTE_VIDEO_FPS,routeAnimationProgress} from './routeVideo';
import type {RecordedRouteVideo,RecordingStage} from './recordRouteVideo';
import type {RouteVideoScene} from './routeVideoCanvas';

// Explicit media timestamps make the saved duration independent of rendering speed.
export async function encodeRouteVideo(canvas:HTMLCanvasElement,scene:RouteVideoScene,seconds:number,signal:AbortSignal,onProgress:(n:number)=>void,onStage:(s:RecordingStage)=>void):Promise<RecordedRouteVideo|null>{
 const controller=new AbortController();
 const abort=()=>controller.abort(signal.reason);
 const hidden=()=>{if(document.hidden)controller.abort(new Error('A geração foi interrompida ao sair da tela. Mantenha o aplicativo aberto e tente novamente.'));};
 signal.addEventListener('abort',abort,{once:true});document.addEventListener('visibilitychange',hidden);
 const watchdog=setTimeout(()=>controller.abort(new Error('A geração demorou mais que o previsto. Tente um vídeo de 10 segundos.')),180000);
 const check=()=>{if(controller.signal.aborted)throw controller.signal.reason instanceof Error?controller.signal.reason:new DOMException('Geração cancelada.','AbortError');};
 // Interrupt even an encoder that stops resolving its backpressure promise.
 const wait=<T>(promise:Promise<T>)=>new Promise<T>((resolve,reject)=>{
  const interrupted=()=>{try{check();}catch(error){reject(error);}};
  controller.signal.addEventListener('abort',interrupted,{once:true});
  promise.then(resolve,reject).finally(()=>controller.signal.removeEventListener('abort',interrupted));
  if(controller.signal.aborted)interrupted();
 });
 let output:Output<Mp4OutputFormat,BufferTarget>|undefined;
 try{
  if(signal.aborted)abort();hidden();check();onStage('starting');onProgress(0);
  const config={codec:'avc' as const,quality:new Quality({bitrate:2500000}),fullCodecString:'avc1.42001f'};
  let probeTimer:ReturnType<typeof setTimeout>|undefined;
  let supported=false;
  try{supported=await wait(Promise.race([canEncodeVideo('avc',{...config,width:canvas.width,height:canvas.height,frameRate:ROUTE_VIDEO_FPS}),new Promise<boolean>(resolve=>{probeTimer=setTimeout(()=>resolve(false),4000);})]));}catch(error){check();return null;}finally{clearTimeout(probeTimer);}
  if(!supported)return null;
  const target=new BufferTarget();output=new Output({format:new Mp4OutputFormat({fastStart:'in-memory'}),target});
  const source=new CanvasSource(canvas,config);output.addVideoTrack(source,{frameRate:ROUTE_VIDEO_FPS});
  await wait(output.start());onStage('recording');
  const count=Math.round(seconds*ROUTE_VIDEO_FPS);
  for(let frame=0;frame<count;frame++){
   check();scene.draw(canvas,routeAnimationProgress(frame/ROUTE_VIDEO_FPS,seconds));
   await wait(source.add(frame/ROUTE_VIDEO_FPS,1/ROUTE_VIDEO_FPS,{keyFrame:frame%ROUTE_VIDEO_FPS===0}));
   onProgress(Math.min(.99,(frame+1)/count));
   // Yield to gestures/cancel/progress even when the encoder has spare capacity.
   if(frame%4===0)await wait(new Promise<void>(resolve=>setTimeout(resolve,0)));
  }
  source.close();onStage('finalizing');await wait(output.finalize());check();
  if(!target.buffer||target.buffer.byteLength>24*1024*1024)throw new Error('Não foi possível finalizar o vídeo dentro do tamanho previsto. Tente 10 segundos.');
  onProgress(1);return {blob:new Blob([target.buffer],{type:'video/mp4'}),mimeType:'video/mp4',extension:'mp4'};
 }catch(error){
  check();
  // A device may advertise H.264 but fail when creating its actual encoder.
  // The caller can try MediaRecorder; its result must pass the same file checks.
  if(output?.state!=='finalized')return null;
  throw error;
 }finally{
  if(output&&output.state!=='finalized'&&output.state!=='canceled')void output.cancel().catch(()=>{});
  clearTimeout(watchdog);signal.removeEventListener('abort',abort);document.removeEventListener('visibilitychange',hidden);
 }
}

/** Read actual sample timestamps, not the requested recording timer or Blob size. */
export async function validateRouteVideo(blob:Blob,seconds:number):Promise<number>{
 const input=new Input({source:new BlobSource(blob),formats:[MP4,WEBM]});
 try{
  const track=await input.getPrimaryVideoTrack();
  if(!track)throw new Error('Vídeo sem imagens.');
  const start=await track.getFirstTimestamp(),end=await track.computeDuration();
  const actual=end-start;
  if(!Number.isFinite(actual)||Math.abs(actual-seconds)>.6)throw new Error('Duração incompleta.');
  return actual;
 }catch{throw new Error('O arquivo de vídeo ficou incompleto ou incompatível. Gere novamente antes de baixar.');}
 finally{input.dispose();}
}

export async function prepareRouteVideoDownload(result:RecordedRouteVideo,seconds:number,signal:AbortSignal):Promise<RecordedRouteVideo>{
 signal.throwIfAborted();await validateRouteVideo(result.blob,seconds);signal.throwIfAborted();
 // Recorder MP4s can be fragmented. Rewrite the container with complete metadata,
 // keeping the encoded H.264 packets intact (no quality loss or server upload).
 if(result.extension!=='mp4')return result;
 const input=new Input({source:new BlobSource(result.blob),formats:[MP4]});
 const target=new BufferTarget(),output=new Output({format:new Mp4OutputFormat({fastStart:'in-memory'}),target});
 const abort=()=>{void output.cancel().catch(()=>{});};signal.addEventListener('abort',abort,{once:true});
 try{
  const conversion=await Conversion.init({input,output,audio:{discard:true}});
  signal.throwIfAborted();
  if(!conversion.isValid)throw new Error('Não foi possível preparar o MP4 para postagem.');
  await conversion.execute();signal.throwIfAborted();
  if(!target.buffer)throw new Error('O arquivo de vídeo ficou vazio.');
  const blob=new Blob([target.buffer],{type:'video/mp4'});await validateRouteVideo(blob,seconds);signal.throwIfAborted();
  return {...result,blob};
 }finally{
  signal.removeEventListener('abort',abort);input.dispose();
  if(output.state!=='finalized'&&output.state!=='canceled')void output.cancel().catch(()=>{});
 }
}

import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {X,Play,Video,Download,Share2,RefreshCw} from 'lucide-react';
import {createRouteVideoScene,type RouteVideoScene,type RouteVideoSceneInput} from '../utils/routeVideoCanvas';
import {localVideoMime,recordRouteVideo,type RecordedRouteVideo} from '../utils/recordRouteVideo';
import {routeAnimationProgress,safeVideoFilename,videoFileExtension} from '../utils/routeVideo';
interface VideoFile extends RecordedRouteVideo {url:string;filename:string;}
export default function RouteVideoModal({input,onClose}:{input:RouteVideoSceneInput;onClose:()=>void}){
 const closeButton=useRef<HTMLButtonElement>(null);
 const canvas=useRef<HTMLCanvasElement>(null),scene=useRef<RouteVideoScene|null>(null),generation=useRef<AbortController|null>(null),previewFrame=useRef(0),fileUrl=useRef<string|null>(null),alive=useRef(true);
 const [loading,setLoading]=useState(true),[recording,setRecording]=useState(false),[playing,setPlaying]=useState(false),[duration,setDuration]=useState(12),[progress,setProgress]=useState(0),[error,setError]=useState(''),[message,setMessage]=useState(''),[warnings,setWarnings]=useState<string[]>([]),[file,setFile]=useState<VideoFile|null>(null);
 const mime=localVideoMime();const format=mime?videoFileExtension(mime).toUpperCase():null;
 const clearFile=()=>{if(fileUrl.current)URL.revokeObjectURL(fileUrl.current);fileUrl.current=null;setFile(null);};
 const stopPreview=()=>{cancelAnimationFrame(previewFrame.current);setPlaying(false);};
 useEffect(()=>{
  alive.current=true;const controller=new AbortController();let currentScene:RouteVideoScene|null=null;
  setLoading(true);setError('');setWarnings([]);clearFile();
  void createRouteVideoScene(input,controller.signal).then(created=>{
   if(controller.signal.aborted){created.dispose();return;}
   currentScene=created;scene.current=created;setWarnings(created.warnings);if(canvas.current)created.draw(canvas.current,0);setLoading(false);
  }).catch(e=>{if(!controller.signal.aborted){setError(e.message||'Não foi possível preparar o vídeo.');setLoading(false);}});
  return()=>{alive.current=false;controller.abort();generation.current?.abort();cancelAnimationFrame(previewFrame.current);currentScene?.dispose();scene.current=null;if(fileUrl.current)URL.revokeObjectURL(fileUrl.current);fileUrl.current=null;};
 },[input.points,input.title,input.athleteName,input.date,input.distanceKm,input.durationSeconds,input.avgPace,input.mapMode,input.routeColor,input.logoUrl,input.showLogo,input.showKm,input.showKmPace,input.kmSplits]);
 const preview=()=>{
  if(!canvas.current||!scene.current)return;stopPreview();setError('');setMessage('');clearFile();setPlaying(true);const started=performance.now();
  const frame=()=>{if(!canvas.current||!scene.current)return;const elapsed=(performance.now()-started)/1000;scene.current.draw(canvas.current,routeAnimationProgress(elapsed,duration));if(elapsed<duration)previewFrame.current=requestAnimationFrame(frame);else{scene.current.draw(canvas.current,1);setPlaying(false);}};
  previewFrame.current=requestAnimationFrame(frame);
 };
 const generate=async()=>{
  if(!canvas.current||!scene.current||recording)return;stopPreview();clearFile();setRecording(true);setProgress(0);setError('');setMessage('');
  const controller=new AbortController();generation.current=controller;let lastUpdate=0;
  try{
   const result=await recordRouteVideo(canvas.current,scene.current,duration,controller.signal,value=>{if(alive.current&&(value===1||performance.now()-lastUpdate>100)){lastUpdate=performance.now();setProgress(value);}});
   if(!alive.current||controller.signal.aborted)return;
   const url=URL.createObjectURL(result.blob);fileUrl.current=url;setFile({...result,url,filename:safeVideoFilename(input.title,input.distanceKm,result.mimeType)});setMessage('Vídeo pronto. Confira a prévia antes de compartilhar.');
  }catch(e:any){if(alive.current){if(e.name==='AbortError')setMessage('Geração cancelada. Você pode tentar novamente.');else setError(e.message||'Não foi possível gerar o vídeo.');}}
  finally{if(alive.current)setRecording(false);generation.current=null;}
 };
 const download=()=>{if(!file)return;const link=document.createElement('a');link.href=file.url;link.download=file.filename;document.body.appendChild(link);link.click();link.remove();setMessage('Download solicitado. O vídeo pode ser salvo em Arquivos/Downloads, conforme o aparelho.');};
 const share=async()=>{
  if(!file)return;const attachment=new File([file.blob],file.filename,{type:file.mimeType});
  if(!navigator.share||!navigator.canShare?.({files:[attachment]})){setMessage('Este aparelho não compartilha esse arquivo diretamente. Baixe o vídeo e selecione-o no aplicativo de postagem.');return;}
  try{await navigator.share({files:[attachment],title:'Meu treino · ProRun LB'});setMessage('Vídeo encaminhado para o compartilhamento do aparelho.');}
  catch(e:any){if(e.name==='AbortError')setMessage('Compartilhamento cancelado. O vídeo continua disponível.');else setError('Não foi possível compartilhar diretamente. Use Baixar vídeo.');}
 };
 const close=()=>{generation.current?.abort();cancelAnimationFrame(previewFrame.current);onClose();};
 useEffect(()=>{
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null;closeButton.current?.focus();
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}};
  window.addEventListener('keydown',escape);return()=>{window.removeEventListener('keydown',escape);if(previous?.isConnected)previous.focus();};
 },[]);
 const button='flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-sm disabled:opacity-40';
 return createPortal(<div className="fixed inset-0 z-[140] bg-black/80 flex items-center justify-center p-3 sm:p-5" onClick={event=>{event.stopPropagation();close();}}><section role="dialog" aria-modal="true" aria-labelledby="route-video-title" className="w-full max-w-xl max-h-[96dvh] overflow-y-auto rounded-3xl border border-white/15 bg-slate-950 text-white shadow-2xl" onClick={e=>e.stopPropagation()}>
  <header className="sticky top-0 z-10 bg-slate-950 border-b border-white/10 px-5 py-4 flex items-center justify-between gap-3"><div><h2 id="route-video-title" className="font-black uppercase italic flex gap-2 items-center"><Video className="text-emerald-400" size={20}/>Vídeo do percurso</h2><p className="text-xs text-slate-400 mt-1">Vertical 9:16 · percurso completo · gerado no aparelho</p></div><button ref={closeButton} type="button" aria-label="Fechar vídeo do percurso" className="p-3 rounded-xl bg-white/10" onClick={close}><X size={20}/></button></header>
  <div className="p-4 sm:p-5 space-y-4">
   <div className="mx-auto w-full max-w-[280px] aspect-[9/16] rounded-2xl overflow-hidden bg-[#03151a] border border-white/10 relative">
    <canvas ref={canvas} width={720} height={1280} aria-label="Prévia do percurso animado" className={`w-full h-full ${file?'hidden':''}`}/>
    {file&&<video key={file.url} src={file.url} controls playsInline preload="metadata" aria-label="Vídeo gerado do treino" className="w-full h-full"/>}
    {loading&&<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90"><RefreshCw className="animate-spin text-emerald-400"/><p className="text-sm">Preparando percurso e mapa…</p></div>}
   </div>
   {warnings.map(warning=><p key={warning} className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-200">{warning}</p>)}
   {error&&<p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
   {message&&<p role="status" className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}
   <div className="flex flex-wrap justify-between items-center gap-3"><label className="text-sm font-bold">Duração <select aria-label="Duração do vídeo" className="ml-2 rounded-xl border border-white/20 bg-slate-900 text-white px-3 py-2" value={duration} disabled={recording} onChange={e=>{stopPreview();clearFile();setDuration(Number(e.target.value));setMessage('');}}>{[10,12,15].map(seconds=><option key={seconds} value={seconds}>{seconds} segundos</option>)}</select></label><span className="text-xs text-slate-400">720 × 1280{format?' · '+format:''}</span></div>
   {!mime&&<p className="text-sm text-amber-200">Este navegador não grava vídeo. Você pode visualizar o percurso e continuar usando a postagem em imagem.</p>}
   {format==='WEBM'&&<p className="text-sm text-amber-200">Este aparelho oferece WebM. Alguns aplicativos de postagem exigem MP4; a imagem continua disponível como alternativa.</p>}
   {recording?<div className="space-y-3"><p role="status" className="text-sm text-emerald-300">Gerando vídeo… {Math.round(progress*100)}%. Mantenha o app aberto.</p><progress aria-label="Progresso da geração" className="w-full accent-emerald-500" max={1} value={progress}/><button type="button" className={`${button} w-full bg-white/10`} onClick={()=>generation.current?.abort()}>Cancelar geração</button></div>:<div className="grid grid-cols-2 gap-2"><button type="button" className={`${button} bg-white/10`} disabled={loading||!scene.current} onClick={()=>playing?stopPreview():preview()}><Play size={17}/>{playing?'Parar prévia':'Ver prévia'}</button><button type="button" className={`${button} bg-emerald-600`} disabled={loading||!scene.current||!mime} onClick={()=>void generate()}><Video size={17}/>{file?'Gerar novamente':'Gerar vídeo'}</button></div>}
   {file&&!recording&&<div className="grid grid-cols-2 gap-2"><button type="button" className={`${button} bg-emerald-600`} onClick={download}><Download size={17}/>Baixar {file.extension.toUpperCase()}</button><button type="button" className={`${button} bg-white/10`} onClick={()=>void share()}><Share2 size={17}/>Compartilhar</button></div>}
   <p className="text-xs text-slate-400">A animação reproduz o percurso de forma acelerada. As métricas são os totais salvos do treino. O vídeo não é enviado ao servidor.</p>
  </div>
 </section></div>,document.body);
}

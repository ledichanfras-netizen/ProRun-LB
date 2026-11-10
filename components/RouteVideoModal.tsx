import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {X,Play,Video,Download,Share2,RefreshCw} from 'lucide-react';
import {createRouteVideoScene,type RouteVideoScene,type RouteVideoSceneInput} from '../utils/routeVideoCanvas';
import {localVideoMime,recordRouteVideo,type RecordedRouteVideo,type RecordingStage} from '../utils/recordRouteVideo';
import {routeAnimationProgress,safeVideoFilename,videoFileExtension} from '../utils/routeVideo';
import type {RouteVideoView} from '../utils/routeVideoCamera';
import RouteVideoMapGesture from './RouteVideoMapGesture';
import {DEFAULT_VIDEO_FRAMING,normalizeVideoFraming,type RouteVideoFraming} from '../utils/routeVideoFraming';
interface VideoFile extends RecordedRouteVideo {url:string;filename:string;}
export default function RouteVideoModal({input,onClose}:{input:RouteVideoSceneInput;onClose:()=>void}){
 const [stage,setStage]=useState<RecordingStage>('starting'),[prepareVersion,setPrepareVersion]=useState(0);
 const [view,setView]=useState<RouteVideoView>('overhead'),[background,setBackground]=useState(input.mapMode);
 const [framing,setFraming]=useState<RouteVideoFraming>({...DEFAULT_VIDEO_FRAMING}),[editingMap,setEditingMap]=useState(true);
 const editorCanvas=useRef<HTMLCanvasElement>(null),previewArea=useRef<HTMLDivElement>(null);
 const [areaSize,setAreaSize]=useState({width:0,height:0});
 const framingRef=useRef(framing);framingRef.current=framing;
 const viewRef=useRef(view);viewRef.current=view;
 const closeButton=useRef<HTMLButtonElement>(null);
 const canvas=useRef<HTMLCanvasElement>(null),scene=useRef<RouteVideoScene|null>(null),generation=useRef<AbortController|null>(null),previewFrame=useRef(0),fileUrl=useRef<string|null>(null),alive=useRef(true);
 const [loading,setLoading]=useState(true),[recording,setRecording]=useState(false),[playing,setPlaying]=useState(false),[duration,setDuration]=useState(12),[progress,setProgress]=useState(0),[error,setError]=useState(''),[message,setMessage]=useState(''),[warnings,setWarnings]=useState<string[]>([]),[file,setFile]=useState<VideoFile|null>(null);
 const mime=localVideoMime();const format=file?file.extension.toUpperCase():mime?videoFileExtension(mime).toUpperCase():null;
 const clearFile=()=>{if(fileUrl.current)URL.revokeObjectURL(fileUrl.current);fileUrl.current=null;setFile(null);};
 const drawFrame=(p:number,prepared=scene.current)=>{
  if(!canvas.current||!prepared)return;prepared.draw(canvas.current,p,viewRef.current,framingRef.current);
  const editor=editorCanvas.current;if(editor){const context=editor.getContext('2d');context?.clearRect(0,0,656,650);context?.drawImage(canvas.current,32,300,656,650,0,0,656,650);}
 };
 const stopPreview=()=>{cancelAnimationFrame(previewFrame.current);setPlaying(false);};
 useEffect(()=>{
  alive.current=true;const controller=new AbortController();let currentScene:RouteVideoScene|null=null;
  setLoading(true);setError('');setWarnings([]);setMessage('');stopPreview();clearFile();
  void createRouteVideoScene({...input,mapMode:background},controller.signal).then(created=>{
   if(controller.signal.aborted){created.dispose();return;}
   currentScene=created;scene.current=created;setWarnings(created.warnings);drawFrame(0,created);setLoading(false);
  }).catch(e=>{if(!controller.signal.aborted){setError(e.message||'Não foi possível preparar o vídeo.');setLoading(false);}});
  return()=>{alive.current=false;controller.abort();generation.current?.abort();cancelAnimationFrame(previewFrame.current);currentScene?.dispose();scene.current=null;if(fileUrl.current)URL.revokeObjectURL(fileUrl.current);fileUrl.current=null;};
 },[prepareVersion,background,input.points,input.title,input.athleteName,input.date,input.distanceKm,input.durationSeconds,input.avgPace,input.mapMode,input.routeColor,input.logoUrl,input.showLogo,input.showKm,input.showKmPace,input.kmSplits]);
 useEffect(()=>{stopPreview();clearFile();setMessage('');setError('');if(!loading)drawFrame(0);},[view,framing]);
 useEffect(()=>{if(editingMap)drawFrame(0);},[editingMap]);
 useEffect(()=>{const area=previewArea.current;if(!area)return;const observer=new ResizeObserver(entries=>{const {width,height}=entries[0].contentRect;setAreaSize({width,height});});observer.observe(area);return()=>observer.disconnect();},[]);
 const openEditor=()=>{stopPreview();clearFile();setMessage('');setEditingMap(true);};
 const preview=()=>{
  if(!canvas.current||!scene.current)return;setEditingMap(false);stopPreview();setError('');setMessage('');clearFile();setPlaying(true);const started=performance.now();
  const frame=()=>{if(!canvas.current||!scene.current)return;const elapsed=(performance.now()-started)/1000;drawFrame(routeAnimationProgress(elapsed,duration));if(elapsed<duration)previewFrame.current=requestAnimationFrame(frame);else{drawFrame(1);setPlaying(false);}};
  previewFrame.current=requestAnimationFrame(frame);
 };
 const generate=async()=>{
  if(generation.current)return;
  if(!canvas.current||!scene.current){setError('O percurso ainda não está pronto. Tente preparar novamente.');return;}setEditingMap(false);stopPreview();clearFile();setRecording(true);setProgress(0);setError('');setMessage('');setStage('starting');
  const controller=new AbortController();generation.current=controller;let lastUpdate=0;
  try{
   const prepared=scene.current,selectedView=view,selectedFraming={...framing};
   const recordingScene:RouteVideoScene={...prepared,draw:(target,p)=>prepared.draw(target,p,selectedView,selectedFraming)};
   const result=await recordRouteVideo(canvas.current,recordingScene,duration,controller.signal,value=>{if(alive.current&&(value===1||performance.now()-lastUpdate>100)){lastUpdate=performance.now();setProgress(value);}},value=>{if(alive.current)setStage(value);});
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
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null,overflow=document.body.style.overflow;document.body.style.overflow='hidden';closeButton.current?.focus();
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();}};
  window.addEventListener('keydown',escape);return()=>{window.removeEventListener('keydown',escape);document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
 },[]);
 const button='flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-sm disabled:opacity-40';
 const mapEditing=editingMap&&!file&&!recording;
 const ratio=mapEditing?656/650:720/1280;
 const fittedWidth=Math.max(1,Math.min(areaSize.width,areaSize.height*ratio));
 const ready=!loading&&!!scene.current;
 return createPortal(<div className="fixed inset-0 z-[100001] bg-slate-950 text-white flex flex-col" role="dialog" aria-modal="true" aria-labelledby="route-video-title" onClick={event=>event.stopPropagation()}>
  <header className="shrink-0 px-4 py-3 border-b border-white/10 flex items-center justify-between gap-3" style={{paddingTop:'max(12px, env(safe-area-inset-top))'}}>
   <div><h2 id="route-video-title" className="font-black uppercase italic flex gap-2 items-center"><Video className="text-emerald-400" size={20}/>Vídeo do percurso</h2><p className="text-xs text-slate-400 mt-1">{mapEditing?'Pinça para aproximar · dois dedos para girar':'Prévia vertical · 720 × 1280'}</p></div>
   <button ref={closeButton} type="button" aria-label="Fechar vídeo do percurso" className="p-3 rounded-xl bg-white/10" onClick={close}><X size={20}/></button>
  </header>
  <div className="shrink-0 grid grid-cols-2 gap-3 px-4 py-2 border-b border-white/10">
   <label className="text-xs font-bold">Ângulo<select aria-label="Ângulo do vídeo" className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900 px-2 py-2" value={view} disabled={recording} onChange={event=>{openEditor();setView(event.target.value as RouteVideoView);}}><option value="overhead">Vista superior</option><option value="immersive">Perspectiva imersiva</option></select></label>
   <label className="text-xs font-bold">Fundo do mapa<select aria-label="Fundo do vídeo" className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900 px-2 py-2" value={background} disabled={recording} onChange={event=>{openEditor();setBackground(event.target.value as typeof background);}}><option value="standard">Ruas</option><option value="satellite">Satélite</option><option value="transparent">Fundo limpo</option></select></label>
  </div>
  <main ref={previewArea} className="flex-1 min-h-0 flex items-center justify-center bg-[#03151a] p-2 overflow-hidden relative" aria-label={mapEditing?'Editor de mapa em tela cheia':'Prévia do vídeo'}>
   <div className={`relative shrink-0 ${mapEditing?'hidden':''}`} style={{width:fittedWidth,aspectRatio:'9 / 16'}}>
    <canvas ref={canvas} width={720} height={1280} aria-label="Prévia do percurso animado" className={`w-full h-full rounded-lg ${file?'hidden':''}`}/>
    {file&&<video key={file.url} src={file.url} controls playsInline preload="metadata" aria-label="Vídeo gerado do treino" className="w-full h-full rounded-lg"/>}
   </div>
   {mapEditing&&<div className="relative shrink-0" style={{width:fittedWidth,aspectRatio:'656 / 650'}}>
    <canvas ref={editorCanvas} width={656} height={650} aria-label="Mapa ampliado para ajuste do vídeo" className="w-full h-full rounded-lg"/>
    {ready&&<RouteVideoMapGesture fullPanel value={framing} onChange={value=>setFraming(normalizeVideoFraming(value))} onStart={stopPreview}/>}
   </div>}
   {loading&&<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90"><RefreshCw className="animate-spin text-emerald-400"/><p className="text-sm">Preparando percurso e mapa…</p></div>}
  </main>
  <footer className="shrink-0 border-t border-white/10 px-4 pt-3 space-y-2 bg-slate-950" style={{paddingBottom:'max(12px, env(safe-area-inset-bottom))'}}>
   {error&&<p role="alert" className="rounded-xl bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</p>}
   {message&&<p role="status" className="text-xs text-emerald-200">{message}</p>}
   {warnings.length>0&&<div className="max-h-12 overflow-y-auto text-xs text-amber-200">{warnings.map(warning=><p key={warning}>{warning}</p>)}</div>}
   {!mime&&<p className="text-xs text-amber-200">Este navegador permite a prévia, mas não grava vídeo.</p>}
   {format==='WEBM'&&<p className="text-xs text-amber-200">Formato WebM; alguns aplicativos de postagem exigem MP4.</p>}
   <div className="flex items-center justify-between gap-3">
    <label className="text-xs font-bold">Duração <select aria-label="Duração do vídeo" className="ml-1 rounded-lg border border-white/20 bg-slate-900 px-2 py-1" value={duration} disabled={recording} onChange={event=>{openEditor();setDuration(Number(event.target.value));}}>{[10,12,15].map(seconds=><option key={seconds} value={seconds}>{seconds}s</option>)}</select></label>
    {mapEditing?<button type="button" className="text-xs text-emerald-300 font-bold py-2 disabled:opacity-40" disabled={!ready} onClick={()=>setFraming({...DEFAULT_VIDEO_FRAMING})}>Mostrar percurso inteiro</button>:<button type="button" className="text-xs text-emerald-300 font-bold py-2 disabled:opacity-40" disabled={!ready||recording} onClick={openEditor}>Ajustar mapa</button>}
   </div>
   {!loading&&!scene.current&&<button type="button" className={`${button} w-full bg-emerald-600`} onClick={()=>setPrepareVersion(value=>value+1)}>Tentar preparar novamente</button>}
   {recording?<div className="space-y-2"><p role="status" className="text-sm text-emerald-300">{stage==='starting'?'Iniciando vídeo…':stage==='retrying'?'Tentando outro formato…':stage==='finalizing'?'Finalizando vídeo…':`Gerando vídeo… ${Math.round(progress*100)}%`}. Mantenha o app aberto.</p><progress aria-label="Progresso da geração" className="w-full accent-emerald-500" max={1} value={progress}/><button type="button" className={`${button} w-full bg-white/10`} onClick={()=>generation.current?.abort()}>Cancelar geração</button></div>:file?<div className="grid grid-cols-2 gap-2"><button type="button" className={`${button} bg-emerald-600`} onClick={download}><Download size={17}/>Baixar {file.extension.toUpperCase()}</button><button type="button" className={`${button} bg-white/10`} onClick={()=>void share()}><Share2 size={17}/>Compartilhar</button></div>:<div className="grid grid-cols-2 gap-2"><button type="button" className={`${button} bg-white/10`} disabled={!ready} onClick={()=>playing?stopPreview():preview()}><Play size={17}/>{playing?'Parar prévia':'Ver prévia'}</button><button type="button" className={`${button} bg-emerald-600`} disabled={!ready||!mime} onClick={()=>void generate()}><Video size={17}/>Gerar vídeo</button></div>}
   <p className="text-[11px] text-slate-400">{mapEditing?(view==='immersive'?'Perspectiva do mapa sem relevo 3D. Seus ajustes serão mantidos.':'Ajuste com os dedos e confira a prévia antes de gerar.'):'Percurso acelerado · métricas totais do treino · gerado no aparelho'}</p>
  </footer>
 </div>,document.body);
}

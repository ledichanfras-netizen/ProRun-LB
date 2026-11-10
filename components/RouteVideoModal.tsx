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
 const [framing,setFraming]=useState<RouteVideoFraming>({...DEFAULT_VIDEO_FRAMING}),[editingMap,setEditingMap]=useState(false);
 const editorCanvas=useRef<HTMLCanvasElement>(null),editingRef=useRef(editingMap);editingRef.current=editingMap;
 const framingRef=useRef(framing);framingRef.current=framing;
 const viewRef=useRef(view);viewRef.current=view;
 const scrollArea=useRef<HTMLDivElement>(null);
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
 useEffect(()=>{if(!editingMap)return;drawFrame(0);const overflow=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=overflow;};},[editingMap]);
 const openEditor=()=>{stopPreview();clearFile();setMessage('');setEditingMap(true);};
 const preview=()=>{
  if(!canvas.current||!scene.current)return;stopPreview();setError('');setMessage('');clearFile();setPlaying(true);const started=performance.now();
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
   const url=URL.createObjectURL(result.blob);fileUrl.current=url;setFile({...result,url,filename:safeVideoFilename(input.title,input.distanceKm,result.mimeType)});setMessage('Vídeo pronto. Confira a prévia antes de compartilhar.');scrollArea.current?.scrollTo({top:0});
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
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();if(editingRef.current)setEditingMap(false);else close();}};
  window.addEventListener('keydown',escape);return()=>{window.removeEventListener('keydown',escape);if(previous?.isConnected)previous.focus();};
 },[]);
 const button='flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-bold text-sm disabled:opacity-40';
 return createPortal(<div className={`fixed inset-0 z-[100001] bg-black/80 flex items-center justify-center ${editingMap?'p-0':'p-3 sm:p-5'}`} onClick={event=>{event.stopPropagation();close();}}><section role="dialog" aria-modal="true" aria-labelledby="route-video-title" className={`w-full flex flex-col overflow-hidden border border-white/15 bg-slate-950 text-white shadow-2xl ${editingMap?'h-[100dvh] max-h-[100dvh] max-w-none':'max-w-xl max-h-[96dvh] rounded-3xl'}`} onClick={e=>e.stopPropagation()}>
  <header className="shrink-0 z-10 bg-slate-950 border-b border-white/10 px-5 py-4 flex items-center justify-between gap-3"><div><h2 id="route-video-title" className="font-black uppercase italic flex gap-2 items-center"><Video className="text-emerald-400" size={20}/>{editingMap?'Ajustar mapa':'Vídeo do percurso'}</h2><p className="text-xs text-slate-400 mt-1">{editingMap?'Pinça para aproximar · dois dedos para girar':'Vertical 9:16 · gerado no aparelho'}</p></div><button ref={closeButton} type="button" aria-label={editingMap?'Voltar ao vídeo':'Fechar vídeo do percurso'} className="p-3 rounded-xl bg-white/10" onClick={()=>editingMap?setEditingMap(false):close()}><X size={20}/></button></header>
  {editingMap&&<div className="flex-1 min-h-0 flex items-center justify-center bg-[#03151a] p-2" aria-label="Editor de mapa em tela cheia">
   <div className="relative shrink-0" style={{width:'min(calc(100vw - 16px), calc((100dvh - 240px) * 656 / 650))',aspectRatio:'656 / 650'}}>
    <canvas ref={editorCanvas} width={656} height={650} aria-label="Mapa ampliado para ajuste do vídeo" className="w-full h-full rounded-lg"/>
    <RouteVideoMapGesture fullPanel value={framing} onChange={value=>setFraming(normalizeVideoFraming(value))} onStart={stopPreview}/>
   </div>
  </div>}
  <div ref={scrollArea} className={`${editingMap?'hidden':'p-4 sm:p-5 space-y-4 flex-1 min-h-0 overflow-y-auto'}`}>
   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
    <label className="text-sm font-bold">Ângulo do vídeo<select aria-label="Ângulo do vídeo" className="mt-2 w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-3" value={view} disabled={recording} onChange={e=>setView(e.target.value as RouteVideoView)}><option value="overhead">Vista superior</option><option value="immersive">Perspectiva imersiva</option></select></label>
    <label className="text-sm font-bold">Fundo do vídeo<select aria-label="Fundo do vídeo" className="mt-2 w-full rounded-xl border border-white/20 bg-slate-900 px-3 py-3" value={background} disabled={recording} onChange={e=>setBackground(e.target.value as typeof background)}><option value="standard">Ruas</option><option value="satellite">Satélite</option><option value="transparent">Fundo limpo</option></select></label>
   </div>
   {view==='immersive'&&<p className="text-xs text-slate-400">Câmera inclinada com movimento suave sobre o percurso GPS. O efeito não representa relevo ou prédios em 3D.</p>}
   <div className="rounded-xl border border-white/15 p-3 space-y-3">
    <div className="flex items-center justify-between gap-2"><span className="text-sm font-bold">Enquadramento do mapa</span><button type="button" className="text-xs text-emerald-300 font-bold disabled:opacity-40" disabled={recording||loading} onClick={()=>setFraming({...DEFAULT_VIDEO_FRAMING})}>Mostrar percurso inteiro</button></div>
    <button type="button" className="w-full rounded-xl py-3 text-sm font-bold bg-emerald-600 disabled:opacity-40" disabled={recording||loading} onClick={openEditor}>Ajustar mapa em tela cheia</button>
    <p className="text-xs text-slate-400">Arraste com um dedo. Use dois dedos para aproximar e girar. O vídeo usará o enquadramento escolhido.</p>
   </div>
   <div className="mx-auto w-full max-w-[380px] aspect-[9/16] rounded-2xl overflow-hidden bg-[#03151a] border border-white/10 relative">
    <canvas ref={canvas} width={720} height={1280} aria-label="Prévia do percurso animado" className={`w-full h-full ${file?'hidden':''}`}/>
    {file&&<video key={file.url} src={file.url} controls playsInline preload="metadata" aria-label="Vídeo gerado do treino" className="w-full h-full"/>}
    {loading&&<div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90"><RefreshCw className="animate-spin text-emerald-400"/><p className="text-sm">Preparando percurso e mapa…</p></div>}
   </div>
   {warnings.map(warning=><p key={warning} className="rounded-xl bg-amber-500/10 p-3 text-sm text-amber-200">{warning}</p>)}
   <div className="flex flex-wrap justify-between items-center gap-3"><label className="text-sm font-bold">Duração <select aria-label="Duração do vídeo" className="ml-2 rounded-xl border border-white/20 bg-slate-900 text-white px-3 py-2" value={duration} disabled={recording} onChange={e=>{stopPreview();clearFile();setDuration(Number(e.target.value));setMessage('');}}>{[10,12,15].map(seconds=><option key={seconds} value={seconds}>{seconds} segundos</option>)}</select></label><span className="text-xs text-slate-400">720 × 1280{format?' · '+format:''}</span></div>
   {!mime&&<p className="text-sm text-amber-200">Este navegador não grava vídeo. Você pode visualizar o percurso e continuar usando a postagem em imagem.</p>}
   {format==='WEBM'&&<p className="text-sm text-amber-200">Este aparelho oferece WebM. Alguns aplicativos de postagem exigem MP4; a imagem continua disponível como alternativa.</p>}
  </div>
  <footer className="shrink-0 border-t border-white/10 p-4 space-y-3 bg-slate-950" style={{paddingBottom:'max(16px, env(safe-area-inset-bottom))'}}>
   {editingMap?<>
    <div className="flex items-center justify-between gap-3"><p className="text-xs text-slate-400">Arraste, aproxime e gire com os dedos.</p><button type="button" className="text-xs font-bold text-emerald-300 py-2" onClick={()=>setFraming({...DEFAULT_VIDEO_FRAMING})}>Mostrar percurso inteiro</button></div>
    <div className="grid grid-cols-2 gap-2"><button type="button" className={`${button} bg-white/10`} onClick={()=>setEditingMap(false)}>Concluir ajuste</button><button type="button" className={`${button} bg-emerald-600`} disabled={!mime} onClick={()=>void generate()}><Video size={17}/>Gerar vídeo</button></div>
   </>:<>

   {error&&<p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
   {message&&<p role="status" className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-200">{message}</p>}
   {!loading&&!scene.current&&<button type="button" className={`${button} w-full bg-emerald-600`} onClick={()=>setPrepareVersion(value=>value+1)}>Tentar preparar novamente</button>}
   {recording?<div className="space-y-3"><p role="status" className="text-sm text-emerald-300">{stage==='starting'?'Iniciando vídeo…':stage==='retrying'?'Tentando outro formato…':stage==='finalizing'?'Finalizando vídeo…':`Gerando vídeo… ${Math.round(progress*100)}%`}. Mantenha o app aberto.</p><progress aria-label="Progresso da geração" className="w-full accent-emerald-500" max={1} value={progress}/><button type="button" className={`${button} w-full bg-white/10`} onClick={()=>generation.current?.abort()}>Cancelar geração</button></div>:<div className="grid grid-cols-2 gap-2"><button type="button" className={`${button} bg-white/10`} disabled={loading||!scene.current} onClick={()=>playing?stopPreview():preview()}><Play size={17}/>{playing?'Parar prévia':'Ver prévia'}</button><button type="button" className={`${button} bg-emerald-600`} disabled={loading||!scene.current||!mime} onClick={()=>void generate()}><Video size={17}/>{loading?'Preparando…':file?'Gerar novamente':'Gerar vídeo'}</button></div>}
   {file&&!recording&&<div className="grid grid-cols-2 gap-2"><button type="button" className={`${button} bg-emerald-600`} onClick={download}><Download size={17}/>Baixar {file.extension.toUpperCase()}</button><button type="button" className={`${button} bg-white/10`} onClick={()=>void share()}><Share2 size={17}/>Compartilhar</button></div>}
   <p className="text-xs text-slate-400">A animação reproduz o percurso de forma acelerada. As métricas são os totais salvos do treino. O vídeo não é enviado ao servidor.</p>
   </>}
  </footer>
 </section></div>,document.body);
}

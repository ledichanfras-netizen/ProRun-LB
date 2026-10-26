import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ComposedChart,Line,XAxis,YAxis,CartesianGrid,Tooltip,ResponsiveContainer,Brush} from 'recharts';
import {Maximize2,RotateCw,Plus,Minus,RotateCcw,X} from 'lucide-react';
import {TelemetryPoint} from '../utils/runningMetrics';
import {telemetryChartData,telemetryMetricNames,zoomTelemetryRange,panTelemetryRange,type TelemetryMetric,type SampleRange} from '../utils/telemetryChart';

const time=(seconds:number)=>`${Math.floor(seconds/60).toString().padStart(2,'0')}:${Math.floor(seconds%60).toString().padStart(2,'0')}`;
const km=(distance:number)=>distance.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const units:Record<TelemetryMetric,string>={paceSeconds:'min/km',heartRate:'bpm',cadenceSpm:'passadas/min',altitudeMeters:'m'};
export function TelemetryExplorer({samples,metric,isLight}:{samples:TelemetryPoint[];metric:TelemetryMetric;isLight:boolean;totalDistanceKm?:number;totalDurationSeconds?:number}) {
  const data=useMemo(()=>telemetryChartData(samples),[samples]);
  const [primary,setPrimary]=useState(metric),[overlay,setOverlay]=useState<TelemetryMetric|''>('');
  const [axis,setAxis]=useState<'distanceKm'|'durationSeconds'>('durationSeconds');
  const [expanded,setExpanded]=useState(false),[rotated,setRotated]=useState(false);
  const [selected,setSelected]=useState<SampleRange|null>(null);
  const range=selected ? {start:Math.min(selected.start,Math.max(0,data.length-2)),end:Math.min(selected.end,data.length-1)} : {start:0,end:Math.max(0,data.length-1)};
  const count=(key:TelemetryMetric)=>data.filter(p=>p[key]!==null).length;
  const secondary=overlay&&overlay!==primary&&count(overlay)>=2?overlay:'';
  const cardiac=data.flatMap(p=>p.heartRate===null?[]:[p.heartRate]);
  const flat=cardiac.length>=2&&cardiac.every(value=>value===cardiac[0]);
  const colors:Record<TelemetryMetric,string>={paceSeconds:isLight?'#047857':'#34d399',heartRate:isLight?'#be123c':'#fb7185',cadenceSpm:isLight?'#7e22ce':'#c084fc',altitudeMeters:isLight?'#a16207':'#facc15'};
  const field=`mt-1 block w-full min-w-0 rounded-xl border p-2.5 text-xs ${isLight?'bg-white text-slate-900 border-slate-300':'bg-slate-950 text-slate-100 border-slate-600'}`;
  const button=`rounded-xl border px-3 py-2 text-xs font-bold inline-flex items-center justify-center gap-2 ${isLight?'bg-white text-slate-800 border-slate-300':'bg-slate-800 text-slate-100 border-slate-600'}`;
  const pointers=useRef(new Map<number,{x:number;y:number}>());
  const gesture=useRef<{range:SampleRange;distance:number;x:number}|null>(null);
  useEffect(()=>{setPrimary(metric);},[metric]);
  useEffect(()=>{if(!expanded)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';const close=(e:KeyboardEvent)=>{if(e.key==='Escape')setExpanded(false);};window.addEventListener('keydown',close);return()=>{document.body.style.overflow=previous;window.removeEventListener('keydown',close);pointers.current.clear();gesture.current=null;};},[expanded]);
  const currentRange=useRef(range);currentRange.current=range;
  const coordinate=(point:{x:number;y:number})=>rotated?point.y:point.x;
  const begin=(event:React.PointerEvent<HTMLDivElement>)=>{
    if(!expanded||event.pointerType!=='touch'||(event.target as Element).closest('.recharts-brush'))return;
    event.currentTarget.setPointerCapture(event.pointerId);pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    const points=[...pointers.current.values()];gesture.current={range:currentRange.current,distance:points.length>1?Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y):0,x:coordinate(points[0])};
  };
  const move=(event:React.PointerEvent<HTMLDivElement>)=>{
    if(!pointers.current.has(event.pointerId)||!gesture.current)return;
    pointers.current.set(event.pointerId,{x:event.clientX,y:event.clientY});const points=[...pointers.current.values()],start=gesture.current;
    if(points.length>1){const distance=Math.hypot(points[1].x-points[0].x,points[1].y-points[0].y);if(distance>5&&start.distance>5)setSelected(zoomTelemetryRange(start.range,start.distance/distance,data.length));}
    else {const box=event.currentTarget.getBoundingClientRect();const width=rotated?box.height:box.width;setSelected(panTelemetryRange(start.range,(start.x-coordinate(points[0]))/Math.max(1,width)*(start.range.end-start.range.start),data.length));}
  };
  const end=(event:React.PointerEvent<HTMLDivElement>)=>{pointers.current.delete(event.pointerId);gesture.current=null;};
  const label=(value:number)=>axis==='distanceKm'?`${km(value)} km`:time(value);
  const lineLabel=(key:TelemetryMetric,value:number)=>key==='paceSeconds'?time(value):Math.round(value).toLocaleString('pt-BR');
  const content=<div className={`telemetry-explorer flex flex-col min-h-0 min-w-0 ${expanded?'h-full p-2':'space-y-4'}`} data-telemetry-comparison data-expanded={expanded}>
    <div className="flex flex-wrap items-center justify-between gap-2 mb-2"><h4 className={`text-xs font-black uppercase italic ${isLight?'text-slate-900':'text-white'}`}>Análise do treino</h4><div className="flex gap-2">{expanded&&<button type="button" className={button} onClick={()=>setRotated(!rotated)} aria-pressed={rotated} aria-label="Girar gráfico"><RotateCw size={16}/><span>Girar</span></button>}<button type="button" className={button} onClick={()=>setExpanded(!expanded)} aria-label={expanded?'Fechar gráfico ampliado':'Ampliar gráfico'}>{expanded?<X size={16}/>:<Maximize2 size={16}/>}<span>{expanded?'Fechar':'Ampliar'}</span></button></div></div>
    <div className={`grid gap-2 mb-2 ${expanded?'grid-cols-3':'grid-cols-1 sm:grid-cols-3'}`}>
      <label className="text-[10px] font-black uppercase text-slate-400">Métrica principal<select className={field} aria-label="Métrica principal" value={primary} onChange={e=>setPrimary(e.target.value as TelemetryMetric)}>{(Object.keys(telemetryMetricNames) as TelemetryMetric[]).map(key=><option key={key} value={key}>{telemetryMetricNames[key]}</option>)}</select></label>
      <label className="text-[10px] font-black uppercase text-slate-400">Sobrepor métrica<select className={field} aria-label="Sobrepor métrica" value={secondary} onChange={e=>setOverlay(e.target.value as TelemetryMetric|'')}><option value="">Sem sobreposição</option>{(Object.keys(telemetryMetricNames) as TelemetryMetric[]).filter(key=>key!==primary).map(key=><option key={key} value={key} disabled={count(key)<2}>{telemetryMetricNames[key]}{count(key)<2?' · sem série suficiente':''}</option>)}</select></label>
      <label className="text-[10px] font-black uppercase text-slate-400">Eixo horizontal<select className={field} aria-label="Eixo horizontal" value={axis} onChange={e=>{setAxis(e.target.value as typeof axis);}}><option value="durationSeconds">Tempo de treino</option><option value="distanceKm">Distância (km)</option></select></label>
    </div>
    {(primary==='heartRate'||secondary==='heartRate')&&flat&&<p role="status" className="text-xs text-slate-400 mb-2">O arquivo salvo contém {cardiac.length} amostras de FC com o mesmo valor ({cardiac[0]} bpm). As oscilações ausentes não podem ser reconstruídas pela média.</p>}
    <div className="flex flex-wrap gap-3 text-[10px] font-bold mb-2" aria-label="Legenda das métricas">{[primary,...(secondary?[secondary]:[])].map((key,index)=><span key={key} className={isLight?'text-slate-700':'text-slate-200'}><span style={{display:'inline-block',height:3,width:18,background:colors[key as TelemetryMetric],marginRight:5}}/>{telemetryMetricNames[key as TelemetryMetric]} · {units[key as TelemetryMetric]} · {index?'direita, tracejada':'esquerda'}</span>)}</div>
    <div className="flex flex-wrap items-center gap-2 mb-2"><button className={button} type="button" aria-label="Aumentar zoom" disabled={data.length<2} onClick={()=>setSelected(zoomTelemetryRange(range,.5,data.length))}><Plus size={15}/></button><button className={button} type="button" aria-label="Diminuir zoom" onClick={()=>setSelected(zoomTelemetryRange(range,2,data.length))}><Minus size={15}/></button><button className={button} type="button" onClick={()=>setSelected(null)}><RotateCcw size={14}/>Treino completo</button><span data-telemetry-range className="text-[10px] text-slate-400">{data[range.start]&&data[range.end]?`${label(data[range.start][axis])} – ${label(data[range.end][axis])}`:'Sem amostras'}</span></div>
    {count(primary)>=2?<div data-telemetry-chart className={expanded?'flex-1 min-h-[150px] min-w-0':'h-72 sm:h-80 w-full min-w-0'} style={{touchAction:expanded?'none':'pan-y'}} onPointerDown={begin} onPointerMove={move} onPointerUp={end} onPointerCancel={end}>
      <ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{top:12,right:0,left:0,bottom:5}}>
        <CartesianGrid strokeDasharray="3 3" stroke={isLight?'#e2e8f0':'#ffffff15'}/><XAxis type="number" dataKey={axis} domain={['dataMin','dataMax']} tickFormatter={value=>label(Number(value))} tick={{fill:isLight?'#475569':'#cbd5e1',fontSize:10}} minTickGap={28}/>
        <YAxis yAxisId="primary" allowDecimals={primary==='paceSeconds'} width={48} dataKey={primary} reversed={primary==='paceSeconds'} domain={['auto','auto']} tickFormatter={value=>lineLabel(primary,Number(value))} tick={{fill:colors[primary],fontSize:10}}/>
        {secondary&&<YAxis yAxisId="secondary" allowDecimals={secondary==='paceSeconds'} width={48} orientation="right" dataKey={secondary} reversed={secondary==='paceSeconds'} domain={['auto','auto']} tickFormatter={value=>lineLabel(secondary,Number(value))} tick={{fill:colors[secondary],fontSize:10}}/>}
        <Tooltip content={({active,payload})=>{if(!active||!payload?.length)return null;const point=payload[0].payload as typeof data[number];return <div className={`max-w-[240px] rounded-xl border p-3 text-xs shadow-lg ${isLight?'bg-white border-slate-200 text-slate-900':'bg-slate-900 border-slate-600 text-white'}`}><p className="font-bold mb-2">{km(point.distanceKm)} km · {time(point.durationSeconds)}</p>{[primary,...(secondary?[secondary]:[])].map(key=>{const value=point[key as TelemetryMetric];return <p key={key}>{telemetryMetricNames[key as TelemetryMetric]}: <strong>{value===null?'Sem leitura':`${lineLabel(key as TelemetryMetric,value)} ${units[key as TelemetryMetric]}`}</strong></p>})}</div>;}}/>
        <Line yAxisId="primary" type="linear" dataKey={primary} stroke={colors[primary]} strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false}/>{secondary&&<Line yAxisId="secondary" type="linear" dataKey={secondary} stroke={colors[secondary]} strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls={false} isAnimationActive={false}/>}
        <Brush dataKey={axis} startIndex={range.start} endIndex={range.end} onChange={next=>{if(next.startIndex!=null&&next.endIndex!=null&&next.endIndex>next.startIndex)setSelected({start:next.startIndex,end:next.endIndex});}} height={24} travellerWidth={12} stroke={isLight?'#047857':'#34d399'} fill={isLight?'#f0fdf4':'#0f172a'} tickFormatter={value=>label(Number(value))}/>
      </ComposedChart></ResponsiveContainer>
    </div>:<p role="status" className="rounded-xl border border-slate-500/30 p-4 text-xs text-slate-400">{primary==='heartRate'?'Sem série de frequência cardíaca suficiente. Uma FC média preenchida manualmente não gera uma curva.':'Sem amostras suficientes desta métrica.'}</p>}
    <p className={`text-[10px] text-slate-400 mt-2 ${expanded?'hidden':''}`}>{expanded?'Use dois dedos para aproximar e um dedo para mover o trecho. ':''}Arraste as extremidades da faixa inferior para escolher um trecho. A sobreposição mantém escalas separadas e lacunas sem leitura. {expanded?'':'Amplie para usar pinça e girar o gráfico.'}</p>
  </div>;
  return expanded?createPortal(<div role="dialog" aria-modal="true" aria-label="Gráfico de telemetria ampliado" className={`fixed inset-0 z-[30000] overflow-hidden ${isLight?'bg-white text-slate-900':'bg-slate-950 text-white'}`}><div data-telemetry-stage data-rotated={rotated} style={rotated?{position:'absolute',left:'50%',top:'50%',width:'100dvh',height:'100dvw',transform:'translate(-50%,-50%) rotate(90deg)',overflowY:'auto'}:{height:'100dvh',overflowY:'auto'}}>{content}</div></div>,document.body):content;
}

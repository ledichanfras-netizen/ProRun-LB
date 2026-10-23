import { telemetryChartData, telemetryMetricNames, type TelemetryMetric } from '../utils/telemetryChart';
import React, { useState } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  HeartPulse,
  Activity,
  Footprints,
  Mountain,
  Trophy,
  TrendingUp,
  Layers,
} from 'lucide-react';
import { KmSplit, TelemetryPoint } from '../utils/runningMetrics';

interface WorkoutTelemetryChartsProps {
  kmSplits?: KmSplit[];
  telemetrySamples?: TelemetryPoint[];
  avgPace?: string;
  avgHeartRate?: number;
  maxHeartRate?: number;
  avgCadence?: number;
  maxCadence?: number;
  calories?: number;
  elevationGainMeters?: number;
  totalDistanceKm?: number;
  totalDurationSeconds?: number;
  isLight?: boolean;
}

export const WorkoutTelemetryCharts: React.FC<WorkoutTelemetryChartsProps> = ({
  kmSplits = [],
  telemetrySamples = [],
  avgPace = '--:--',
  avgHeartRate,
  maxHeartRate,
  avgCadence,
  maxCadence,
  calories,
  elevationGainMeters,
  totalDistanceKm = 0,
  totalDurationSeconds = 0,
  isLight = false
}) => {
  const [activeTab, setActiveTab] = useState<'splits' | 'pace' | 'cadence' | 'elevation' | 'heartRate'>('splits');

  const [overlay, setOverlay] = useState<TelemetryMetric | ''>('');
  const [horizontalAxis,setHorizontalAxis] = useState<'distanceKm' | 'durationSeconds'>('distanceKm');
  const chartData = telemetryChartData(telemetrySamples);
  const count = (metric:TelemetryMetric) => chartData.filter(point=>point[metric]!==null).length;
  const primary:TelemetryMetric = activeTab==='heartRate'?'heartRate':activeTab==='cadence'?'cadenceSpm':activeTab==='elevation'?'altitudeMeters':'paceSeconds';
  const secondary = overlay && overlay!==primary && count(overlay)>=2 ? overlay : '';
  const units:Record<TelemetryMetric,string> = {paceSeconds:'min/km',heartRate:'bpm',cadenceSpm:'passadas/min',altitudeMeters:'m'};
  const colors:Record<TelemetryMetric,string> = {paceSeconds:isLight?'#047857':'#34d399',heartRate:isLight?'#be123c':'#fb7185',cadenceSpm:isLight?'#7e22ce':'#c084fc',altitudeMeters:isLight?'#a16207':'#facc15'};

  // Find best (fastest) split
  const bestSplitIndex = kmSplits.reduce((bestIdx, split, idx, arr) => {
    if (bestIdx === -1) return idx;
    return split.paceSeconds < arr[bestIdx].paceSeconds ? idx : bestIdx;
  }, -1);

  // Format seconds to mm:ss for axis & tooltip
  const formatSecToMinSec = (sec: number) => {
    if (!Number.isFinite(sec) || sec < 0) return '--:--';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Format pace axis tick
  const paceTickFormatter = (sec: number) => {
    return formatSecToMinSec(sec);
  };

  // Distance tick formatter
  const distTickFormatter = (km: number) => {
    return `${km}k`;
  };

  const hasTelemetry = telemetrySamples && telemetrySamples.length > 1;
  const hasSplits = kmSplits && kmSplits.length > 0;

  return (
    <div className={`rounded-2xl border transition-all overflow-hidden ${
      isLight ? 'bg-white border-slate-200' : 'bg-slate-900/90 border-white/10'
    }`}>
      {/* Header com Navegação de Métricas Esportivas */}
      <div className={`p-3 sm:p-4 border-b flex flex-wrap items-center justify-between gap-2 ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
      }`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h4 className={`text-xs sm:text-sm font-black uppercase italic tracking-tight ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}>
              Telemetria & Gráficos de Performance
            </h4>
            <p className="text-[10px] text-slate-400 font-medium">
              Parciais, frequência cardíaca e comparação de métricas
            </p>
          </div>
        </div>

        {/* Abas */}
        <div className={`flex flex-wrap items-center p-1 rounded-xl border text-[11px] font-bold ${
          isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-950/60 border-white/10'
        }`}>
          <button
            type="button"
            onClick={() => setActiveTab('splits')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'splits'
                ? 'bg-emerald-500 text-white shadow-xs font-black'
                : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Parciais ({kmSplits.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pace')}
            disabled={!hasTelemetry}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'pace'
                ? 'bg-emerald-500 text-white shadow-xs font-black'
                : hasTelemetry
                ? isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                : 'opacity-40 cursor-not-allowed text-slate-500'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Ritmo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cadence')}
            disabled={!hasTelemetry}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'cadence'
                ? 'bg-emerald-500 text-white shadow-xs font-black'
                : hasTelemetry
                ? isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                : 'opacity-40 cursor-not-allowed text-slate-500'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            <span>Cadência</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('elevation')}
            disabled={!hasTelemetry}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'elevation'
                ? 'bg-emerald-500 text-white shadow-xs font-black'
                : hasTelemetry
                ? isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                : 'opacity-40 cursor-not-allowed text-slate-500'
            }`}
          >
            <Mountain className="w-3.5 h-3.5" />
            <span>Elevação</span>
          </button>
          <button type="button" aria-pressed={activeTab==='heartRate'} onClick={()=>setActiveTab('heartRate')} className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${activeTab==='heartRate'?'bg-emerald-700 text-white':isLight?'text-slate-700':'text-slate-200'}`}><HeartPulse className="w-3.5 h-3.5"/>FC</button>
        </div>
      </div>

      {/* Resumo Rápido Superior */}
      <div className={`grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 sm:p-4 border-b ${
        isLight ? 'bg-slate-50/50 border-slate-100' : 'bg-white/[0.02] border-white/5'
      }`}>
        <div className={`p-2.5 rounded-xl border ${
          isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/5'
        }`}>
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
            Ritmo Médio
          </span>
          <span className={`text-base font-black font-mono italic ${
            isLight ? 'text-emerald-700' : 'text-emerald-400'
          }`}>
            {avgPace} <span className="text-[10px] font-bold">/km</span>
          </span>
        </div>

        <div className={`p-2.5 rounded-xl border ${
          isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/5'
        }`}>
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
            Cadência Média
          </span>
          <span className={`text-base font-black font-mono italic ${
            isLight ? 'text-purple-700' : 'text-purple-400'
          }`}>
            {avgCadence ? `${avgCadence} SPM` : 'Não informado'}
          </span>
        </div>

        <div className={`p-2.5 rounded-xl border ${
          isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/5'
        }`}>
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
            Calorias Estimadas
          </span>
          <span className={`text-base font-black font-mono italic ${
            isLight ? 'text-orange-700' : 'text-orange-400'
          }`}>
            {calories ? `${calories} kcal` : '--'}
          </span>
        </div>

        <div className={`p-2.5 rounded-xl border ${
          isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/5'
        }`}>
          <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
            Ganho de Elevação
          </span>
          <span className={`text-base font-black font-mono italic ${
            isLight ? 'text-blue-700' : 'text-blue-400'
          }`}>
            +{elevationGainMeters || 0}m
          </span>
        </div>
      </div>

      <div className={`grid grid-cols-2 gap-2 p-3 sm:px-4 border-b ${isLight?'border-slate-200':'border-white/10'}`}>
        {[['FC média',avgHeartRate],['FC máxima',maxHeartRate]].map(([label,value])=><div key={String(label)} className={`rounded-xl border p-2.5 min-w-0 ${isLight?'bg-rose-50 border-rose-100':'bg-rose-950/20 border-rose-500/20'}`}><span className="block text-[9px] font-black uppercase text-slate-400">{label}</span><strong className={`text-base font-mono ${isLight?'text-rose-700':'text-rose-300'}`}>{typeof value==='number'&&Number.isFinite(value)&&value>0?`${Math.round(value)} bpm`:'Não informada'}</strong></div>)}
      </div>

      {/* Conteúdo da Aba */}
      <div className="p-3 sm:p-4">
        {/* ABA: TABELA DE PARCIAIS POR KM */}
        {activeTab === 'splits' && (
          <div className="space-y-3">
            {hasSplits ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className={`text-[9px] font-black uppercase tracking-wider border-b ${
                      isLight ? 'text-slate-500 border-slate-200' : 'text-slate-400 border-white/10'
                    }`}>
                      <th className="pb-2 pl-2">Quilômetro</th>
                      <th className="pb-2">Tempo Parcial</th>
                      <th className="pb-2">Ritmo (Pace)</th>
                      <th className="pb-2">Cadência Média</th>
                      <th className="pb-2">Calorias</th>
                      <th className="pb-2 text-right pr-2">Tempo Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono text-xs">
                    {kmSplits.map((split, idx) => {
                      const isBest = idx === bestSplitIndex && kmSplits.length > 1;
                      return (
                        <tr
                          key={split.km}
                          className={`transition-colors ${
                            isBest
                              ? isLight ? 'bg-emerald-50/80 font-bold' : 'bg-emerald-500/10 font-bold'
                              : isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          <td className="py-2.5 pl-2 font-bold flex items-center gap-1.5">
                            <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] ${
                              isBest 
                                ? 'bg-emerald-500 text-white' 
                                : isLight ? 'bg-slate-200 text-slate-700' : 'bg-white/10 text-slate-300'
                            }`}>
                              {split.km}
                            </span>
                            <span className={isLight ? 'text-slate-800' : 'text-white'}>KM {split.km}</span>
                            {isBest && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] bg-emerald-500 text-white font-black uppercase tracking-tighter">
                                <Trophy className="w-2.5 h-2.5" /> Melhor KM
                              </span>
                            )}
                          </td>
                          <td className={`py-2.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                            {formatSecToMinSec(split.durationSeconds)}
                          </td>
                          <td className={`py-2.5 font-bold ${
                            isBest 
                              ? isLight ? 'text-emerald-700' : 'text-emerald-400' 
                              : isLight ? 'text-amber-700' : 'text-amber-400'
                          }`}>
                            {split.pace} /km
                          </td>
                          <td className={`py-2.5 ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>
                            {split.avgCadence ? `${split.avgCadence} SPM` : '--'}
                          </td>
                          <td className={`py-2.5 ${isLight ? 'text-orange-700' : 'text-orange-400'}`}>
                            {split.calories ? `${split.calories} kcal` : '--'}
                          </td>
                          <td className={`py-2.5 text-right pr-2 text-slate-400`}>
                            {formatSecToMinSec(split.splitTimeSeconds)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Footprints className="w-8 h-8 mx-auto mb-2 opacity-40 text-emerald-400" />
                <p className="font-bold">Nenhuma parcial de KM registrada ainda.</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Corra pelo menos 1 km com o GPS para gerar o histórico de parciais e alertas de voz.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab !== 'splits' && <div className="space-y-4" data-telemetry-comparison>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-[10px] font-black uppercase text-slate-400">Sobrepor métrica
              <select aria-label="Sobrepor métrica" value={secondary} onChange={event=>setOverlay(event.target.value as TelemetryMetric | '')} className={`block w-full mt-2 p-3 rounded-xl border text-xs ${isLight?'bg-white text-slate-900 border-slate-300':'bg-slate-950 text-slate-100 border-slate-600'}`}>
                <option value="">Sem sobreposição</option>{(Object.keys(telemetryMetricNames) as TelemetryMetric[]).filter(metric=>metric!==primary).map(metric=><option key={metric} value={metric} disabled={count(metric)<2}>{telemetryMetricNames[metric]}{count(metric)<2?' · sem série suficiente':''}</option>)}
              </select>
            </label>
            <label className="text-[10px] font-black uppercase text-slate-400">Eixo horizontal
              <select aria-label="Eixo horizontal" value={horizontalAxis} onChange={event=>setHorizontalAxis(event.target.value as typeof horizontalAxis)} className={`block w-full mt-2 p-3 rounded-xl border text-xs ${isLight?'bg-white text-slate-900 border-slate-300':'bg-slate-950 text-slate-100 border-slate-600'}`}><option value="distanceKm">Distância (km)</option><option value="durationSeconds">Tempo de treino</option></select>
            </label>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] font-bold" aria-label="Legenda das métricas">{[primary,...(secondary?[secondary]:[])].map(metric=><span key={metric} className={isLight?'text-slate-700':'text-slate-200'}><span aria-hidden="true" style={{display:'inline-block',width:18,height:3,background:colors[metric as TelemetryMetric],marginRight:6,verticalAlign:'middle'}}/>{telemetryMetricNames[metric as TelemetryMetric]} · {units[metric as TelemetryMetric]} · {metric===primary?'eixo esquerdo':'eixo direito'}</span>)}</div>
          {count(primary)>=2 ? <div className="h-64 sm:h-72 w-full min-w-0" data-telemetry-chart>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{top:12,right:0,left:0,bottom:12}}>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight?'#e2e8f0':'#ffffff15'}/>
                <XAxis type="number" dataKey={horizontalAxis} domain={['dataMin','dataMax']} tickFormatter={value=>horizontalAxis==='distanceKm'?`${Number(value).toLocaleString('pt-BR',{maximumFractionDigits:2})}k`:formatSecToMinSec(Number(value))} tick={{fill:isLight?'#475569':'#cbd5e1',fontSize:10}} minTickGap={24}/>
                <YAxis yAxisId="primary" width={48} dataKey={primary} reversed={primary==='paceSeconds'} domain={['auto','auto']} tickFormatter={value=>primary==='paceSeconds'?paceTickFormatter(Number(value)):Math.round(Number(value)).toLocaleString('pt-BR')} tick={{fill:colors[primary],fontSize:10}}/>
                {secondary&&<YAxis yAxisId="secondary" width={48} orientation="right" dataKey={secondary} reversed={secondary==='paceSeconds'} domain={['auto','auto']} tickFormatter={value=>secondary==='paceSeconds'?paceTickFormatter(Number(value)):Math.round(Number(value)).toLocaleString('pt-BR')} tick={{fill:colors[secondary],fontSize:10}}/>}
                <Tooltip content={({active,payload})=>{
                  if(!active||!payload?.length)return null;
                  const point=payload[0].payload as ReturnType<typeof telemetryChartData>[number];
                  return <div className={`max-w-[230px] p-3 rounded-xl border shadow-lg text-xs ${isLight?'bg-white border-slate-200 text-slate-900':'bg-slate-900 border-slate-600 text-white'}`}><p className="font-bold mb-2">{point.distanceKm.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})} km · {formatSecToMinSec(point.durationSeconds)}</p>{[primary,...(secondary?[secondary]:[])].map(metric=>{const key=metric as TelemetryMetric;const value=point[key];return <p key={key} className="mt-1">{telemetryMetricNames[key]}: <strong>{value===null?'Sem leitura':key==='paceSeconds'?formatSecToMinSec(value):Math.round(value).toLocaleString('pt-BR')}{value!==null?` ${units[key]}`:''}</strong></p>})}</div>;
                }}/>
                <Line yAxisId="primary" type="linear" dataKey={primary} name={telemetryMetricNames[primary]} stroke={colors[primary]} strokeWidth={2.5} dot={false} connectNulls={false} isAnimationActive={false}/>
                {secondary&&<Line yAxisId="secondary" type="linear" dataKey={secondary} name={telemetryMetricNames[secondary]} stroke={colors[secondary]} strokeWidth={2} strokeDasharray="5 3" dot={false} connectNulls={false} isAnimationActive={false}/>}
              </ComposedChart>
            </ResponsiveContainer>
          </div> : <div className={`rounded-xl border p-5 text-xs leading-relaxed ${isLight?'bg-slate-50 border-slate-200 text-slate-600':'bg-slate-950/40 border-slate-700 text-slate-300'}`} role="status">{primary==='heartRate'?'Sem série de frequência cardíaca suficiente para desenhar o gráfico. É necessário registrar leituras com um sensor conectado ou importar um GPX com FC. Uma FC média preenchida manualmente aparece no resumo, mas não gera uma curva.':`Sem amostras suficientes de ${telemetryMetricNames[primary].toLowerCase()} neste treino.`}</div>}
          <p className="text-[10px] leading-relaxed text-slate-400">As linhas usam as mesmas amostras de distância ou tempo. Intervalos sem leitura ficam sem linha. {secondary?'Cada métrica mantém sua escala e unidade; a linha tracejada usa o eixo direito. ':''}No ritmo, valores menores ficam no alto do gráfico.</p>
        </div>}
      </div>
    </div>
  );
};

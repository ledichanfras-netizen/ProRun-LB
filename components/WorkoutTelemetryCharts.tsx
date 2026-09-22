import React, { useState } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  Activity,
  Footprints,
  Flame,
  Mountain,
  Trophy,
  ChevronRight,
  TrendingUp,
  Layers,
  Sparkles
} from 'lucide-react';
import { KmSplit, TelemetryPoint } from '../utils/runningMetrics';

interface WorkoutTelemetryChartsProps {
  kmSplits?: KmSplit[];
  telemetrySamples?: TelemetryPoint[];
  avgPace?: string;
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
  avgCadence,
  maxCadence,
  calories,
  elevationGainMeters,
  totalDistanceKm = 0,
  totalDurationSeconds = 0,
  isLight = false
}) => {
  const [activeTab, setActiveTab] = useState<'splits' | 'pace' | 'cadence' | 'elevation'>('splits');

  // Find best (fastest) split
  const bestSplitIndex = kmSplits.reduce((bestIdx, split, idx, arr) => {
    if (bestIdx === -1) return idx;
    return split.paceSeconds < arr[bestIdx].paceSeconds ? idx : bestIdx;
  }, -1);

  // Format seconds to mm:ss for axis & tooltip
  const formatSecToMinSec = (sec: number) => {
    if (!sec || isNaN(sec)) return '--:--';
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
              Análise biomecânica, parciais por quilômetro e altimetria
            </p>
          </div>
        </div>

        {/* Abas */}
        <div className={`flex items-center p-1 rounded-xl border text-[11px] font-bold ${
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
            {avgCadence ? `${avgCadence} SPM` : (telemetrySamples.length > 0 ? `${Math.round(telemetrySamples.reduce((s, p) => s + p.cadenceSpm, 0) / telemetrySamples.length)} SPM` : '--')}
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

        {/* ABA: GRÁFICO DE RITMO (PACE) */}
        {activeTab === 'pace' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Ritmo ao longo da distância (minutos por km)</span>
              <span className="font-mono text-emerald-400">Pace Médio: {avgPace}/km</span>
            </div>
            <div className="h-56 sm:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={telemetrySamples} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="paceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#ffffff10'} />
                  <XAxis
                    dataKey="distanceKm"
                    tickFormatter={distTickFormatter}
                    tick={{ fill: isLight ? '#64748b' : '#94a3b8', fontSize: 10 }}
                    stroke={isLight ? '#cbd5e1' : '#ffffff20'}
                  />
                  <YAxis
                    dataKey="paceSeconds"
                    reversed={true} // Inverted so faster pace is physically higher on chart!
                    tickFormatter={paceTickFormatter}
                    domain={['dataMin - 20', 'dataMax + 20']}
                    tick={{ fill: isLight ? '#64748b' : '#94a3b8', fontSize: 10 }}
                    stroke={isLight ? '#cbd5e1' : '#ffffff20'}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as TelemetryPoint;
                        return (
                          <div className={`p-2.5 rounded-xl shadow-xl border text-[11px] font-mono ${
                            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-white/20 text-white'
                          }`}>
                            <p className="font-black text-emerald-500">{data.distanceKm} km</p>
                            <p className="font-bold">Ritmo: {data.paceFormatted} /km</p>
                            <p className="text-purple-400">Cadência: {data.cadenceSpm} SPM</p>
                            <p className="text-slate-400">Tempo: {formatSecToMinSec(data.durationSeconds)}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="paceSeconds"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#paceGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ABA: GRÁFICO DE CADÊNCIA (SPM) */}
        {activeTab === 'cadence' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Passadas por minuto (SPM) • Faixa ideal recomendada: 165 - 185 SPM</span>
              <span className="font-mono text-purple-400">Média: {avgCadence || '--'} SPM</span>
            </div>
            <div className="h-56 sm:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={telemetrySamples} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#ffffff10'} />
                  <XAxis
                    dataKey="distanceKm"
                    tickFormatter={distTickFormatter}
                    tick={{ fill: isLight ? '#64748b' : '#94a3b8', fontSize: 10 }}
                    stroke={isLight ? '#cbd5e1' : '#ffffff20'}
                  />
                  <YAxis
                    dataKey="cadenceSpm"
                    domain={[120, 210]}
                    tick={{ fill: isLight ? '#64748b' : '#94a3b8', fontSize: 10 }}
                    stroke={isLight ? '#cbd5e1' : '#ffffff20'}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as TelemetryPoint;
                        return (
                          <div className={`p-2.5 rounded-xl shadow-xl border text-[11px] font-mono ${
                            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-white/20 text-white'
                          }`}>
                            <p className="font-black text-purple-400">{data.cadenceSpm} Passadas/min</p>
                            <p className="text-slate-300">Distância: {data.distanceKm} km</p>
                            <p className="text-emerald-400">Pace: {data.paceFormatted}/km</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="cadenceSpm"
                    stroke="#a855f7"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ABA: GRÁFICO DE ELEVAÇÃO */}
        {activeTab === 'elevation' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>Altimetria e relevo do percurso (metros de altitude)</span>
              <span className="font-mono text-blue-400">Ganho: +{elevationGainMeters || 0}m</span>
            </div>
            <div className="h-56 sm:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={telemetrySamples} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="eleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#ffffff10'} />
                  <XAxis
                    dataKey="distanceKm"
                    tickFormatter={distTickFormatter}
                    tick={{ fill: isLight ? '#64748b' : '#94a3b8', fontSize: 10 }}
                    stroke={isLight ? '#cbd5e1' : '#ffffff20'}
                  />
                  <YAxis
                    dataKey="altitudeMeters"
                    domain={['dataMin - 5', 'dataMax + 10']}
                    tick={{ fill: isLight ? '#64748b' : '#94a3b8', fontSize: 10 }}
                    stroke={isLight ? '#cbd5e1' : '#ffffff20'}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload as TelemetryPoint;
                        return (
                          <div className={`p-2.5 rounded-xl shadow-xl border text-[11px] font-mono ${
                            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-white/20 text-white'
                          }`}>
                            <p className="font-black text-blue-400">{data.altitudeMeters || 0} m altitude</p>
                            <p className="text-slate-300">Distância: {data.distanceKm} km</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="altitudeMeters"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#eleGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

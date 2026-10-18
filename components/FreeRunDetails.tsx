import React from 'react';
import { createPortal } from 'react-dom';
import { Edit3, Share2, X } from 'lucide-react';
import type { FreeRun } from '../types';
import { activityDistance } from '../utils/trainingActivities';
import { calculateWorkoutTRIMP } from '../utils/stressModel';
import { freeRunDurationSeconds, freeRunRoute } from '../utils/freeRunSession';
import { RunMetricsGrid } from './RunMetricsGrid';
import { RunRouteDetails } from './RunRouteDetails';

export function FreeRunDetails({run,isLight,onClose,onEdit,onPost}:{run:FreeRun;isLight:boolean;onClose:()=>void;onEdit:()=>void;onPost:()=>void}) {
  const route=freeRunRoute(run);
  return createPortal(<div role="dialog" aria-modal="true" aria-labelledby="free-run-details-title" className="fixed inset-0 z-[10002] overflow-y-auto bg-slate-950 p-4 sm:p-6">
    <div className="max-w-2xl mx-auto space-y-5 pb-8 text-slate-200">
      <header className="flex items-start justify-between gap-3"><div>
        <p className="text-[10px] font-black uppercase italic tracking-wider text-emerald-400">Corrida livre · Concluída</p>
        <h2 id="free-run-details-title" className="text-xl font-black uppercase italic tracking-tight text-white">{run.customDescription || 'Corrida livre'}</h2>
        <p className="text-xs text-slate-400 mt-1">{run.date?.split('-').reverse().join('/')} · {run.startTime || 'Horário não informado'}</p>
      </div><button type="button" onClick={onClose} aria-label="Fechar detalhes da corrida livre" className="p-2 rounded-xl bg-white/10 text-slate-300 shrink-0"><X className="w-5 h-5"/></button></header>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={onEdit} className="flex-1 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 p-3 text-xs font-black uppercase italic flex items-center justify-center gap-2"><Edit3 className="w-4 h-4"/>Editar treino</button>
        <button type="button" onClick={onPost} className="flex-1 rounded-xl bg-emerald-700 text-white p-3 text-xs font-black uppercase italic flex items-center justify-center gap-2"><Share2 className="w-4 h-4"/>Postar treino</button>
      </div>
      <RunMetricsGrid route={route} distanceKm={activityDistance(run)} durationSeconds={freeRunDurationSeconds(run)} avgHeartRate={run.avgHeartRate}/>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3"><p className="pro-label">PSE</p><strong className="text-white">{run.rpe !== undefined ? `${run.rpe}/10` : 'Não informada'}</strong></div>
        <div className="rounded-2xl bg-white/5 border border-white/10 p-3"><p className="pro-label">Carga da sessão</p><strong className="text-emerald-400">{calculateWorkoutTRIMP(run)} UA</strong></div>
      </div>
      <section className="rounded-2xl bg-white/5 border border-white/10 p-4"><h3 className="pro-label">Observações</h3><p className="text-sm text-slate-200 whitespace-pre-wrap break-words">{run.feedback || 'Nenhuma observação registrada.'}</p></section>
      {route ? <RunRouteDetails route={route} isLight={isLight}/> : <p className="text-xs text-slate-400">Registro manual: mapa, parciais e gráficos aparecem quando há dados GPS registrados.</p>}
    </div>
  </div>,document.body);
}

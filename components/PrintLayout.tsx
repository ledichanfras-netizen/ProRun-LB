
import React from 'react';
import { Athlete, TrainingWeek, TrainingPace } from '../types';

export const LBSportsLogo = () => (
  <div className="flex items-center gap-4">
    <div className="bg-emerald-950 p-3 rounded-2xl shadow-lg transform -rotate-3">
       <svg viewBox="0 0 24 24" className="w-10 h-10 fill-none stroke-emerald-400" strokeWidth="3">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
       </svg>
    </div>
    <div>
      <h1 className="text-2xl font-black tracking-tighter text-slate-900 leading-none italic">PRORUN LB</h1>
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600 mt-1">Performance Integrada</p>
    </div>
  </div>
);

interface PrintLayoutProps {
  athlete: Athlete;
  plan: TrainingWeek[];
  paces: TrainingPace[];
  goal: string;
}

export const PrintLayout: React.FC<PrintLayoutProps> = ({ athlete, plan, paces, goal }) => {
  const daysOrder = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

  const getSortedWorkouts = (workouts: any[]) => {
    if (!workouts) return [];
    return [...workouts].sort((a, b) => {
      const dayA = daysOrder.findIndex(d => a?.day?.toLowerCase().includes(d));
      const dayB = daysOrder.findIndex(d => b?.day?.toLowerCase().includes(d));
      return (dayA === -1 ? 99 : dayA) - (dayB === -1 ? 99 : dayB);
    });
  };

  const getZoneColors = (zone: string) => {
    switch (zone) {
      case 'Z1': return 'bg-emerald-500 text-white';
      case 'Z2': return 'bg-emerald-700 text-white';
      case 'Z3': return 'bg-amber-500 text-white';
      case 'Z4': return 'bg-red-600 text-white';
      case 'Z5': return 'bg-purple-600 text-white';
      default: return 'bg-slate-900 text-white';
    }
  };

  const getWorkoutCardStyle = (type?: string) => {
    switch (type) {
      case 'Regenerativo': return 'border-l-4 border-emerald-400 bg-emerald-50';
      case 'Longão': return 'border-l-4 border-emerald-600 bg-emerald-50';
      case 'Limiar': return 'border-l-4 border-amber-500 bg-amber-50';
      case 'Intervalado': return 'border-l-4 border-red-500 bg-red-50';
      case 'Fortalecimento': return 'border-l-4 border-purple-500 bg-purple-50';
      case 'Descanso': return 'border-l-4 border-slate-200 bg-slate-50 opacity-50';
      default: return 'border-l-4 border-slate-300 bg-white';
    }
  };

  return (
    <div 
      id="print-layout-root" 
      className="bg-white w-full text-slate-900 font-sans p-8 print:p-8" 
      style={{ width: '297mm', minHeight: '210mm', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
    >
      {/* CABEÇALHO PROFISSIONAL */}
      <div className="flex justify-between items-center border-b-8 border-emerald-950 pb-6 mb-6 bg-white">
        <LBSportsLogo />
        <div className="text-right">
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900">RELATÓRIO DE PERFORMANCE</h2>
          <div className="mt-1 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">SP - Brasil | Emissão: {new Date().toLocaleDateString('pt-BR')}</div>
        </div>
      </div>

      {/* PAINEL DO ATLETA - COMPACTO */}
      <div className="grid grid-cols-4 gap-4 bg-slate-950 text-white p-5 rounded-[1.2rem] mb-6 shadow-xl">
         <div>
           <p className="text-[8px] uppercase font-black text-emerald-400 mb-1 tracking-widest">Atleta</p>
           <p className="font-black text-lg truncate italic uppercase tracking-tighter leading-none">{athlete.name}</p>
         </div>
         <div className="col-span-2">
           <p className="text-[8px] uppercase font-black text-emerald-400 mb-1 tracking-widest">Estratégia do Ciclo</p>
           <p className="font-bold text-sm italic uppercase leading-tight text-slate-200 truncate">{goal}</p>
         </div>
         <div className="text-right">
           <p className="text-[8px] uppercase font-black text-emerald-400 mb-1 tracking-widest">VDOT Atual</p>
           <p className="font-black text-3xl leading-none italic text-emerald-400">{athlete.metrics.vdot}</p>
         </div>
      </div>

      {/* ZONAS COMPACTAS (HORIZONTAL GRID) */}
      <div className="mb-6 grid grid-cols-5 gap-2 bg-white">
        {paces.map((p) => (
          <div key={p.zone} className="border border-slate-100 rounded-2xl p-3 flex flex-col justify-between bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
               <span className={`px-2 py-0.5 rounded-lg font-black text-[10px] ${getZoneColors(p.zone)}`}>{p.zone}</span>
               <span className="text-[8px] font-black text-slate-400 uppercase italic">Ritmo Alvo</span>
            </div>
            <div className="font-black text-lg text-slate-900 tracking-tighter italic leading-none mb-1">
              {p.minPace} — {p.maxPace}
            </div>
            <div className="text-[9px] font-bold text-slate-500 uppercase italic truncate">{p.name}</div>
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2">
               <span className="text-[8px] font-black text-red-600 italic">{p.heartRateRange}</span>
               <span className="text-[8px] font-black text-slate-400">{p.speedKmh} km/h</span>
            </div>
          </div>
        ))}
      </div>

      {/* CALENDÁRIO DE TREINAMENTO */}
      <div className="space-y-6 bg-white">
        {(plan || []).map((week, wIdx) => (
          <div key={wIdx} className="print-week-block bg-white border-b-2 border-slate-100 pb-6 last:border-0" style={{ pageBreakInside: 'avoid' }}>
            <div className="flex justify-between items-center mb-4 bg-white">
               <div className="flex items-center gap-4">
                 <div className="bg-slate-900 text-white px-5 py-1.5 rounded-xl font-black uppercase italic text-sm shadow-md tracking-tighter">
                   SEMANA {week.weekNumber}
                 </div>
                 <div className="text-[9px] font-black uppercase text-emerald-700 tracking-[0.2em] italic bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100">
                   {week.phase}
                 </div>
               </div>
               <div className="text-right">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-2 italic">Volume Previsto:</span>
                  <span className="font-black text-xl text-slate-900 italic tracking-tighter">{week.totalVolume || 0} KM</span>
               </div>
            </div>
            
            <div className="grid grid-cols-7 gap-2 bg-white">
              {getSortedWorkouts(week.workouts).map((workout, idx) => (
                <div key={idx} className={`p-3 rounded-2xl min-h-[140px] flex flex-col justify-between border-2 border-slate-50 shadow-sm bg-white ${getWorkoutCardStyle(workout.type)}`}>
                   <div>
                     <div className="flex justify-between items-center mb-2 bg-transparent">
                       <span className="text-[8px] font-black uppercase text-slate-400 tracking-tighter">{workout.day.substring(0, 3)}</span>
                       <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded-md bg-white border border-slate-100">
                          {workout.type?.substring(0, 3).toUpperCase() || 'TRN'}
                       </span>
                     </div>
                     <div className="text-[9px] leading-tight font-bold text-slate-800 italic bg-transparent line-clamp-6">
                       {workout.customDescription}
                     </div>
                   </div>
                   {workout.distance ? (
                     <div className="mt-2 text-[8px] font-black text-right text-emerald-800 bg-white/60 px-2 py-1 rounded-lg border border-white">
                       {workout.distance} KM
                     </div>
                   ) : null}
                </div>
              ))}
            </div>

            {week.coachNotes && (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border-l-4 border-emerald-600 shadow-sm">
                <p className="text-[9px] font-bold text-slate-600 italic leading-relaxed">
                  <span className="font-black uppercase text-slate-900 mr-2 not-italic tracking-widest text-[7px]">Nota do Coach:</span>
                  "{week.coachNotes}"
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* RODAPÉ */}
      <div className="mt-8 pt-4 border-t border-slate-100 flex justify-between items-center opacity-30 text-[7px] font-black uppercase italic tracking-[0.3em] bg-white">
        <p>© 2025 PRORUN LB SPORTS - PERFORMANCE ENGINE</p>
        <p>A disciplina é a base da evolução.</p>
      </div>
    </div>
  );
};

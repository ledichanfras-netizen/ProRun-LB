
import React from 'react';
import { Athlete, TrainingWeek, TrainingPace } from '../types';

export const LBSportsLogo = () => (
  <div className="flex items-center gap-4">
    <div className="bg-emerald-950 p-2.5 rounded-xl shadow-lg transform -rotate-3">
       <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-emerald-400" strokeWidth="3">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
       </svg>
    </div>
    <div>
      <h1 className="text-xl font-black tracking-tighter text-slate-900 leading-none italic">PRORUN LB</h1>
      <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-600 mt-1">Prof. Leandro Barbosa</p>
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
  const daysOrder = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];

  const getFullWeek = (workouts: any[]) => {
    return daysOrder.map(dayName => {
      const found = (workouts || []).find(w => 
        w.day.toLowerCase().includes(dayName.split('-')[0].toLowerCase())
      );
      if (found) return found;
      return { day: dayName, type: 'Descanso', customDescription: 'Descanso total (Day Off).', distance: 0 };
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
    <div id="print-layout-root" className="bg-white w-full text-slate-900 font-sans p-6" style={{ width: '1200px', backgroundColor: '#ffffff', boxSizing: 'border-box' }}>
      <div className="flex justify-between items-end border-b-4 border-emerald-950 pb-4 mb-6 bg-white">
        <LBSportsLogo />
        <div className="text-right">
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">RELATÓRIO DE PERFORMANCE</h2>
          <p className="text-[10px] font-black uppercase text-emerald-600 mt-2">© 2025 LB SPORTS</p>
        </div>
      </div>

      <div className="grid grid-cols-12 bg-slate-950 text-white py-4 px-8 rounded-3xl mb-8 shadow-2xl overflow-hidden min-h-[90px]">
         <div className="col-span-3 flex flex-col items-center justify-center border-r border-white/10 px-2 text-center">
           <p className="text-[8px] uppercase font-black text-emerald-400 mb-1 tracking-[0.2em] opacity-80">Atleta</p>
           <p className="font-black text-[18px] italic uppercase tracking-tighter leading-tight w-full text-white break-words">{athlete.name}</p>
         </div>
         <div className="col-span-5 flex flex-col items-center justify-center border-r border-white/10 px-6 text-center">
           <p className="text-[8px] uppercase font-black text-emerald-400 mb-1 tracking-[0.2em] opacity-80">Estratégia do Ciclo (Meta Específica)</p>
           <p className="font-black text-[14px] italic uppercase text-slate-100 leading-tight w-full break-words">{goal || 'Objetivo de Performance'}</p>
         </div>
         <div className="col-span-4 flex items-center justify-center gap-8 px-4">
            <div className="text-center">
              <p className="text-[8px] uppercase font-black text-emerald-400 mb-1 tracking-[0.2em] opacity-80">VDOT Alvo</p>
              <p className="font-black text-4xl leading-none italic text-emerald-400 tracking-tighter">{athlete.metrics.vdot}</p>
            </div>
            <div className="h-12 w-[1px] bg-white/10"></div>
            <div className="text-center">
              <p className="text-[8px] uppercase font-black text-emerald-400 mb-1 tracking-[0.2em] opacity-80">Ciclo Total</p>
              <p className="font-black text-4xl leading-none italic text-white tracking-tighter uppercase">{plan.length}<span className="text-[12px] ml-1">Sem</span></p>
            </div>
         </div>
      </div>

      <div className="mb-8 grid grid-cols-5 gap-4 bg-white">
        {paces.map((p) => (
          <div key={p.zone} className="border-2 border-slate-100 rounded-[2rem] p-4 flex flex-col items-center justify-between bg-slate-50/20 shadow-lg min-h-[110px]">
            <div className="w-full flex items-center justify-between mb-2">
               <span className={`w-10 h-10 flex items-center justify-center rounded-xl font-black text-[13px] shadow-md text-center ${getZoneColors(p.zone)}`}>{p.zone}</span>
               <span className="text-[8px] font-black text-slate-400 uppercase italic tracking-widest">Ritmo Alvo</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center py-2 w-full text-center">
              <div className="font-black text-[22px] text-slate-900 tracking-tighter italic leading-none mb-1">{p.minPace}-{p.maxPace}</div>
              <div className="text-[8px] font-black text-slate-500 uppercase italic leading-tight">{p.name}</div>
            </div>
            <div className="w-full mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
               <span className="text-[8px] font-black text-red-600 italic">{p.heartRateRange}</span>
               <span className="text-[7px] font-black text-slate-400">{p.speedKmh} km/h</span>
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-8 bg-white">
        {(plan || []).map((week, wIdx) => (
          <div key={wIdx} className="bg-white border-b-2 border-slate-100 pb-8 last:border-0">
            <div className="flex justify-between items-center mb-4 bg-white px-2">
               <div className="flex items-center gap-4">
                 <div className="bg-slate-900 text-white px-6 py-2 rounded-2xl font-black uppercase italic text-[12px] shadow-xl tracking-tighter min-w-[130px] flex justify-center items-center">SEMANA {week.weekNumber}</div>
                 <div className="text-[10px] font-black uppercase text-emerald-700 tracking-[0.2em] italic bg-emerald-50 px-5 py-2 rounded-xl border border-emerald-100 shadow-sm">{week.phase}</div>
               </div>
               <div className="text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2 italic">Volume Semanal:</span>
                  <span className="font-black text-2xl text-slate-900 italic tracking-tighter">{week.totalVolume || 0} KM</span>
               </div>
            </div>
            <div className="grid grid-cols-7 gap-3 bg-white">
              {getFullWeek(week.workouts).map((workout, idx) => (
                <div key={idx} className={`p-4 rounded-[2rem] h-full min-h-[200px] flex flex-col justify-between border-2 border-slate-100 shadow-md bg-white transition-all ${getWorkoutCardStyle(workout.type)}`}>
                   <div className="flex justify-between items-center mb-3">
                     <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.1em]">{workout.day.substring(0, 3)}</span>
                     <span className="text-[8px] font-black uppercase px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-500 shadow-sm text-center">{workout.type?.substring(0, 3).toUpperCase() || 'TRN'}</span>
                   </div>
                   <div className="flex-1 flex flex-col items-center justify-center text-center px-2 py-3">
                     <div className="text-[11px] leading-[1.4] font-black text-slate-800 italic break-words text-center">{workout.customDescription}</div>
                   </div>
                   <div className="mt-3 pt-3 border-t border-slate-200/50 flex justify-center items-center">
                     {workout.distance && workout.distance > 0 ? (
                       <span className="text-[11px] font-black text-emerald-900 bg-emerald-50 px-4 py-1 rounded-xl border border-emerald-100 italic">{workout.distance} KM</span>
                     ) : (
                       <span className="text-[8px] font-black text-slate-300 italic uppercase">OFF</span>
                     )}
                   </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

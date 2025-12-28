
import React from 'react';
import { Athlete, TrainingWeek, TrainingPace } from '../types';

export const LBSportsLogo = () => (
  <div className="flex items-center gap-3">
    <div className="relative h-12 w-24 text-emerald-900">
      <svg viewBox="0 0 200 80" className="w-full h-full fill-current">
         <path d="M40 20 C45 15, 50 15, 55 20 L50 35 L40 30 Z" opacity="0.4" /><circle cx="50" cy="15" r="4" opacity="0.4" />
         <path d="M70 20 C75 15, 80 15, 85 20 L80 35 L70 30 Z" opacity="0.6" /><circle cx="80" cy="15" r="4" opacity="0.6" />
         <path d="M100 20 C105 15, 110 15, 115 20 L110 35 L100 30 Z" /><circle cx="110" cy="15" r="4" />
         <path d="M0 50 L30 50 L40 40 L50 60 L60 50 L140 50 L150 40 L160 60 L170 50 L200 50" fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    </div>
    <div className="border-l-2 border-slate-900 pl-3">
      <h1 className="text-xl font-black tracking-tighter text-slate-900 leading-none">LB SPORTS</h1>
      <p className="text-[8px] font-black uppercase tracking-widest text-emerald-600">Performance Integrada</p>
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

  const getWorkoutColors = (type?: string) => {
    switch (type) {
      case 'Regenerativo': return 'bg-emerald-50 border-emerald-100 text-emerald-700';
      case 'Longão': return 'bg-emerald-100 border-emerald-200 text-emerald-800';
      case 'Limiar': return 'bg-amber-50 border-amber-200 text-amber-700';
      case 'Intervalado': return 'bg-red-50 border-red-200 text-red-700';
      case 'Fortalecimento': return 'bg-purple-50 border-purple-200 text-purple-700';
      default: return 'bg-slate-50 border-slate-200 text-slate-500';
    }
  };

  return (
    <div className="print-content bg-white w-full text-slate-900 mx-auto font-sans p-2">
      <div className="flex justify-between items-end border-b-4 border-slate-900 pb-4 mb-6">
        <LBSportsLogo />
        <div className="text-right">
          <h2 className="text-lg font-black uppercase italic tracking-tighter">Planilha de Treinamento Profissional</h2>
          <div className="mt-1 text-[10px] font-bold text-slate-400 uppercase italic">Referência: {new Date().toLocaleDateString('pt-BR')}</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-6 shadow-sm">
         <div>
           <p className="text-[9px] uppercase font-black text-slate-400 mb-1 tracking-widest">Atleta</p>
           <p className="font-bold text-sm text-slate-800">{athlete.name}</p>
         </div>
         <div className="col-span-2">
           <p className="text-[9px] uppercase font-black text-slate-400 mb-1 tracking-widest">Objetivo do Ciclo</p>
           <p className="font-bold text-sm text-slate-800 italic uppercase">{goal}</p>
         </div>
         <div className="text-right">
           <p className="text-[9px] uppercase font-black text-slate-400 mb-1 tracking-widest">VDOT (Nível)</p>
           <p className="font-black text-lg text-emerald-600 leading-none">{athlete.metrics.vdot}</p>
         </div>
      </div>

      <div className="mb-8 break-inside-avoid">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-900 border-b-2 border-slate-900 mb-3 pb-1">
          Guia de Intensidade (Zonas de Treino)
        </h3>
        <table className="w-full text-left border-collapse border-2 border-slate-200">
          <thead>
            <tr className="bg-slate-900 text-white text-[9px] font-black uppercase italic">
              <th className="p-2 border-r border-slate-700">Zona</th>
              <th className="p-2 border-r border-slate-700">Denominação</th>
              <th className="p-2 border-r border-slate-700">Pace (min/km)</th>
              <th className="p-2 border-r border-slate-700">Velocidade (km/h)</th>
              <th className="p-2">Freq. Cardíaca</th>
            </tr>
          </thead>
          <tbody>
            {paces.map((p) => (
              <tr key={p.zone} className="border-b border-slate-100 text-[10px]">
                <td className={`p-2 font-black border-r border-slate-200 text-center ${getZoneColors(p.zone)}`}>{p.zone}</td>
                <td className="p-2 font-bold text-slate-700 border-r border-slate-200 uppercase">{p.name}</td>
                <td className="p-2 font-black text-slate-900 border-r border-slate-200 text-center">{p.minPace} - {p.maxPace}</td>
                <td className="p-2 font-bold text-slate-600 border-r border-slate-200 text-center">{p.speedKmh}</td>
                <td className="p-2 text-red-600 font-bold text-center italic">{p.heartRateRange}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-8">
        {(plan || []).map((week, wIdx) => (
          <div key={wIdx} className="break-inside-avoid border-t-2 border-slate-900 pt-6">
            <div className="flex justify-between items-center mb-4">
               <div className="flex items-center gap-4">
                 <h3 className="font-black uppercase text-base italic tracking-tighter bg-slate-900 text-white px-5 py-1 rounded-full shadow-lg">SEMANA {week.weekNumber}</h3>
                 <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest border border-emerald-200 px-3 py-1 rounded-lg italic">{week.phase}</span>
               </div>
               {week.coachNotes && (
                 <div className="text-right max-w-lg border-r-4 border-slate-300 pr-4">
                   <p className="text-[10px] font-medium text-slate-500 leading-tight">
                     <span className="font-black uppercase text-slate-900 mr-2 italic">Estratégia:</span>
                     "{week.coachNotes}"
                   </p>
                 </div>
               )}
            </div>
            
            <div className="grid grid-cols-7 border-l-2 border-t-2 border-slate-200 bg-slate-50 shadow-sm">
              {getSortedWorkouts(week.workouts).map((workout, idx) => (
                <div key={idx} className={`border-r-2 border-b-2 border-slate-200 p-2 min-h-[140px] flex flex-col justify-between ${workout.type === 'Descanso' ? 'bg-slate-100/50 opacity-40' : 'bg-white'} ${getWorkoutColors(workout.type).split(' ')[0]}`}>
                   <div>
                     <div className="flex justify-between items-center mb-2">
                       <span className="text-[8px] font-black uppercase text-slate-400">{workout.day.split('-')[0]}</span>
                       <span className={`text-[7px] font-black uppercase px-1 rounded shadow-sm ${getWorkoutColors(workout.type)}`}>
                          {workout.type}
                       </span>
                     </div>
                     <div className="text-[9px] leading-tight font-bold text-slate-800 italic">"{workout.customDescription}"</div>
                   </div>
                   {workout.distance ? <div className="mt-2 text-[10px] font-black text-right text-slate-900 italic tracking-tighter">{workout.distance} KM</div> : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-12 border-t border-slate-100 pt-6 flex justify-between items-center opacity-30 text-[8px] font-black uppercase italic tracking-widest">
        <p>© 2025 LB SPORTS - PLATAFORMA INTEGRADA DE ALTA PERFORMANCE</p>
        <p>A constância é o que transforma o esforço em resultado extraordinário.</p>
      </div>
    </div>
  );
};

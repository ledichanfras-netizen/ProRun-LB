
import React from 'react';
import { Athlete, TrainingWeek, TrainingPace } from '../types';
import { Heart, MessageCircle } from 'lucide-react';

// --- LB SPORTS Logo Component ---
export const LBSportsLogo = () => (
  <div className="flex items-center gap-3">
    <div className="relative h-12 w-24 text-green-700">
      {/* Stylized Runners and Heartbeat */}
      <svg viewBox="0 0 200 80" className="w-full h-full fill-current">
         {/* Runner 1 (Back) */}
         <path d="M40 20 C45 15, 50 15, 55 20 L50 35 L40 30 Z" opacity="0.4" />
         <circle cx="50" cy="15" r="4" opacity="0.4" />
         {/* Runner 2 (Middle) */}
         <path d="M70 20 C75 15, 80 15, 85 20 L80 35 L70 30 Z" opacity="0.6" />
         <circle cx="80" cy="15" r="4" opacity="0.6" />
         {/* Runner 3 (Front - Lead) */}
         <path d="M100 20 C105 15, 110 15, 115 20 L110 35 L100 30 Z" />
         <circle cx="110" cy="15" r="4" />
         
         {/* Heartbeat Line */}
         <path d="M0 50 L30 50 L40 40 L50 60 L60 50 L140 50 L150 40 L160 60 L170 50 L200 50" 
               fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
    </div>
    <div className="border-l-2 border-green-700 pl-3">
      <h1 className="text-xl font-black tracking-tighter text-green-800 leading-none">LB SPORTS</h1>
      <p className="text-[8px] font-bold uppercase tracking-widest text-slate-600">Treinamento de Corrida</p>
    </div>
  </div>
);

// --- Printable Document Component (LANDSCAPE OPTIMIZED) ---
interface PrintLayoutProps {
  athlete: Athlete;
  plan: TrainingWeek[]; // Assumes the plan passed is already filtered
  paces: TrainingPace[];
  goal: string;
}

export const PrintLayout: React.FC<PrintLayoutProps> = ({ athlete, plan, paces, goal }) => {
  const mapPhase = (phase: string) => {
    switch(phase) {
        case 'Base': return 'Base';
        case 'Build': return 'Construção';
        case 'Peak': return 'Pico';
        case 'Taper': return 'Polimento';
        default: return phase;
    }
  };

  // Logic to sort workouts by day of the week
  const daysOrder = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  const getSortedWorkouts = (workouts: any[]) => {
    return [...workouts].sort((a, b) => {
      const dayA = daysOrder.findIndex(d => a.day.includes(d));
      const dayB = daysOrder.findIndex(d => b.day.includes(d));
      const idxA = dayA === -1 ? 99 : dayA;
      const idxB = dayB === -1 ? 99 : dayB;
      return idxA - idxB;
    });
  };

  return (
    // WIDTH SET TO 297mm FOR A4 LANDSCAPE
    <div className="print-content bg-white w-full max-w-[297mm] text-slate-900 mx-auto px-4 py-2">
      {/* Header */}
      <div className="flex justify-between items-end border-b-2 border-green-700 pb-2 mb-3">
        <LBSportsLogo />
        <div className="text-right">
           <h2 className="text-sm font-bold text-slate-800">Planilha de Treinamento</h2>
           <div className="mt-1 text-[8px] text-slate-400">
             Exportado em {new Date().toLocaleDateString('pt-BR')}
           </div>
        </div>
      </div>

      {/* Athlete Info Bar */}
      <div className="flex justify-between bg-slate-50 p-2 rounded border border-slate-200 mb-3 text-[10px]">
         <div>
           <p className="text-[8px] text-slate-500 uppercase font-bold">Atleta</p>
           <p className="font-bold text-xs text-slate-800 leading-tight">{athlete.name}</p>
         </div>
         <div>
           <p className="text-[8px] text-slate-500 uppercase font-bold">Objetivo Principal</p>
           <p className="font-bold text-xs text-slate-800 leading-tight">{goal}</p>
         </div>
         <div>
           <p className="text-[8px] text-slate-500 uppercase font-bold">VO2 Atual</p>
           <p className="font-bold text-xs text-slate-800 leading-tight">{athlete.metrics.vdot}</p>
         </div>
         <div className="text-right">
            <p className="text-[8px] text-slate-500 uppercase font-bold">Periodização</p>
            <p className="font-bold text-xs text-slate-800 leading-tight">{plan.length} Semanas</p>
         </div>
      </div>

      {/* Zones Table (Compact & Horizontal) */}
      <div className="mb-3 break-inside-avoid">
         <h3 className="text-[9px] font-bold uppercase text-slate-600 border-b border-slate-300 mb-1 pb-0.5 flex items-center gap-1">
            <Heart className="w-3 h-3" /> Zonas (Referências)
         </h3>
         <table className="w-full text-[8px] text-left border-collapse border border-slate-300">
           <thead>
             <tr className="bg-slate-100 print:bg-slate-100">
               <th className="border border-slate-300 p-0.5 uppercase w-8 text-center">Zona</th>
               <th className="border border-slate-300 p-0.5 uppercase">Descrição</th>
               <th className="border border-slate-300 p-0.5 text-center uppercase">Pace (min/km)</th>
               <th className="border border-slate-300 p-0.5 text-center uppercase">Vel (km/h)</th>
               <th className="border border-slate-300 p-0.5 text-center uppercase">FC (bpm)</th>
             </tr>
           </thead>
           <tbody>
             {paces.map(p => (
               <tr key={p.zone}>
                 <td className={`border border-slate-300 p-0.5 font-bold text-center
                    ${p.zone === 'F' ? 'bg-blue-50 text-blue-700' : ''}
                    ${p.zone === 'M' ? 'bg-green-50 text-green-700' : ''}
                    ${p.zone === 'L' ? 'bg-yellow-50 text-yellow-700' : ''}
                    ${p.zone === 'I' ? 'bg-orange-50 text-orange-700' : ''}
                    ${p.zone === 'R' ? 'bg-red-50 text-red-700' : ''}
                 `}>{p.zone}</td>
                 <td className="border border-slate-300 p-0.5 truncate max-w-[200px]">{p.name}</td>
                 <td className="border border-slate-300 p-0.5 text-center font-mono font-bold">{p.minPace} - {p.maxPace}</td>
                 <td className="border border-slate-300 p-0.5 text-center">{p.speedKmh}</td>
                 <td className="border border-slate-300 p-0.5 text-center font-bold">{p.heartRateRange}</td>
               </tr>
             ))}
           </tbody>
         </table>
      </div>

      {/* Weekly Schedule Grid */}
      <div className="space-y-3">
        {plan.map((week) => (
          <div key={week.weekNumber} className="break-inside-avoid mb-2 border-b pb-2 last:border-b-0">
            <div className="flex justify-between items-end mb-1 px-1 border-b border-slate-800 pb-0.5">
               <div className="flex items-center gap-2">
                 <h3 className="font-bold uppercase text-[10px] text-slate-800">
                   Semana {week.weekNumber} 
                 </h3>
                 <span className="text-[9px] px-1.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                   Fase: {mapPhase(week.phase)}
                 </span>
                 {week.coachNotes && !week.coachNotes.includes('Obs') && (
                    <span className="text-[9px] font-bold text-blue-700 uppercase">
                      [{week.coachNotes}]
                    </span>
                 )}
               </div>
               <span className="text-[8px] font-bold bg-slate-800 text-white px-2 py-0.5 rounded">Total: {week.totalVolume} km</span>
            </div>
            
            {/* Workouts Grid - Enforced Grid for Print */}
            <div className="print-grid print-grid-cols-7 grid grid-cols-7 border-l border-t border-slate-300 mb-1">
              {getSortedWorkouts(week.workouts).map((workout, idx) => (
                <div key={idx} className="border-r border-b border-slate-300 p-1 min-h-[80px] relative flex flex-col justify-between bg-white">
                   <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[8px] font-bold uppercase bg-slate-50 px-1 text-slate-700 truncate max-w-[60px] border border-slate-100 rounded">{workout.day}</span>
                        {workout.type && workout.type !== 'Rest' && (
                          <span className={`text-[6px] uppercase font-bold px-1 rounded whitespace-nowrap
                            ${workout.type === 'Long' ? 'bg-green-100 text-green-800' : 
                              workout.type === 'Interval' ? 'bg-red-100 text-red-800' : 
                              workout.type === 'Tempo' ? 'bg-yellow-100 text-yellow-800' :
                              workout.type === 'Strength' ? 'bg-purple-100 text-purple-800' :
                              'bg-blue-50 text-blue-800'}`}>
                            {workout.type?.substring(0,4)}
                          </span>
                        )}
                      </div>
                      <div className="text-[8px] font-medium leading-tight text-slate-900 whitespace-pre-line mt-0.5">
                        {workout.type === 'Rest' ? 'OFF' : workout.customDescription}
                      </div>
                   </div>
                   
                   {workout.distance && workout.distance > 0 ? (
                     <div className="mt-1 pt-0.5 border-t border-slate-100 text-[8px] font-bold text-right text-slate-500">
                       {workout.distance} km
                     </div>
                   ) : null}
                </div>
              ))}
            </div>

            {/* Coach Notes for the Week (Footer of the week) */}
            {week.coachNotes && week.coachNotes.length > 20 && (
              <div className="bg-yellow-50 border border-yellow-100 p-1 rounded text-[8px] text-slate-700 flex gap-1">
                 <MessageCircle className="w-3 h-3 text-yellow-600 flex-shrink-0" />
                 <div>
                   <span className="font-bold uppercase text-yellow-800">Obs: </span>
                   {week.coachNotes}
                 </div>
              </div>
            )}
          </div>
        ))}
        {plan.length === 0 && (
          <div className="text-center p-10 text-slate-400 text-sm border-2 border-dashed">
            Nenhuma semana selecionada para impressão.
          </div>
        )}
      </div>
      
      {/* Footer Notes */}
      <div className="mt-4 pt-2 border-t border-slate-300 flex justify-between items-start text-[8px] text-slate-400 break-inside-avoid">
         <div className="w-2/3">
           <p className="font-bold mb-0.5">LB SPORTS - Treinamento Personalizado</p>
           <p>Este plano é individual e intransferível.</p>
         </div>
         <div className="w-1/3 text-right pl-8">
            <p className="mb-4">Assinatura</p>
            <div className="border-b border-slate-400"></div>
         </div>
      </div>
    </div>
  );
};


import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { generateTrainingPlan } from '../services/geminiService';
import { TrainingWeek, Athlete, TrainingPace, Workout } from '../types';
import { Sparkles, Calendar, Loader2, AlertCircle, Save, Printer, Edit2, Eye, EyeOff, MessageSquare, Plus, Trash2, Heart, X, Check, BookOpen, AlertTriangle, FileDown, Info, MessageCircle } from 'lucide-react';
import { calculatePaces } from '../utils/calculations';

// --- LB SPORTS Logo Component ---
const LBSportsLogo = () => (
  <div className="flex items-center gap-4">
    <div className="relative h-14 w-28 text-green-700">
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
      <h1 className="text-2xl font-black tracking-tighter text-green-800 leading-none">LB SPORTS</h1>
      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-600">Treinamento de Corrida</p>
    </div>
  </div>
);

// --- Printable Document Component ---
interface PrintLayoutProps {
  athlete: Athlete;
  plan: TrainingWeek[];
  paces: TrainingPace[];
  goal: string;
}

const PrintLayout: React.FC<PrintLayoutProps> = ({ athlete, plan, paces, goal }) => {
  const mapPhase = (phase: string) => {
    switch(phase) {
        case 'Base': return 'Base';
        case 'Build': return 'Construção';
        case 'Peak': return 'Pico';
        case 'Taper': return 'Polimento';
        default: return phase;
    }
  };

  return (
    <div className="print-content bg-white w-full text-slate-900 mx-auto max-w-[297mm]">
      {/* Header */}
      <div className="flex justify-between items-end border-b-4 border-green-700 pb-2 mb-4">
        <LBSportsLogo />
        <div className="text-right">
           <h2 className="text-base font-bold text-slate-800">Planilha de Treinamento</h2>
           <p className="text-[10px] font-bold text-slate-500 uppercase">Prof. Leandro Barbosa</p>
           <div className="mt-1 text-[9px] text-slate-400">
             Exportado em {new Date().toLocaleDateString('pt-BR')}
           </div>
        </div>
      </div>

      {/* Athlete Info Bar */}
      <div className="flex justify-between bg-slate-50 p-2 rounded-lg border border-slate-200 mb-4 text-xs">
         <div>
           <p className="text-[9px] text-slate-500 uppercase font-bold">Atleta</p>
           <p className="font-bold text-sm text-slate-800 leading-tight">{athlete.name}</p>
         </div>
         <div>
           <p className="text-[9px] text-slate-500 uppercase font-bold">Objetivo Principal</p>
           <p className="font-bold text-sm text-slate-800 leading-tight">{goal}</p>
         </div>
         <div>
           <p className="text-[9px] text-slate-500 uppercase font-bold">VDOT Atual</p>
           <p className="font-bold text-sm text-slate-800 leading-tight">{athlete.metrics.vdot}</p>
         </div>
         <div className="text-right">
            <p className="text-[9px] text-slate-500 uppercase font-bold">Periodização</p>
            <p className="font-bold text-sm text-slate-800 leading-tight">{plan.length} Semanas</p>
         </div>
      </div>

      {/* Zones Table (Compact) */}
      <div className="mb-4 break-inside-avoid">
         <h3 className="text-[10px] font-bold uppercase text-slate-600 border-b border-slate-300 mb-1 pb-1 flex items-center gap-1">
            <Heart className="w-3 h-3" /> Zonas de Treinamento (Referências)
         </h3>
         <table className="w-full text-[9px] text-left border-collapse border border-slate-300">
           <thead>
             <tr className="bg-slate-100 print:bg-slate-100">
               <th className="border border-slate-300 p-1 uppercase w-8 text-center">Zona</th>
               <th className="border border-slate-300 p-1 uppercase">Descrição</th>
               <th className="border border-slate-300 p-1 text-center uppercase">Pace (min/km)</th>
               <th className="border border-slate-300 p-1 text-center uppercase">Vel (km/h)</th>
               <th className="border border-slate-300 p-1 text-center uppercase">FC (bpm)</th>
             </tr>
           </thead>
           <tbody>
             {paces.map(p => (
               <tr key={p.zone}>
                 <td className={`border border-slate-300 p-1 font-bold text-center
                    ${p.zone === 'F' ? 'bg-blue-50 text-blue-700' : ''}
                    ${p.zone === 'M' ? 'bg-green-50 text-green-700' : ''}
                    ${p.zone === 'L' ? 'bg-yellow-50 text-yellow-700' : ''}
                    ${p.zone === 'I' ? 'bg-orange-50 text-orange-700' : ''}
                    ${p.zone === 'R' ? 'bg-red-50 text-red-700' : ''}
                 `}>{p.zone}</td>
                 <td className="border border-slate-300 p-1 truncate max-w-[150px]">{p.name}</td>
                 <td className="border border-slate-300 p-1 text-center font-mono font-bold">{p.minPace} - {p.maxPace}</td>
                 <td className="border border-slate-300 p-1 text-center">{p.speedKmh}</td>
                 <td className="border border-slate-300 p-1 text-center font-bold">{p.heartRateRange}</td>
               </tr>
             ))}
           </tbody>
         </table>
      </div>

      {/* Weekly Schedule Grid */}
      <div className="space-y-3">
        {plan.filter(w => w.isVisible !== false).map((week) => (
          <div key={week.weekNumber} className="break-inside-avoid mb-4">
            <div className="flex justify-between items-end mb-1 px-1 border-b-2 border-slate-800 pb-1">
               <h3 className="font-bold uppercase text-xs text-slate-800">
                 Semana {week.weekNumber} 
                 <span className="text-[10px] font-normal text-slate-500 ml-2 normal-case">| Fase: {mapPhase(week.phase)}</span>
               </h3>
               <span className="text-[9px] font-bold bg-slate-800 text-white px-2 py-0.5 rounded">Total: {week.totalVolume} km</span>
            </div>
            
            {/* Workouts Grid */}
            <div className="grid grid-cols-7 border-l border-t border-slate-800 mb-1">
              {week.workouts.map((workout, idx) => (
                <div key={idx} className="border-r border-b border-slate-800 p-1 min-h-[80px] relative flex flex-col justify-between bg-white">
                   <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[8px] font-bold uppercase bg-slate-100 px-1 text-slate-700">{workout.day}</span>
                        {workout.type && workout.type !== 'Rest' && (
                          <span className={`text-[6px] uppercase font-bold px-1 rounded 
                            ${workout.type === 'Long' ? 'bg-green-100 text-green-800' : 
                              workout.type === 'Interval' ? 'bg-red-100 text-red-800' : 
                              workout.type === 'Tempo' ? 'bg-yellow-100 text-yellow-800' :
                              workout.type === 'Strength' ? 'bg-purple-100 text-purple-800' :
                              'bg-blue-50 text-blue-800'}`}>
                            {workout.type?.substring(0,4)}
                          </span>
                        )}
                      </div>
                      <div className="text-[8px] font-medium leading-tight text-slate-800 whitespace-pre-line">
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

            {/* Coach Notes for the Week */}
            {week.coachNotes && (
              <div className="bg-yellow-50 border border-yellow-200 p-2 rounded text-[9px] text-slate-700 flex gap-2">
                 <MessageCircle className="w-3 h-3 text-yellow-600 flex-shrink-0" />
                 <div>
                   <span className="font-bold uppercase text-yellow-800">Obs da Semana: </span>
                   {week.coachNotes}
                 </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Footer Notes */}
      <div className="mt-6 pt-4 border-t border-slate-300 flex justify-between items-start text-[9px] text-slate-400 break-inside-avoid">
         <div className="w-2/3">
           <p className="font-bold mb-1">LB SPORTS - Treinamento Personalizado</p>
           <p>Este plano é individual e intransferível.</p>
         </div>
         <div className="w-1/3 text-right pl-8">
            <p className="mb-8">Assinatura</p>
            <div className="border-b border-slate-400"></div>
         </div>
      </div>
    </div>
  );
};


// --- Main Page Component ---
const Periodization: React.FC = () => {
  const { athletes, selectedAthleteId, athletePlans, saveAthletePlan, workouts: libraryWorkouts } = useApp();
  const [goal, setGoal] = useState('Sub 50min 10k');
  const [weeks, setWeeks] = useState(4);
  const [daysPerWeek, setDaysPerWeek] = useState(4);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<TrainingWeek[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Preview State
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; weekIndex: number; dayIndex: number } | null>(null);

  const activeAthlete = athletes.find(a => a.id === selectedAthleteId);

  useEffect(() => {
    if (activeAthlete && athletePlans[activeAthlete.id]) {
      setPlan(athletePlans[activeAthlete.id]);
    } else {
      setPlan([]);
    }
  }, [activeAthlete, athletePlans]);

  const handleGenerate = async () => {
    if (!activeAthlete) return;
    setLoading(true);
    setError(null);
    try {
      const generatedPlan = await generateTrainingPlan(activeAthlete, goal, weeks, daysPerWeek);
      const planWithVisibility = generatedPlan.map(w => ({ ...w, isVisible: true }));
      setPlan(planWithVisibility);
      saveAthletePlan(activeAthlete.id, planWithVisibility);
      setIsEditing(true);
    } catch (e) {
      setError("Falha ao gerar o plano. Por favor, verifique a chave da API e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (activeAthlete) {
      saveAthletePlan(activeAthlete.id, plan);
      setIsEditing(false);
      alert('Plano salvo com sucesso!');
    }
  };

  const handleUpdateWeek = (weekIndex: number, field: string, value: any) => {
    setPlan(prevPlan => prevPlan.map((week, wIdx) => {
      if (wIdx !== weekIndex) return week;
      return { ...week, [field]: value };
    }));
  };

  const handleUpdateWorkout = (weekIndex: number, dayIndex: number, field: string, value: any) => {
    setPlan(prevPlan => prevPlan.map((week, wIdx) => {
      if (wIdx !== weekIndex) return week;
      
      const newWorkouts = [...week.workouts];
      newWorkouts[dayIndex] = {
          ...newWorkouts[dayIndex],
          [field]: value
      };

      return { ...week, workouts: newWorkouts };
    }));
  };

  // Load from Library Function
  const handleLoadFromLibrary = (weekIndex: number, dayIndex: number, workoutId: string) => {
    if (!workoutId) return;
    const libWorkout = libraryWorkouts.find(w => w.id === workoutId);
    if (!libWorkout) return;

    setPlan(prevPlan => prevPlan.map((week, wIdx) => {
      if (wIdx !== weekIndex) return week;
      
      const newWorkouts = [...week.workouts];
      newWorkouts[dayIndex] = {
        ...newWorkouts[dayIndex],
        customDescription: libWorkout.description,
        type: libWorkout.type === 'Long Run' ? 'Long' : libWorkout.type === 'Interval' ? 'Interval' : libWorkout.type === 'Tempo' ? 'Tempo' : 'Recovery',
        distance: libWorkout.distanceKm
      };
      
      return { ...week, workouts: newWorkouts };
    }));
  };

  const handleAddWorkout = (weekIndex: number) => {
    setPlan(prevPlan => prevPlan.map((week, wIdx) => {
      if (wIdx !== weekIndex) return week;
      
      return {
        ...week,
        workouts: [
          ...week.workouts,
          {
            day: 'Novo',
            type: 'Recovery',
            customDescription: 'Novo treino adicionado',
            distance: 0,
            completed: false
          }
        ]
      };
    }));
  };

  const handleRemoveWorkout = (weekIndex: number, dayIndex: number, e: React.MouseEvent) => {
    e.stopPropagation(); 
    e.preventDefault();
    setDeleteModal({ isOpen: true, weekIndex, dayIndex });
  };

  const executeDeleteWorkout = () => {
    if (!deleteModal) return;
    const { weekIndex, dayIndex } = deleteModal;

    setPlan(prevPlan => prevPlan.map((week, wIdx) => {
      if (wIdx !== weekIndex) return week;
      if (!week.workouts) return week;

      const newWorkouts = week.workouts.filter((_, dIdx) => dIdx !== dayIndex);

      return { ...week, workouts: newWorkouts };
    }));
    
    setDeleteModal(null);
  };

  const toggleWeekVisibility = (weekIndex: number) => {
    const newPlan = [...plan];
    newPlan[weekIndex].isVisible = !newPlan[weekIndex].isVisible;
    setPlan(newPlan);
    if(activeAthlete) saveAthletePlan(activeAthlete.id, newPlan);
  };

  const handlePrint = () => {
    window.print();
  };

  const mapPhase = (phase: string) => {
    switch(phase) {
        case 'Base': return 'Base';
        case 'Build': return 'Construção';
        case 'Peak': return 'Pico';
        case 'Taper': return 'Polimento';
        default: return phase;
    }
  }

  // Handle custom zones first, then calculated
  const getAthletePaces = () => {
    if (!activeAthlete) return [];
    if (activeAthlete.customZones && activeAthlete.customZones.length > 0) {
      return activeAthlete.customZones;
    }
    return calculatePaces(activeAthlete.metrics.vdot, activeAthlete.metrics.fcThreshold, activeAthlete.metrics.fcMax);
  };

  const athletePaces = getAthletePaces();

  return (
    <div className="space-y-6 relative">

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 no-print">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-fade-in-up border-l-4 border-red-500">
             <div className="flex items-center gap-3 text-red-600 mb-4">
               <AlertTriangle className="w-8 h-8" />
               <h3 className="text-xl font-bold">Excluir Treino?</h3>
             </div>
             <p className="text-slate-600 mb-6">
               Tem certeza que deseja remover este treino da semana? Esta ação será refletida ao salvar o plano.
             </p>
             <div className="flex gap-3 justify-end">
               <button 
                 onClick={() => setDeleteModal(null)}
                 className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
               >
                 Cancelar
               </button>
               <button 
                 onClick={executeDeleteWorkout}
                 className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium shadow-md flex items-center gap-2"
               >
                 <Trash2 className="w-4 h-4" /> Remover
               </button>
             </div>
          </div>
        </div>
      )}

      <header className="flex justify-between items-center no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="text-purple-600" />
            Prescrição Inteligente (IA)
          </h1>
          <p className="text-slate-500">Gerar, editar e imprimir microciclos periodizados</p>
        </div>
        <div className="flex gap-2">
           {plan.length > 0 && (
             <>
               <button 
                  onClick={() => setShowPrintPreview(true)}
                  className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
                >
                  <FileDown className="w-4 h-4" /> Exportar PDF
                </button>
               <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm border ${isEditing ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-700'}`}
                >
                  <Edit2 className="w-4 h-4" /> {isEditing ? 'Modo Edição' : 'Editar'}
                </button>
                <button 
                  onClick={handleSave}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm"
                >
                  <Save className="w-4 h-4" /> Salvar
                </button>
             </>
           )}
        </div>
      </header>

      {!activeAthlete ? (
         <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 no-print">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  Nenhum atleta selecionado. Vá para a aba **Atletas** e selecione um para prescrever o treino.
                </p>
              </div>
            </div>
          </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 no-print">
          {/* Config Panel */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
            <h3 className="font-bold text-slate-800 mb-4 border-b pb-2">Configuração do Plano</h3>
            <div className="space-y-4">
              <div className="text-sm bg-blue-50 p-2 rounded border border-blue-100 mb-2">
                <span className="font-bold">Atleta:</span> {activeAthlete.name} <br/>
                <span className="font-bold">VDOT:</span> {activeAthlete.metrics.vdot}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Objetivo da Prova</label>
                <input 
                  className="w-full border rounded p-2 text-sm" 
                  value={goal} 
                  onChange={e => setGoal(e.target.value)} 
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium mb-1">Semanas</label>
                  <input 
                    type="number" className="w-full border rounded p-2 text-sm" 
                    value={weeks} onChange={e => setWeeks(Number(e.target.value))} min={1} max={12}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Dias/Sem</label>
                  <input 
                    type="number" className="w-full border rounded p-2 text-sm" 
                    value={daysPerWeek} onChange={e => setDaysPerWeek(Number(e.target.value))} min={1} max={7}
                  />
                </div>
              </div>

              <button 
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-bold shadow transition flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Gerar Plano IA
              </button>
              {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            </div>
          </div>

          {/* Plan Display (Coach View) */}
          <div className="lg:col-span-3 space-y-4">
            {plan.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-64 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 text-slate-400">
                <Calendar className="w-12 h-12 mb-2" />
                <p>Configure e gere para ver o plano de treinamento</p>
              </div>
            )}

            {plan.map((week, weekIndex) => (
              <div key={week.weekNumber} className={`bg-white rounded-xl shadow-sm border transition-all ${week.isVisible === false ? 'border-slate-200 opacity-60' : 'border-slate-200'}`}>
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-800">Semana {week.weekNumber} <span className="ml-2 px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 uppercase">{mapPhase(week.phase)}</span></h3>
                    <span className="text-sm font-medium text-slate-600">{week.totalVolume} km Total</span>
                  </div>
                  <button 
                    onClick={() => toggleWeekVisibility(weekIndex)}
                    className="text-slate-500 hover:text-blue-600 flex items-center gap-1 text-sm"
                    title={week.isVisible !== false ? "Visível para o Atleta" : "Oculto para o Atleta"}
                  >
                    {week.isVisible !== false ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {week.workouts.map((workout, dayIndex) => (
                    <div key={dayIndex} className="p-4 hover:bg-slate-50 transition flex flex-col gap-2 group">
                      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                        {isEditing ? (
                          <input 
                            className="w-24 p-1 border rounded text-sm font-medium uppercase"
                            value={workout.day}
                            onChange={(e) => handleUpdateWorkout(weekIndex, dayIndex, 'day', e.target.value)}
                          />
                        ) : (
                          <div className="w-24 font-medium text-slate-400 text-sm uppercase">{workout.day}</div>
                        )}
                        
                        <div className="flex-1 w-full space-y-2">
                          {isEditing && (
                            <div className="flex gap-2">
                                <select 
                                  className="text-xs p-1 border rounded bg-slate-50 text-slate-600 w-1/4"
                                  value={workout.type || 'Recovery'}
                                  onChange={(e) => handleUpdateWorkout(weekIndex, dayIndex, 'type', e.target.value)}
                                >
                                  <option value="Recovery">Recuperação</option>
                                  <option value="Long">Longo</option>
                                  <option value="Tempo">Tempo</option>
                                  <option value="Interval">Intervalo</option>
                                  <option value="Rest">Descanso</option>
                                  <option value="Strength">Fortalecimento</option>
                                </select>
                                <select
                                  className="text-xs p-1 border rounded bg-blue-50 text-blue-800 font-bold w-1/3"
                                  onChange={(e) => handleLoadFromLibrary(weekIndex, dayIndex, e.target.value)}
                                  defaultValue=""
                                >
                                  <option value="" disabled>Carregar da Biblioteca...</option>
                                  {libraryWorkouts.map(libW => (
                                    <option key={libW.id} value={libW.id}>{libW.title}</option>
                                  ))}
                                </select>
                            </div>
                          )}
                          {isEditing ? (
                            <textarea
                              className="w-full p-2 border rounded text-slate-800 text-sm focus:ring-2 focus:ring-blue-500"
                              rows={2}
                              value={workout.customDescription || ''}
                              onChange={(e) => handleUpdateWorkout(weekIndex, dayIndex, 'customDescription', e.target.value)}
                            />
                          ) : (
                            <div className="font-medium text-slate-800">{workout.customDescription}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-4 min-w-[120px]">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input 
                                type="number" 
                                className="w-16 p-1 border rounded text-sm"
                                value={workout.distance || 0}
                                onChange={(e) => handleUpdateWorkout(weekIndex, dayIndex, 'distance', Number(e.target.value))}
                              />
                              <span className="text-xs text-slate-500">km</span>
                            </div>
                          ) : (
                            <span className="text-sm bg-slate-100 px-2 py-1 rounded text-slate-600">{workout.distance} km</span>
                          )}
                          
                          {isEditing && (
                            <button 
                              type="button"
                              onClick={(e) => handleRemoveWorkout(weekIndex, dayIndex, e)}
                              className="text-red-400 hover:text-red-600 p-2 bg-red-50 rounded hover:bg-red-100 transition"
                              title="Excluir Treino"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {workout.feedback && (
                        <div className="ml-0 md:ml-28 mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3 text-sm text-yellow-800 animate-fade-in">
                           <MessageSquare className="w-4 h-4 flex-shrink-0 mt-0.5" />
                           <div>
                             <span className="font-bold block text-xs uppercase opacity-75">Feedback do Atleta</span>
                             {workout.feedback}
                           </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {isEditing && (
                    <>
                      <div className="p-2 bg-slate-50 flex justify-center border-b border-slate-100">
                        <button 
                          onClick={() => handleAddWorkout(weekIndex)}
                          className="text-xs flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium px-3 py-1 rounded hover:bg-blue-100 transition"
                        >
                          <Plus className="w-3 h-3" /> Adicionar Treino na Semana
                        </button>
                      </div>
                      <div className="p-4 bg-yellow-50/50">
                        <label className="block text-xs font-bold text-yellow-800 mb-1 flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" /> Observações da Semana (Aparece no PDF)
                        </label>
                        <textarea
                          className="w-full p-2 border border-yellow-200 rounded text-sm text-slate-700 focus:ring-2 focus:ring-yellow-400 bg-white"
                          placeholder="Ex: Focar na cadência nos tiros longos; Manter hidratação alta."
                          rows={2}
                          value={week.coachNotes || ''}
                          onChange={(e) => handleUpdateWeek(weekIndex, 'coachNotes', e.target.value)}
                        />
                      </div>
                    </>
                  )}
                  {!isEditing && week.coachNotes && (
                     <div className="p-4 bg-yellow-50 border-t border-yellow-100 text-sm text-slate-700 flex gap-2">
                         <MessageCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                         <div>
                            <span className="font-bold text-yellow-800 block text-xs uppercase mb-1">Observações do Treinador:</span>
                            {week.coachNotes}
                         </div>
                     </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {showPrintPreview && activeAthlete && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto no-print">
           <div className="bg-slate-200 w-full max-w-6xl min-h-[90vh] rounded-xl shadow-2xl flex flex-col">
              {/* Modal Toolbar */}
              <div className="bg-slate-800 text-white p-4 rounded-t-xl flex flex-col md:flex-row justify-between items-center sticky top-0 z-10 gap-4 md:gap-0">
                 <div>
                   <h3 className="font-bold flex items-center gap-2 text-lg">
                     <Printer className="w-5 h-5" /> Salvar como PDF
                   </h3>
                   <div className="bg-blue-600/30 text-blue-100 text-xs px-3 py-2 rounded mt-1 border border-blue-500/50 flex items-start gap-2 max-w-md">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <span>
                        Para salvar o arquivo: Clique no botão verde ao lado. Na janela que abrir, em "Destino" ou "Impressora", selecione a opção <b>"Salvar como PDF"</b> e clique em Salvar para escolher a pasta.
                      </span>
                   </div>
                 </div>
                 <div className="flex gap-3 w-full md:w-auto">
                   <button 
                     onClick={() => setShowPrintPreview(false)}
                     className="px-4 py-2 text-slate-300 hover:text-white transition w-full md:w-auto"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={handlePrint}
                     className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow flex items-center justify-center gap-2 w-full md:w-auto"
                   >
                     <FileDown className="w-4 h-4" /> Salvar como PDF
                   </button>
                 </div>
              </div>
              
              {/* Simulated Paper Background */}
              <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center bg-slate-500">
                 <div className="shadow-2xl w-[297mm] min-h-[210mm] bg-white p-[5mm] origin-top transform scale-[0.5] sm:scale-75 md:scale-90 transition-transform">
                    <PrintLayout 
                      athlete={activeAthlete}
                      plan={plan}
                      paces={athletePaces}
                      goal={goal}
                    />
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Actual Print Content (Visible only during print process via CSS) */}
      <div id="printable-area" className="hidden">
         {activeAthlete && (
            <PrintLayout 
              athlete={activeAthlete}
              plan={plan}
              paces={athletePaces}
              goal={goal}
            />
         )}
      </div>
    </div>
  );
};

export default Periodization;

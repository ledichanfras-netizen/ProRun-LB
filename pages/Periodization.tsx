
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { generateTrainingPlan } from '../services/geminiService';
import { TrainingWeek, Athlete, TrainingPace, Workout } from '../types';
import { PrintLayout } from '../components/PrintLayout';
import { Sparkles, Calendar, Loader2, AlertCircle, Save, Printer, Edit2, Eye, EyeOff, MessageSquare, Plus, Trash2, Heart, X, Check, BookOpen, AlertTriangle, FileDown, Info, MessageCircle, MapPin, Flag, Timer } from 'lucide-react';
import { calculatePaces } from '../utils/calculations';

// --- Main Page Component ---
const Periodization: React.FC = () => {
  const { athletes, selectedAthleteId, athletePlans, saveAthletePlan, workouts: libraryWorkouts } = useApp();
  
  // New State for Goal Configuration
  const [raceDate, setRaceDate] = useState('');
  const [raceDistance, setRaceDistance] = useState('10km');
  const [goalDescription, setGoalDescription] = useState('Completar bem / Sub ...');
  
  const [weeks, setWeeks] = useState(4); // Calculated automatically but editable
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

  // Load existing plan
  useEffect(() => {
    if (activeAthlete && athletePlans[activeAthlete.id]) {
      const p = athletePlans[activeAthlete.id];
      setPlan(p);
      // Try to estimate weeks based on existing plan length
      if (p.length > 0) setWeeks(p.length);
    } else {
      setPlan([]);
    }
  }, [activeAthlete, athletePlans]);

  // Calculate weeks when Race Date changes
  useEffect(() => {
    if (raceDate) {
      const today = new Date();
      const race = new Date(raceDate);
      
      // Calculate difference in time
      const diffTime = race.getTime() - today.getTime();
      
      // Calculate difference in days
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Calculate weeks (minimum 1)
      let calculatedWeeks = Math.ceil(diffDays / 7);
      
      if (calculatedWeeks < 1) calculatedWeeks = 1;
      if (calculatedWeeks > 24) calculatedWeeks = 24; // Cap at 6 months for safety

      setWeeks(calculatedWeeks);
    }
  }, [raceDate]);

  const handleGenerate = async () => {
    if (!activeAthlete) return;
    if (!raceDate) {
      setError("Por favor, selecione a Data da Prova.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const generatedPlan = await generateTrainingPlan(
        activeAthlete, 
        goalDescription, 
        weeks, 
        daysPerWeek,
        raceDistance,
        raceDate
      );
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

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault(); // Previne comportamentos padrão
    if (activeAthlete) {
      const originalTitle = document.title;
      const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      document.title = `Treino_${activeAthlete.name.replace(/\s+/g, '_')}_${dateStr}`;
      
      // Execução síncrona imediata para evitar bloqueio de popup pelo navegador
      window.print();
      
      // Restaura o título após a abertura do diálogo
      // O timeout aqui é aceitável pois não bloqueia a ação principal
      setTimeout(() => {
        document.title = originalTitle;
      }, 500);
    } else {
      window.print();
    }
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
  const printablePlan = plan.filter(w => w.isVisible !== false);
  const goalText = raceDate ? `${raceDistance} em ${new Date(raceDate).toLocaleDateString('pt-BR')} - ${goalDescription}` : goalDescription;

  return (
    <div className="space-y-6 relative">

      {/* REACT PORTAL FOR PRINTING */}
      {/* O Portal renderiza fora do #root, permitindo que a impressão (que oculta #root) funcione */}
      {activeAthlete && createPortal(
        <div id="printable-portal">
          <PrintLayout 
              athlete={activeAthlete}
              plan={printablePlan}
              paces={athletePaces}
              goal={goalText}
            />
        </div>,
        document.body
      )}

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

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Sparkles className="text-purple-600" />
            Prescrição Inteligente (IA)
          </h1>
          <p className="text-sm md:text-base text-slate-500">Gerar, editar e imprimir microciclos periodizados</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
           {plan.length > 0 && (
             <>
               <button 
                  onClick={() => setShowPrintPreview(true)}
                  className="flex-1 md:flex-none bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm"
                >
                  <FileDown className="w-4 h-4" /> Exportar PDF
                </button>
               <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className={`flex-1 md:flex-none px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm border ${isEditing ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-200 text-slate-700'}`}
                >
                  <Edit2 className="w-4 h-4" /> {isEditing ? 'Edição' : 'Editar'}
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 md:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm"
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
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 no-print">
          {/* Config Panel */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-fit">
            <h3 className="font-bold text-slate-800 mb-4 border-b pb-2 flex items-center gap-2">
               <Flag className="w-5 h-5 text-green-600" /> Configurar Prova Alvo
            </h3>
            <div className="space-y-4">
              <div className="text-sm bg-blue-50 p-2 rounded border border-blue-100 mb-2">
                <span className="font-bold">Atleta:</span> {activeAthlete.name} <br/>
                <span className="font-bold">VO2:</span> {activeAthlete.metrics.vdot}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                   <Calendar className="w-3 h-3" /> Data da Prova
                </label>
                <input 
                  type="date"
                  className="w-full border rounded p-2 text-sm focus:ring-2 focus:ring-green-500 outline-none" 
                  value={raceDate} 
                  onChange={e => setRaceDate(e.target.value)} 
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                   <MapPin className="w-3 h-3" /> Distância
                </label>
                <select 
                  className="w-full border rounded p-2 text-sm bg-white"
                  value={raceDistance}
                  onChange={e => setRaceDistance(e.target.value)}
                >
                   <option value="5km">5km</option>
                   <option value="10km">10km</option>
                   <option value="15km">15km (São Silvestre)</option>
                   <option value="21km">21km (Meia Maratona)</option>
                   <option value="42km">42km (Maratona)</option>
                   <option value="Outra">Outra Distância</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                   <Timer className="w-3 h-3" /> Objetivo de Tempo/Meta
                </label>
                <input 
                  className="w-full border rounded p-2 text-sm" 
                  placeholder="Ex: Sub 50min / Completar bem"
                  value={goalDescription} 
                  onChange={e => setGoalDescription(e.target.value)} 
                />
              </div>
              
              <div className="bg-slate-100 p-3 rounded-lg border border-slate-200">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-500 uppercase">Duração (Calculada)</span>
                    <span className="text-sm font-bold text-slate-800">{weeks} Semanas</span>
                 </div>
                 <input 
                    type="range"
                    min="1" max="24"
                    value={weeks}
                    onChange={(e) => setWeeks(Number(e.target.value))}
                    className="w-full h-2 bg-slate-300 rounded-lg appearance-none cursor-pointer"
                 />
                 <div className="mt-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dias de Treino/Semana</label>
                    <div className="flex gap-2">
                       {[3,4,5,6].map(d => (
                         <button 
                           key={d}
                           onClick={() => setDaysPerWeek(d)}
                           className={`flex-1 py-1 rounded text-sm font-bold transition ${daysPerWeek === d ? 'bg-slate-800 text-white' : 'bg-white border border-slate-300 text-slate-600'}`}
                         >
                           {d}
                         </button>
                       ))}
                    </div>
                 </div>
              </div>

              <button 
                onClick={handleGenerate}
                disabled={loading || !raceDate}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-bold shadow transition flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Gerar Periodização
              </button>
              {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            </div>
          </div>

          {/* Plan Display (Coach View) */}
          <div className="xl:col-span-3 space-y-4">
            {plan.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-64 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 text-slate-400">
                <Calendar className="w-12 h-12 mb-2" />
                <p>Configure a data da prova e gere o plano para visualizar.</p>
              </div>
            )}

            {plan.map((week, weekIndex) => (
              <div key={week.weekNumber} className={`bg-white rounded-xl shadow-sm border transition-all ${week.isVisible === false ? 'border-slate-200 opacity-60' : 'border-slate-200'}`}>
                <div className="bg-slate-50 px-4 md:px-6 py-3 border-b border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-800">Semana {week.weekNumber} <span className="ml-2 px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 uppercase">{mapPhase(week.phase)}</span></h3>
                    <span className="text-sm font-medium text-slate-600 whitespace-nowrap">{week.totalVolume} km Total</span>
                  </div>
                  <button 
                    onClick={() => toggleWeekVisibility(weekIndex)}
                    className="text-slate-500 hover:text-blue-600 flex items-center gap-1 text-sm self-end md:self-auto"
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
                          <div className="w-full md:w-24 font-medium text-slate-400 text-sm uppercase">{workout.day}</div>
                        )}
                        
                        <div className="flex-1 w-full space-y-2">
                          {isEditing && (
                            <div className="flex flex-wrap gap-2">
                                <select 
                                  className="text-xs p-1 border rounded bg-slate-50 text-slate-600 flex-1 min-w-[100px]"
                                  value={workout.type || 'Recovery'}
                                  onChange={(e) => handleUpdateWorkout(weekIndex, dayIndex, 'type', e.target.value)}
                                >
                                  <option value="Recovery">Recuperação</option>
                                  <option value="Long">Longo</option>
                                  <option value="Tempo">Tempo</option>
                                  <option value="Interval">Intervalado</option>
                                  <option value="Rest">Descanso</option>
                                  <option value="Strength">Fortalecimento</option>
                                </select>
                                <select
                                  className="text-xs p-1 border rounded bg-blue-50 text-blue-800 font-bold flex-1 min-w-[150px]"
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
                        <div className="flex items-center gap-4 min-w-[120px] self-end md:self-center">
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

      {/* Print Preview Modal - NOW SIMPLIFIED & CENTERED */}
      {showPrintPreview && activeAthlete && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 overflow-hidden no-print">
           <div className="bg-slate-200 w-full md:max-w-6xl h-full md:h-[90vh] md:rounded-xl shadow-2xl flex flex-col">
              {/* Modal Toolbar */}
              <div className="bg-slate-800 text-white p-4 md:rounded-t-xl flex flex-col md:flex-row justify-between items-center sticky top-0 z-10 gap-4 md:gap-0 shadow-lg">
                 <div className="flex-1">
                   <h3 className="font-bold flex items-center gap-2 text-lg">
                     <Printer className="w-5 h-5" /> Exportar PDF
                   </h3>
                   <div className="flex items-start gap-2 text-xs text-slate-300 mt-1 max-w-lg">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                      <span>
                        Serão exportadas apenas as semanas marcadas como <b>visíveis</b> (ícone de olho). Layout ajustado para Paisagem.
                      </span>
                   </div>
                 </div>
                 <div className="flex gap-3 w-full md:w-auto mt-2 md:mt-0">
                   <button 
                     onClick={() => setShowPrintPreview(false)}
                     className="px-4 py-2 text-slate-300 hover:text-white transition w-full md:w-auto border border-slate-600 rounded"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={handlePrint}
                     className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold shadow flex items-center justify-center gap-2 w-full md:w-auto"
                   >
                     <Printer className="w-4 h-4" /> Imprimir / Salvar PDF
                   </button>
                 </div>
              </div>
              
              <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-start md:justify-center bg-slate-500/50">
                  {/* FIXED WIDTH 297mm for A4 Landscape Simulation - Centered */}
                  <div className="shadow-2xl bg-white origin-top shrink-0" style={{ width: '297mm', minHeight: '210mm' }}>
                    <PrintLayout 
                      athlete={activeAthlete}
                      plan={printablePlan}
                      paces={athletePaces}
                      goal={goalText}
                    />
                  </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Periodization;

import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { 
  Plus,
  Trash2,
  Edit2,
  Save, 
  Download,
  Search,
  ChevronDown,
  Target,
  Sparkles,
  MessageSquare,
  Activity,
  Book,
  Eye,
  EyeOff,
  CalendarDays,
  Unlock,
  Lock,
  Zap,
  X,
  TrendingUp,
  Loader2,
  Users
} from 'lucide-react';
import { generateTrainingPlan } from '../services/geminiService';
import { calculatePaces } from '../utils/calculations';
import { exportToImage } from '../utils/exporter';
import { createPortal } from 'react-dom';
import { PrintLayout } from '../components/PrintLayout';
import { AthletePlan, TrainingWeek, WorkoutType, Workout } from '../types';
import { safeDeepClone, withTimeout } from '../utils/helpers';

export const diasSemanaFull = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

const Periodization: React.FC = () => {
  const { athletes, selectedAthleteId, workouts, athletePlans, saveAthletePlan } = useApp();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [raceDistance, setRaceDistance] = useState('Maratona (42k)');
  const [raceDate, setRaceDate] = useState('');
  const [raceGoal, setRaceGoal] = useState('');
  const [weeks, setWeeks] = useState(12);
  const [goalDescription, setGoalDescription] = useState('');
  const [fullPlan, setFullPlan] = useState<AthletePlan | null>(null);

  const [runningDays, setRunningDays] = useState(4);
  const [gymDays, setGymDays] = useState(2);

  // Library Modal State
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryTarget, setLibraryTarget] = useState<{wIdx: number, dIdx: number} | null>(null);
  const [librarySearch, setLibrarySearch] = useState("");

  const activeAthlete = athletes.find(a => a.id === selectedAthleteId);
  const portalRoot = document.getElementById('print-layout-root');

  useEffect(() => {
    if (activeAthlete && athletePlans[activeAthlete.id]) {
      setFullPlan(athletePlans[activeAthlete.id]);
    } else {
      setFullPlan(null);
    }
  }, [selectedAthleteId, athletePlans]);

  const handleGenerate = async () => {
    if (!activeAthlete || !raceDate) {
      alert("Defina a data da prova para iniciar a periodização.");
      return;
    }

    setLoading(true);
    try {
      const generated = await generateTrainingPlan(
        activeAthlete,
        goalDescription,
        weeks,
        runningDays,
        gymDays,
        raceDistance,
        raceDate,
        raceGoal
      );

      const normalizedWeeks = generated.weeks.map(w => {
        const workoutsWithDescanso = diasSemanaFull.map(dayName => {
           const found = w.workouts.find(sw => sw.day.includes(dayName) || dayName.includes(sw.day));
           return found ? { ...found, day: dayName } : { day: dayName, type: 'Descanso' as WorkoutType, customDescription: 'Descanso total.', distance: 0 };
        });
        return { ...w, isVisible: false, workouts: workoutsWithDescanso } as TrainingWeek;
      });

      const newPlan: AthletePlan = { 
        ...generated, 
        weeks: normalizedWeeks, 
        specificGoal: raceGoal ? `${raceDistance} (${raceGoal})` : raceDistance 
      };
      setFullPlan(newPlan);
      await withTimeout(saveAthletePlan(activeAthlete.id, newPlan));
      setIsEditing(true);
    } catch (e: any) {
      alert("Erro na IA: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualStart = async () => {
    if (!activeAthlete || !raceDate) {
      alert("Defina a data da prova para iniciar a periodização.");
      return;
    }

    const manualWeeks: TrainingWeek[] = [];
    for (let i = 1; i <= weeks; i++) {
      const phase: any = i <= Math.ceil(weeks * 0.4) ? "Base" :
                    i <= Math.ceil(weeks * 0.7) ? "Construção" :
                    i <= weeks - 1 ? "Pico" : "Polimento";

      manualWeeks.push({
        id: crypto.randomUUID(),
        weekNumber: i,
        phase,
        totalVolume: 0,
        isVisible: false,
        workouts: diasSemanaFull.map(day => ({
          day,
          type: "Descanso",
          customDescription: "Descanso total.",
          distance: 0
        }))
      });
    }

    const newPlan: AthletePlan = {
      weeks: manualWeeks,
      specificGoal: raceGoal || raceDistance,
      raceStrategy: "Defina sua estratégia de prova aqui."
    };

    setFullPlan(newPlan);
    await withTimeout(saveAthletePlan(activeAthlete.id, newPlan));
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (activeAthlete && fullPlan) {
      try {
        await withTimeout(saveAthletePlan(activeAthlete.id, fullPlan));
        setIsEditing(false);
      } catch (error) {
        console.error("Erro ao publicar:", error);
      }
    }
  };

  const updateWorkout = (weekIdx: number, dayIdx: number, field: keyof Workout, value: any) => {
    if (!fullPlan) return;
    const newPlan = safeDeepClone(fullPlan);
    const target = newPlan.weeks[weekIdx].workouts[dayIdx];
    
    target[field] = value;

    // Recalcular volume da semana
    let newVolume = 0;
    newPlan.weeks[weekIdx].workouts.forEach((w: Workout) => {
      if (w.distance) newVolume += w.distance;
    });
    newPlan.weeks[weekIdx].totalVolume = newVolume;
    
    setFullPlan(newPlan);
  };

  const [exportLoading, setExportLoading] = useState(false);

  const handleDownloadImage = async () => {
    if (exportLoading || !activeAthlete) return;
    
    setExportLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      const success = await exportToImage('print-layout-root', `Periodizacao_${activeAthlete.name.replace(/\s+/g, '_')}`);
      if (success) console.log("Imagem exportada");
    } catch (err) {
      console.error("Erro no download:", err);
      alert("Erro ao gerar imagem.");
    } finally {
      setExportLoading(false);
    }
  };

  const athletePaces = activeAthlete ? (activeAthlete.customZones || calculatePaces(activeAthlete.metrics.vdot, activeAthlete.metrics.fcThreshold, activeAthlete.metrics.fcMax)) : [];
  const printableWeeks = (fullPlan?.weeks || []).filter(w => w.isVisible === true);

  if (!activeAthlete) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] shadow-sm border border-slate-100 text-center px-6">
        <div className="bg-emerald-50 p-6 rounded-full mb-6">
          <Users className="w-12 h-12 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Nenhum Atleta Selecionado</h2>
        <p className="text-slate-500 mt-2 font-medium italic max-w-sm">
          Selecione um atleta na aba \"Meus Atletas\" para gerenciar sua periodização.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-20 no-print animate-fade-in">
      {activeAthlete && fullPlan && portalRoot && createPortal(
        <PrintLayout 
          athlete={activeAthlete} 
          plan={printableWeeks} 
          paces={athletePaces} 
          goal={raceGoal || fullPlan.specificGoal || ''} 
          totalWeeks={fullPlan.weeks.length}
        />,
        portalRoot
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3">
            <Sparkles className="text-emerald-600 w-8 h-8" /> Ciclo: {activeAthlete.name}
          </h1>
          <p className="text-slate-500 mt-1 font-medium italic">IA Treinador: Prescrição personalizada até o dia da prova.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
           {fullPlan && (
             <>
               <button 
                 onClick={handleDownloadImage} 
                 disabled={exportLoading}
                 className="bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition shadow-lg uppercase text-[10px] italic tracking-widest disabled:opacity-50"
               >
                 {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} 
                 {exportLoading ? 'GERANDO...' : 'Baixar Planilha'}
               </button>
               <button onClick={() => setIsEditing(!isEditing)} className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition border-2 ${isEditing ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200'}`}>
                 {isEditing ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />} {isEditing ? 'Travar Edição' : 'Editar Manual'}
               </button>
               <button onClick={handleSave} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-lg uppercase text-xs italic tracking-widest"><Save className="w-4 h-4" /> Publicar Alterações</button>
             </>
           )}
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b pb-2">
              <Target className="w-4 h-4 text-emerald-600" />
              <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400">Configuração do Ciclo</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Distância da Prova</label>
                <select className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold outline-none" value={raceDistance} onChange={e => setRaceDistance(e.target.value)}>
                  <option>5km</option>
                  <option>10km</option>
                  <option>Meia Maratona (21k)</option>
                  <option>Maratona (42k)</option>
                  <option>Ultra Maratona</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Meta de Tempo (Opcional)</label>
                <input
                  type="text"
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold outline-none italic"
                  placeholder="Ex: Sub 4h ou RP..."
                  value={raceGoal}
                  onChange={e => setRaceGoal(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Dias de Corrida</label>
                  <input type="number" className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold outline-none" value={runningDays} onChange={e => setRunningDays(Number(e.target.value))} />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Dias de Gym</label>
                  <input type="number" className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold outline-none" value={gymDays} onChange={e => setGymDays(Number(e.target.value))} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> Contexto para a IA
                </label>
                <textarea
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-medium outline-none resize-none"
                  rows={4}
                  placeholder="Ex: Limitar treinos de semana em 50 min. Focar em volume no domingo..."
                  value={goalDescription}
                  onChange={e => setGoalDescription(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Semanas</label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold outline-none"
                    value={weeks}
                    onChange={e => setWeeks(Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Data da Prova</label>
                  <input
                    type="date"
                    className="w-full bg-emerald-50 border-none rounded-xl p-3 text-xs font-bold outline-none text-emerald-900"
                    value={raceDate}
                    onChange={e => setRaceDate(e.target.value)}
                  />
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full bg-emerald-950 text-white p-4 rounded-2xl font-black text-[10px] uppercase italic tracking-widest shadow-xl shadow-emerald-900/40 hover:scale-105 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-emerald-400" />}
                {loading ? 'Consultando IA...' : 'Gerar com Inteligência Artificial'}
              </button>

              <button
                onClick={handleManualStart}
                disabled={loading}
                className="w-full bg-slate-50 text-slate-500 p-3 rounded-xl font-bold text-[9px] uppercase italic tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-3 h-3" /> Prescrever Manulamente
              </button>
            </div>
          </div>
        </div>

        <div className="xl:col-span-3 space-y-8">
          {fullPlan ? (
            fullPlan.weeks.map((week, weekIndex) => (
              <div key={week.id} className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <div className="bg-slate-50 px-8 py-5 flex justify-between items-center border-b border-slate-100">
                  <div className="flex items-center gap-6">
                    <span className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black italic text-xl shadow-lg">#{week.weekNumber}</span>
                    <div>
                       <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-lg">Semana {week.weekNumber}</h3>
                       <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">{week.phase}</p>
                    </div>
                    <div className="h-8 w-px bg-slate-200 hidden md:block"></div>
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-tighter italic flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> volume total: <span className="text-slate-900">{week.totalVolume || 0} KM</span>
                    </span>
                  </div>
                  <button onClick={() => {
                      const newPlan = safeDeepClone(fullPlan);
                      newPlan.weeks[weekIndex].isVisible = !newPlan.weeks[weekIndex].isVisible;
                      setFullPlan(newPlan);
                  }} className={`p-2 rounded-xl transition-all border-2 ${week.isVisible === true ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-white border-slate-200 text-slate-400'}`}>
                    {week.isVisible === true ? <Eye className="w-6 h-6" /> : <EyeOff className="w-6 h-6" />}
                  </button>
                </div>
                <div className="divide-y divide-slate-50">
                  {week.workouts.map((workout, dayIndex) => (
                    <div key={dayIndex} className="p-5 flex flex-col md:flex-row gap-6 items-center border-l-8 border-slate-100 hover:bg-slate-50/30 transition-colors group">
                      <div className="w-full md:w-40 flex flex-col">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{workout.day}</p>
                         {isEditing ? (
                            <div className="relative mt-1">
                              <select
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-[10px] font-black uppercase italic outline-none appearance-none pr-8"
                                value={workout.type}
                                onChange={e => updateWorkout(weekIndex, dayIndex, 'type', e.target.value as WorkoutType)}
                              >
                                {["Regenerativo", "Longão", "Limiar", "Intervalado", "Velocidade", "Descanso", "Fortalecimento"].map(t => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            </div>
                         ) : (
                            <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase italic inline-block w-fit
                               ${workout.type === 'Descanso' ? 'bg-slate-100 text-slate-400' :
                                 workout.type === 'Fortalecimento' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                                 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>
                                {workout.type}
                            </div>
                         )}
                      </div>
                      <div className="flex-1">
                         {isEditing ? (
                            <textarea
                              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold italic outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                              value={workout.customDescription}
                              rows={2}
                              onChange={e => updateWorkout(weekIndex, dayIndex, 'customDescription', e.target.value)}
                            />
                         ) : (
                            <p className={`text-sm font-bold italic leading-relaxed ${workout.type === 'Descanso' ? 'text-slate-300' : 'text-slate-700'}`}>
                               {workout.customDescription || (workout.type === 'Descanso' ? 'Descanso total.' : '')}
                            </p>
                         )}
                      </div>
                      <div className="text-right">
                         {isEditing ? (
                            <div className="flex flex-col items-end gap-1">
                               <span className="text-[8px] font-black text-slate-400 uppercase">Distância (KM)</span>
                               <input
                                  type="number"
                                  className="w-20 bg-slate-100 border-none rounded-xl p-3 text-center font-black text-sm text-emerald-600"
                                  value={workout.distance || 0}
                                  onChange={e => updateWorkout(weekIndex, dayIndex, 'distance', Number(e.target.value))}
                                />
                            </div>
                         ) : (
                            workout.distance && workout.distance > 0 ? (
                              <div className="flex flex-col items-end">
                                 <span className="text-[11px] font-black text-slate-900 italic bg-slate-100 px-4 py-2 rounded-2xl shadow-sm border border-slate-200 whitespace-nowrap">
                                    {workout.distance} KM
                                 </span>
                              </div>
                            ) : null
                         )}
                      </div>
                      <div className="flex items-center">
                         {isEditing && (
                            <button
                              onClick={() => { setLibraryTarget({wIdx: weekIndex, dIdx: dayIndex}); setShowLibraryModal(true); }}
                              className="p-3 bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 border border-transparent rounded-2xl transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase italic shadow-sm"
                              title="Buscar na Biblioteca"
                            >
                              <Book className="w-4 h-4" /> <span className="hidden lg:block">Biblioteca</span>
                            </button>
                         )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white p-24 rounded-[4rem] border-2 border-dashed border-slate-100 flex flex-col items-center text-center">
              <div className="bg-slate-50 p-8 rounded-full mb-8">
                 <CalendarDays className="w-20 h-20 text-slate-200" />
              </div>
              <h3 className="text-2xl font-black text-slate-300 uppercase italic tracking-tighter mb-4">Aguardando Parâmetros</h3>
              <p className="text-slate-400 font-bold italic tracking-wide text-sm max-w-sm">Insira o objetivo e a Data da Prova para a Inteligência Artificial gerar o ciclo de treinamento automático.</p>
            </div>
          )}
        </div>
      </div>

      {showLibraryModal && libraryTarget && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md" onClick={() => setShowLibraryModal(false)}>
          <div className="bg-white rounded-[3rem] w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="bg-emerald-600 p-3 rounded-2xl shadow-lg shadow-emerald-500/30">
                   <Book className="w-6 h-6 text-white" />
                </div>
                <div>
                   <h3 className="font-black text-slate-900 uppercase italic tracking-tighter text-2xl">Biblioteca Técnica</h3>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Selecione uma sessão para prescrever</p>
                </div>
              </div>
              <button onClick={() => setShowLibraryModal(false)} className="p-3 hover:bg-slate-200 rounded-full transition-colors text-slate-400"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-6 border-b">
              <div className="relative">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                <input
                  type="text"
                  placeholder="Filtrar treinos salvos..."
                  className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl font-black italic outline-none focus:ring-2 focus:ring-emerald-500 text-lg"
                  value={librarySearch}
                  onChange={e => setLibrarySearch(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {workouts
                .filter(w => w.title.toLowerCase().includes(librarySearch.toLowerCase()))
                .map(workout => (
                <button
                  key={workout.id}
                  onClick={() => {
                    const mappedType = workout.type === 'Recovery' ? 'Regenerativo' :
                                     workout.type === 'Long Run' ? 'Longão' :
                                     workout.type === 'Tempo' ? 'Limiar' :
                                     workout.type === 'Interval' ? 'Intervalado' :
                                     workout.type === 'Speed' ? 'Velocidade' :
                                     workout.type === 'Strength' ? 'Fortalecimento' : 'Regenerativo';

                    updateWorkout(libraryTarget.wIdx, libraryTarget.dIdx, 'type', mappedType as WorkoutType);
                    updateWorkout(libraryTarget.wIdx, libraryTarget.dIdx, 'customDescription', workout.description);
                    updateWorkout(libraryTarget.wIdx, libraryTarget.dIdx, 'distance', workout.distanceKm || 0);
                    setShowLibraryModal(false);
                    setLibraryTarget(null);
                    setLibrarySearch("");
                  }}
                  className="w-full text-left p-6 rounded-[2rem] border-2 border-slate-50 hover:border-emerald-500 hover:bg-emerald-50 transition-all group relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-black text-slate-900 uppercase italic tracking-tighter text-lg group-hover:text-emerald-700">{workout.title}</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase italic bg-white px-2 py-1 rounded-lg border border-slate-100">{workout.type}</span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 italic leading-relaxed mb-4 group-hover:text-slate-600">"{workout.description}"</p>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-black bg-white px-3 py-1.5 rounded-xl text-emerald-600 uppercase border border-emerald-100 italic">{workout.distanceKm} KM</span>
                    <span className="text-[10px] font-black bg-white px-3 py-1.5 rounded-xl text-slate-500 uppercase border border-slate-100 italic">{workout.durationMinutes} MIN</span>
                    <span className="text-[10px] font-black text-amber-500 ml-auto flex items-center gap-1"><Zap className="w-3 h-3" /> PSE {workout.rpe}</span>
                  </div>
                </button>
              ))}
              {workouts.length === 0 && (
                <div className="text-center py-20 text-slate-300 italic font-black uppercase text-xs tracking-widest">Nenhuma sessão encontrada na biblioteca.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Periodization;

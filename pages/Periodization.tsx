
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../contexts/AppContext';
import { generateTrainingPlan } from '../services/geminiService';
import { TrainingWeek, Athlete, WorkoutType, AthletePlan, Exercise } from '../types';
import { PrintLayout } from '../components/PrintLayout';
import { getAppNow, formatWeekDateRange, getWorkoutDate, formatWorkoutDateShort } from '../utils/time';
import { 
  Sparkles, 
  Loader2, 
  Save, 
  Lock,
  Unlock,
  Target,
  Eye,
  EyeOff,
  Activity,
  CalendarDays,
  Flag,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Dumbbell,
  Zap,
  Download,
  TrendingUp,
  BookOpen,
  X,
  Plus,
  Trash2,
  ListOrdered
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { calculatePaces } from '../utils/calculations';
import { exportToImage } from '../utils/exporter';
import { safeDeepClone } from '../utils/helpers';

const Periodization: React.FC = () => {
  const { athletes, selectedAthleteId, athletePlans, saveAthletePlan, workouts: libraryWorkouts, templates, saveTemplate, addNotification } = useApp();
  
  const [raceDate, setRaceDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [raceDistance, setRaceDistance] = useState('10km');
  const [raceGoal, setRaceGoal] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [weeks, setWeeks] = useState(8);
  const [runningDays, setRunningDays] = useState(4);
  const [gymDays, setGymDays] = useState(2);
  const [trainingDays, setTrainingDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]); // All days by default
  const [loading, setLoading] = useState(false);
  const [fullPlan, setFullPlan] = useState<AthletePlan | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [targetDay, setTargetDay] = useState<{ weekIndex: number; dayIndex: number } | null>(null);
  const [targetWeekForTemplate, setTargetWeekForTemplate] = useState<number | null>(null);

  const activeAthlete = athletes.find(a => a.id === selectedAthleteId);
  const portalRoot = document.getElementById('printable-portal');

  const diasSemanaFull = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];

  const handleSaveWeekAsTemplate = (week: TrainingWeek) => {
    const name = prompt("Nome do template de semana:", `Semana de ${week.phase}`);
    if (name) {
      const cleanedWorkouts = week.workouts.map((w: any) => ({
        ...w,
        completed: false,
        feedback: undefined,
        rpe: undefined,
        workoutId: crypto.randomUUID()
      }));

      saveTemplate({
        name,
        description: `Template criado a partir da semana ${week.weekNumber}`,
        workouts: cleanedWorkouts,
        category: week.phase
      });
      alert("Template salvo com sucesso!");
    }
  };

  const handleImportTemplate = (template: any) => {
    if (targetWeekForTemplate === null || !fullPlan) return;
    
    const newPlan = safeDeepClone(fullPlan);
    const cleanedWorkouts = template.workouts.map((w: any) => ({
      ...w,
      completed: false,
      feedback: undefined,
      rpe: undefined,
      workoutId: crypto.randomUUID()
    }));

    newPlan.weeks[targetWeekForTemplate].workouts = cleanedWorkouts;
    newPlan.weeks[targetWeekForTemplate].phase = template.category;
    
    // Recalcular volume
    const total = cleanedWorkouts.reduce((acc: number, curr: any) => acc + (Number(curr.distance) || 0), 0);
    newPlan.weeks[targetWeekForTemplate].totalVolume = total;
    
    setFullPlan(newPlan);
    setShowTemplatesModal(false);
    setTargetWeekForTemplate(null);
  };
  
  const distancias = [
    { value: '5km', label: '5 km' },
    { value: '10km', label: '10 km' },
    { value: '15km', label: '15 km' },
    { value: '18km', label: '18 km' },
    { value: '21km', label: 'Meia Maratona (21k)' },
    { value: '30km', label: '30 km' },
    { value: '42km', label: 'Maratona (42k)' },
    { value: '50km', label: 'Ultra 50k' },
    { value: '80km', label: 'Ultra 80k' },
    { value: '100km', label: 'Ultra 100k' },
    { value: 'Triathlon_Short', label: 'Triathlon Short (750m/20k/5k)' },
    { value: 'Triathlon_Olimpico', label: 'Triathlon Olímpico (1.5k/40k/10k)' },
    { value: '70.3', label: 'Ironman 70.3 (1.9k/90k/21k)' },
    { value: 'Ironman', label: 'Ironman (3.8k/180k/42k)' },
    { value: 'Duathlon_Sprint', label: 'Duathlon Sprint (5k/20k/2.5k)' },
    { value: 'Duathlon_Olimpico', label: 'Duathlon Olímpico (10k/40k/5k)' },
  ];

  useEffect(() => {
    if (activeAthlete && athletePlans[activeAthlete.id]) {
      const plan = athletePlans[activeAthlete.id];
      setFullPlan(plan);
      setRaceGoal(plan.specificGoal || '');
      if (plan.startDate) setStartDate(plan.startDate);
    } else {
      setFullPlan(null);
      setRaceGoal('');
      setStartDate('');
    }
  }, [activeAthlete, athletePlans]);

  // Cálculo automático de semanas a partir das datas
  useEffect(() => {
    if (raceDate && startDate) {
      const start = new Date(startDate + 'T00:00:00');
      const race = new Date(raceDate + 'T00:00:00');
      start.setHours(0, 0, 0, 0);
      race.setHours(0, 0, 0, 0);
      
      if (race > start) {
        const diffMs = race.getTime() - start.getTime();
        const diffWeeks = Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7));
        // Limitamos entre 1 e 24 semanas para manter a qualidade da prescrição
        setWeeks(Math.min(24, Math.max(1, diffWeeks)));
      }
    }
  }, [raceDate, startDate]);

  const handleGenerate = async () => {
    if (!activeAthlete || !raceDate) {
      alert("Defina a data da prova para calcular o ciclo.");
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
        raceGoal,
        startDate,
        trainingDays
      );
      
      const normalizedWeeks = (generated.weeks || []).map(w => {
        const workoutsWithDescanso = diasSemanaFull.map(dayName => {
           const found = w.workouts.find(work => 
             work.day && work.day.toLowerCase().includes(dayName.split('-')[0].toLowerCase())
           );
           return found ? { ...found, day: dayName } : { day: dayName, type: 'Descanso' as WorkoutType, customDescription: 'Descanso total.', distance: 0 };
        });
        return { ...w, isVisible: false, workouts: workoutsWithDescanso } as TrainingWeek;
      });

      const newPlan: AthletePlan = { 
        ...generated, 
        weeks: normalizedWeeks, 
        specificGoal: raceGoal ? `${raceDistance} (${raceGoal})` : raceDistance,
        startDate: startDate || getAppNow().toISOString().split('T')[0],
        trainingDays: trainingDays
      };
      setFullPlan(newPlan);
      saveAthletePlan(activeAthlete.id, newPlan);
      setIsEditing(true);
    } catch (e: any) {
      alert("Erro na IA: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWeek = (weekIndex: number) => {
    if (!fullPlan) return;
    if (confirm("Tem certeza que deseja excluir esta semana inteira? Esta ação não pode ser desfeita.")) {
      const newPlan = safeDeepClone(fullPlan);
      newPlan.weeks.splice(weekIndex, 1);
      
      // Atualizar números das semanas subsequentes
      newPlan.weeks.forEach((w: TrainingWeek, i: number) => {
        w.weekNumber = i + 1;
      });
      
      setFullPlan(newPlan);
    }
  };

  const handleSave = () => {
    if (activeAthlete && fullPlan) {
      saveAthletePlan(activeAthlete.id, fullPlan);
      
      // Notificar Atleta sobre nova planilha
      addNotification({
        title: 'Sua planilha foi atualizada!',
        message: 'Coach Leandro publicou novos treinos no seu ciclo. Toque para ver.',
        type: 'success',
        link: '/athlete-portal',
        category: 'plan'
      });

      setIsEditing(false);
      alert('Planilha publicada com sucesso!');
    }
  };

  const handleManualCreate = () => {
    if (!activeAthlete) return;
    
    const manualWeeks: TrainingWeek[] = Array.from({ length: weeks }, (_, i) => ({
      id: crypto.randomUUID(),
      weekNumber: i + 1,
      phase: i < weeks / 2 ? 'Base' : 'Construção',
      totalVolume: 0,
      isVisible: true,
      workouts: diasSemanaFull.map(day => ({
        day,
        type: 'Descanso' as WorkoutType,
        customDescription: 'Descanso total.',
        distance: 0
      }))
    }));

    const newPlan: AthletePlan = {
      weeks: manualWeeks,
      specificGoal: raceGoal || raceDistance,
      raceStrategy: 'Periodização manual iniciada.',
      motivationalMessage: 'Foco no processo!',
      startDate: startDate || getAppNow().toISOString().split('T')[0],
      trainingDays: trainingDays
    };

    setFullPlan(newPlan);
    saveAthletePlan(activeAthlete.id, newPlan);
    setIsEditing(true);
  };

  const addWeek = () => {
    if (!fullPlan) return;
    const newPlan = safeDeepClone(fullPlan);
    const nextNum = newPlan.weeks.length + 1;
    newPlan.weeks.push({
      id: crypto.randomUUID(),
      weekNumber: nextNum,
      phase: 'Base',
      totalVolume: 0,
      isVisible: true,
      workouts: diasSemanaFull.map(day => ({
        day,
        type: 'Descanso' as WorkoutType,
        customDescription: 'Descanso total.',
        distance: 0
      }))
    });
    setFullPlan(newPlan);
  };

  const updateWorkout = (wIdx: number, dIdx: number, field: string, value: any) => {
    if (!fullPlan) return;
    const newPlan = safeDeepClone(fullPlan);
    newPlan.weeks[wIdx].workouts[dIdx][field] = value;
    
    // Recalcular volume total da semana se a distância mudou
    if (field === 'distance') {
      const total = newPlan.weeks[wIdx].workouts.reduce((acc: number, curr: any) => acc + (Number(curr.distance) || 0), 0);
      newPlan.weeks[wIdx].totalVolume = total;
    }
    
    setFullPlan(newPlan);
  };

  const handleMoveWeek = (index: number, direction: 'up' | 'down') => {
    if (!fullPlan) return;
    const newPlan = safeDeepClone(fullPlan);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (targetIndex < 0 || targetIndex >= newPlan.weeks.length) return;
    
    const [movedWeek] = newPlan.weeks.splice(index, 1);
    newPlan.weeks.splice(targetIndex, 0, movedWeek);
    
    // Re-normalizar números das semanas
    newPlan.weeks.forEach((w: TrainingWeek, i: number) => {
      w.weekNumber = i + 1;
    });
    
    setFullPlan(newPlan);
  };

  const handleMoveWorkout = (weekIdx: number, dayIdx: number, direction: 'up' | 'down') => {
    if (!fullPlan) return;
    const newPlan = safeDeepClone(fullPlan);
    const targetIdx = direction === 'up' ? dayIdx - 1 : dayIdx + 1;
    
    if (targetIdx < 0 || targetIdx >= newPlan.weeks[weekIdx].workouts.length) return;
    
    // Trocamos os conteúdos, mas mantemos os nomes dos dias (day) fixos na ordem
    const currentWorkout = { ...newPlan.weeks[weekIdx].workouts[dayIdx] };
    const targetWorkout = { ...newPlan.weeks[weekIdx].workouts[targetIdx] };
    
    // Preservar o nome do dia original de cada posição
    const currentDayName = currentWorkout.day;
    const targetDayName = targetWorkout.day;
    
    // Trocar dados mas manter labels de dias
    newPlan.weeks[weekIdx].workouts[dayIdx] = { ...targetWorkout, day: currentDayName };
    newPlan.weeks[weekIdx].workouts[targetIdx] = { ...currentWorkout, day: targetDayName };
    
    setFullPlan(newPlan);
  };

  const updateWeekPhase = (weekIdx: number, value: string) => {
    if (!fullPlan) return;
    const newPlan = safeDeepClone(fullPlan);
    newPlan.weeks[weekIdx].phase = value;
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
    } catch (err: any) {
      console.error("Erro no download:", err?.message || "Erro desconhecido");
      alert("Erro ao gerar imagem.");
    } finally {
      setExportLoading(false);
    }
  };

  const handleImportFromLibrary = (libWorkout: any) => {
    if (!targetDay || !fullPlan) return;
    const { weekIndex, dayIndex } = targetDay;
    const newPlan = safeDeepClone(fullPlan);
    
    // Mapear tipo da biblioteca para tipo da periodização
    const typeMap: Record<string, WorkoutType> = {
      'Recovery': 'Regenerativo',
      'Long Run': 'Longão',
      'Tempo': 'Limiar',
      'Interval': 'Intervalado',
      'Speed': 'Velocidade',
      'Strength': 'Fortalecimento'
    };

    const workout = newPlan.weeks[weekIndex].workouts[dayIndex];
    workout.type = typeMap[libWorkout.type] || 'Regenerativo';
    workout.customDescription = libWorkout.description;
    workout.distance = libWorkout.distanceKm;
    workout.exercises = libWorkout.exercises || [];
    
    // Atualizar volume da semana
    const total = newPlan.weeks[weekIndex].workouts.reduce((acc: number, curr: any) => acc + (Number(curr.distance) || 0), 0);
    newPlan.weeks[weekIndex].totalVolume = total;

    setFullPlan(newPlan);
    setShowLibraryModal(false);
    setTargetDay(null);
  };

  const handleResetWorkout = (wIdx: number, dIdx: number) => {
    if (confirm("Deseja realmente remover este treino? Ele será resetado para Descanso.")) {
      const newPlan = safeDeepClone(fullPlan);
      newPlan.weeks[wIdx].workouts[dIdx] = {
        day: newPlan.weeks[wIdx].workouts[dIdx].day,
        type: 'Descanso' as WorkoutType,
        customDescription: 'Descanso total.',
        distance: 0,
        completed: false,
        exercises: []
      };
      // Recalcular volume
      const total = newPlan.weeks[wIdx].workouts.reduce((acc: number, curr: any) => acc + (Number(curr.distance) || 0), 0);
      newPlan.weeks[wIdx].totalVolume = total;
      setFullPlan(newPlan);
    }
  };

  const [editingExercises, setEditingExercises] = useState<{ wIdx: number, dIdx: number } | null>(null);

  const addWorkoutExercise = (wIdx: number, dIdx: number) => {
    if (!fullPlan) return;
    const newPlan = safeDeepClone(fullPlan);
    const workout = newPlan.weeks[wIdx].workouts[dIdx];
    const newEx: Exercise = {
      id: crypto.randomUUID(),
      name: '',
      sets: '',
      reps: '',
      load: '',
      order: (workout.exercises?.length || 0) + 1
    };
    workout.exercises = [...(workout.exercises || []), newEx];
    setFullPlan(newPlan);
  };

  const updateWorkoutExercise = (wIdx: number, dIdx: number, exId: string, field: keyof Exercise, value: any) => {
    if (!fullPlan) return;
    const newPlan = safeDeepClone(fullPlan);
    const workout = newPlan.weeks[wIdx].workouts[dIdx];
    workout.exercises = (workout.exercises || []).map((ex: Exercise) => 
      ex.id === exId ? { ...ex, [field]: value } : ex
    );
    setFullPlan(newPlan);
  };

  const removeWorkoutExercise = (wIdx: number, dIdx: number, exId: string) => {
    if (!fullPlan) return;
    const newPlan = safeDeepClone(fullPlan);
    const workout = newPlan.weeks[wIdx].workouts[dIdx];
    workout.exercises = (workout.exercises || []).filter((ex: Exercise) => ex.id !== exId);
    setFullPlan(newPlan);
  };

  const athletePaces = activeAthlete ? (activeAthlete.customZones || calculatePaces(activeAthlete.metrics.vdot, activeAthlete.metrics.fcThreshold, activeAthlete.metrics.fcMax)) : [];
  const printableWeeks = (fullPlan?.weeks || []).filter(w => w.isVisible === true);

  return (
    <div className="space-y-6 pb-20 no-print animate-fade-in">
      {showTemplatesModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 flex items-center gap-2">
                <CalendarDays className="text-emerald-500 w-5 h-5" /> Templates de Semana
              </h3>
              <button onClick={() => {setShowTemplatesModal(false); setTargetWeekForTemplate(null);}} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
              {templates.length > 0 ? templates.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => handleImportTemplate(t)}
                  className="p-5 border-2 border-slate-100 rounded-[2rem] hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer group flex justify-between items-center"
                >
                  <div>
                    <span className="text-[10px] font-black uppercase px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full mb-2 inline-block">{t.category}</span>
                    <h4 className="font-black text-slate-800 uppercase italic tracking-tight text-lg">{t.name}</h4>
                    <p className="text-xs text-slate-400 italic mt-1">{t.description}</p>
                  </div>
                  <ChevronDown className="w-6 h-6 text-slate-200 group-hover:text-emerald-500 -rotate-90" />
                </div>
              )) : (
                <div className="text-center py-20">
                  <CalendarDays className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                  <p className="text-slate-400 font-black uppercase italic text-xs tracking-widest">Nenhum template de semana salvo.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {showLibraryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <h3 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 flex items-center gap-2">
                <BookOpen className="text-emerald-500 w-5 h-5" /> Biblioteca de Treinos
              </h3>
              <button onClick={() => setShowLibraryModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
              {libraryWorkouts.length > 0 ? libraryWorkouts.map(w => (
                <div 
                  key={w.id} 
                  onClick={() => handleImportFromLibrary(w)}
                  className="p-4 border-2 border-slate-100 rounded-2xl hover:border-emerald-500 hover:bg-emerald-50 transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-black uppercase px-2 py-1 bg-slate-100 rounded-lg text-slate-500 group-hover:bg-emerald-200 group-hover:text-emerald-700">{w.type}</span>
                    <span className="text-[10px] font-black text-slate-400">{w.distanceKm} KM • {w.durationMinutes} MIN</span>
                  </div>
                  <h4 className="font-black text-slate-800 uppercase italic tracking-tight mb-1">{w.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 italic">{w.description}</p>
                </div>
              )) : (
                <div className="text-center py-10">
                  <p className="text-slate-400 font-black uppercase italic text-xs">Nenhum treino na biblioteca.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
            <Sparkles className="text-emerald-400 w-6 h-6" /> Ciclo de Performance
          </h1>
          <p className="text-slate-300 font-medium italic text-sm">IA Treinador: Prescrição personalizada até o dia da prova.</p>
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
                 {exportLoading ? 'GERANDO...' : 'Baixar'}
               </button>
               <button onClick={() => setIsEditing(!isEditing)} className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition border-2 ${isEditing ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200'}`}>
                 {isEditing ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />} {isEditing ? 'Travar' : 'Editar'}
               </button>
               <button onClick={handleSave} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-lg uppercase text-xs italic tracking-widest"><Save className="w-4 h-4" /> Publicar</button>
             </>
           )}
        </div>
      </header>

      {!activeAthlete ? (
         <div className="bg-white p-16 rounded-3xl text-center border-2 border-dashed border-slate-200">
            <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-black uppercase text-xs tracking-widest">Selecione um atleta para periodizar.</p>
          </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <div className="space-y-6">
            <div className="bg-slate-900/50 p-6 rounded-3xl shadow-xl border border-white/5 space-y-5">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <Target className="w-4 h-4 text-emerald-400" />
                <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400">Parâmetros do Ciclo</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="pro-label">Objetivo de Prova (Ex: Sub 4h)</label>
                  <input 
                    type="text" 
                    className="pro-input w-full p-3 text-sm italic" 
                    placeholder="Meta de tempo ou colocação..."
                    value={raceGoal || ''}
                    onChange={e => setRaceGoal(e.target.value)}
                  />
                </div>

                <div>
                  <label className="pro-label flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Descrição do Treinador
                  </label>
                  <textarea 
                    className="pro-input w-full p-3 text-xs resize-none" 
                    rows={4} 
                    placeholder="Ex: Limitar treinos de semana em 50 min. Focar em volume no domingo..."
                    value={goalDescription || ''}
                    onChange={e => setGoalDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="pro-label">Início da Prescrição</label>
                    <input type="date" className="pro-input w-full p-3 text-[10px] uppercase" value={startDate || ''} onChange={e => {
                      setStartDate(e.target.value);
                      if (fullPlan) {
                         const newPlan = safeDeepClone(fullPlan);
                         newPlan.startDate = e.target.value;
                         setFullPlan(newPlan);
                      }
                    }} />
                  </div>
                  <div className="relative">
                    <label className="pro-label">Data da Prova</label>
                    <input type="date" className="pro-input w-full p-3 text-[10px] uppercase border-emerald-500/30" value={raceDate || ''} onChange={e => setRaceDate(e.target.value)} />
                  </div>
                </div>

                <div className="relative">
                  <label className="pro-label">Duração (Semanas)</label>
                  <div className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm font-black text-white text-center flex items-center justify-center gap-2">
                    <CalendarDays className="w-4 h-4 text-emerald-400" /> {weeks}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="pro-label flex items-center gap-1"><Zap className="w-3 h-3 text-emerald-400" /> Corridas/Sem</label>
                    <select className="pro-input w-full p-3 text-sm appearance-none" value={runningDays} onChange={e => setRunningDays(Number(e.target.value))}>
                      {[1, 2, 3, 4, 5, 6, 7].map(d => <option key={d} value={d} className="bg-slate-900">{d} dias</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-[34px] w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <label className="pro-label flex items-center gap-1"><Dumbbell className="w-3 h-3 text-purple-400" /> Academia/Sem</label>
                    <select className="pro-input w-full p-3 text-sm appearance-none" value={gymDays} onChange={e => setGymDays(Number(e.target.value))}>
                      {[0, 1, 2, 3, 4, 5].map(d => <option key={d} value={d} className="bg-slate-900">{d} dias</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-[34px] w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="relative">
                  <label className="pro-label">Distância da Prova</label>
                  <select className="pro-input w-full p-3 text-sm appearance-none" value={raceDistance} onChange={e => setRaceDistance(e.target.value)}>
                    {distancias.map(dist => (
                      <option key={dist.value} value={dist.value} className="bg-slate-900">{dist.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-[34px] w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                <div>
                   <label className="pro-label">Dias Disponíveis para Treino</label>
                   <div className="flex flex-wrap gap-2 mt-2">
                      {["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map((day, idx) => (
                        <button
                          key={day}
                          onClick={() => {
                            if (trainingDays.includes(idx)) {
                               setTrainingDays(trainingDays.filter(d => d !== idx));
                            } else {
                               setTrainingDays([...trainingDays, idx]);
                            }
                          }}
                          className={`w-10 h-10 rounded-xl text-[10px] font-black uppercase italic transition-all border ${
                            trainingDays.includes(idx) 
                              ? 'bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                              : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                   </div>
                </div>

                <div className="grid grid-cols-1 gap-3 mt-4">
                  <button onClick={handleGenerate} disabled={loading || !raceDate} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black shadow-xl flex justify-center items-center gap-3 disabled:opacity-50 transition-all uppercase text-xs italic tracking-widest">
                    {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />} {loading ? 'GERANDO...' : 'Gerar com IA'}
                  </button>
                  <button onClick={handleManualCreate} disabled={loading} className="w-full bg-slate-800 hover:bg-black text-white py-4 rounded-2xl font-black shadow-xl flex justify-center items-center gap-3 disabled:opacity-50 transition-all uppercase text-xs italic tracking-widest">
                    <CalendarDays className="w-5 h-5" /> Criar Manualmente
                  </button>
                </div>
              </div>
            </div>
            
            {fullPlan?.raceStrategy && (
              <div className="bg-emerald-950 p-6 rounded-3xl shadow-xl text-white border border-emerald-800 animate-fade-in">
                 <div className="flex items-center gap-2 mb-4 border-b border-emerald-800 pb-2">
                   <Flag className="w-4 h-4 text-emerald-400" />
                   <h3 className="font-black text-[10px] uppercase tracking-widest text-emerald-400">Estratégia de Prova</h3>
                 </div>
                 <p className="text-[11px] leading-relaxed italic opacity-90">{fullPlan.raceStrategy}</p>
              </div>
            )}
          </div>

          <div className="xl:col-span-3 space-y-8">
            {fullPlan?.weeks && fullPlan.weeks.length > 0 ? (
              fullPlan.weeks.map((week, weekIndex) => (
                <div key={weekIndex} className={`bg-slate-900/50 rounded-3xl shadow-sm border-2 ${week.isVisible === false ? 'opacity-40 border-white/5' : 'border-white/10'} overflow-hidden transition-all`}>
                  <div className="bg-white/5 px-4 md:px-6 py-4 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1">
                        <span className="font-black text-emerald-400 text-[9px] md:text-[10px] uppercase tracking-widest border border-emerald-500/20 px-2 md:px-3 py-1 rounded-lg italic whitespace-nowrap">SEMANA {week.weekNumber}</span>
                        {isEditing && (
                          <div className="flex flex-col gap-0.5 ml-1">
                            <button onClick={() => handleMoveWeek(weekIndex, 'up')} disabled={weekIndex === 0} className="p-0.5 hover:bg-white/10 disabled:opacity-20 rounded transition-colors"><ChevronUp className="w-3 h-3 text-white" /></button>
                            <button onClick={() => handleMoveWeek(weekIndex, 'down')} disabled={weekIndex === fullPlan.weeks.length - 1} className="p-0.5 hover:bg-white/10 disabled:opacity-20 rounded transition-colors"><ChevronDown className="w-3 h-3 text-white" /></button>
                          </div>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <input 
                          type="text"
                          className="text-white text-[9px] md:text-[10px] font-black uppercase tracking-tighter italic bg-white/5 border border-white/10 rounded px-2 py-0.5 w-24 outline-none focus:ring-1 focus:ring-emerald-500"
                          value={week.phase}
                          onChange={(e) => updateWeekPhase(weekIndex, e.target.value)}
                        />
                      ) : (
                        <span className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-tighter italic">{week.phase}</span>
                      )}
                      
                      <span className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-tighter italic flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-emerald-400" /> {week.totalVolume || 0} KM
                      </span>
                      
                      {fullPlan.startDate && (
                        <span className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-tighter italic flex items-center gap-1.5 bg-white/5 border border-white/5 px-2.5 py-1 rounded-lg whitespace-nowrap">
                          📅 {formatWeekDateRange(fullPlan.startDate, weekIndex)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 scrollbar-hide">
                      <button 
                         onClick={() => {setTargetWeekForTemplate(weekIndex); setShowTemplatesModal(true);}}
                         className="flex-shrink-0 px-2 md:px-3 py-1.5 rounded-xl border border-white/10 text-[8px] md:text-[9px] font-black uppercase text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all italic flex items-center gap-1.5"
                         title="Aplicar Template"
                      >
                         <CalendarDays className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Aplicar</span>
                      </button>
                      <button 
                         onClick={() => handleSaveWeekAsTemplate(week)}
                         className="flex-shrink-0 px-2 md:px-3 py-1.5 rounded-xl border border-white/10 text-[8px] md:text-[9px] font-black uppercase text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all italic flex items-center gap-1.5"
                         title="Salvar Template"
                      >
                         <Save className="w-3.5 h-3.5" /> <span className="hidden xs:inline">Salvar</span>
                      </button>
                      <button onClick={() => {
                          const newPlan = safeDeepClone(fullPlan);
                          newPlan.weeks[weekIndex].isVisible = !newPlan.weeks[weekIndex].isVisible;
                          setFullPlan(newPlan);
                      }} className={`flex-shrink-0 px-2 md:px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 ${week.isVisible === true ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' : 'border-white/10 text-slate-400 bg-white/5'}`}>
                        {week.isVisible === true ? (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span className="text-[8px] md:text-[9px] font-black uppercase italic hidden xs:inline">Publicado</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span className="text-[8px] md:text-[9px] font-black uppercase italic hidden xs:inline">Oculto</span>
                          </>
                        )}
                      </button>
                      <button 
                         onClick={() => handleDeleteWeek(weekIndex)}
                         className="flex-shrink-0 p-1.5 rounded-xl border border-red-500/20 text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                         title="Excluir Semana"
                      >
                         <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="divide-y divide-white/5">
                    {week.workouts.map((workout, dayIndex) => (
                      <div key={dayIndex} className="p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center border-l-8 border-white/5 hover:bg-white/5 transition-colors">
                        <div className="w-full sm:w-40 flex flex-row sm:flex-col justify-between items-center sm:items-start gap-2">
                           <div className="flex items-center gap-2">
                             {isEditing && (
                               <div className="flex flex-col gap-0.5">
                                 <button onClick={() => handleMoveWorkout(weekIndex, dayIndex, 'up')} disabled={dayIndex === 0} className="p-0.5 hover:bg-white/10 disabled:opacity-20 rounded transition-colors"><ChevronUp className="w-3 h-3 text-white" /></button>
                                 <button onClick={() => handleMoveWorkout(weekIndex, dayIndex, 'down')} disabled={dayIndex === week.workouts.length - 1} className="p-0.5 hover:bg-white/10 disabled:opacity-20 rounded transition-colors"><ChevronDown className="w-3 h-3 text-white" /></button>
                               </div>
                             )}
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1.5 flex-wrap">
                               <span>{workout.day}</span>
                               {fullPlan?.startDate && (
                                 <span className="text-emerald-400 font-extrabold italic bg-emerald-500/10 border border-emerald-500/10 px-1.5 py-0.5 rounded text-[8px] tracking-tight whitespace-nowrap">
                                   {formatWorkoutDateShort(getWorkoutDate(fullPlan.startDate, weekIndex, dayIndex))}
                                 </span>
                                )}
                             </p>
                           </div>
                           {isEditing ? (
                              <div className="relative w-32 sm:w-full">
                                <select 
                                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg p-1 text-[9px] font-black uppercase italic outline-none appearance-none pr-6"
                                  value={workout.type}
                                  onChange={e => updateWorkout(weekIndex, dayIndex, 'type', e.target.value)}
                                >
                                  {["Regenerativo", "Longão", "Limiar", "Intervalado", "Velocidade", "Descanso", "Fortalecimento", "Natação", "Ciclismo", "Transição"].map(t => (
                                    <option key={t} value={t} className="bg-slate-900">{t}</option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                              </div>
                           ) : (
                              <p className={`text-[10px] font-black uppercase italic ${workout.type === 'Descanso' ? 'text-slate-500' : 'text-emerald-400'}`}>{workout.type}</p>
                           )}
                        </div>
                        <div className="flex-1 w-full relative group">
                           {isEditing ? (
                              <div className="flex flex-col gap-2">
                                <div className="relative">
                                  <textarea 
                                    className="w-full p-2 bg-white/5 border border-white/10 text-white rounded-xl text-sm font-bold italic outline-none focus:ring-2 focus:ring-emerald-500"
                                    value={workout.customDescription || ''}
                                    rows={2}
                                    onChange={e => updateWorkout(weekIndex, dayIndex, 'customDescription', e.target.value)}
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => {
                                      setTargetDay({ weekIndex, dayIndex });
                                      setShowLibraryModal(true);
                                    }}
                                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center gap-2"
                                    title="Importar da Biblioteca"
                                  >
                                    <BookOpen className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase italic tracking-tight">Biblioteca</span>
                                  </button>
                                  <button 
                                    onClick={() => setEditingExercises({ wIdx: weekIndex, dIdx: dayIndex })}
                                    className="px-3 py-1.5 bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-500/20 hover:bg-purple-700 transition-all flex items-center gap-2"
                                    title="Editar Exercícios do Torneio"
                                  >
                                    <ListOrdered className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase italic tracking-tight">Exercícios</span>
                                  </button>
                                  <button 
                                    onClick={() => handleResetWorkout(weekIndex, dayIndex)}
                                    className="px-2 py-1.5 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500/20 transition-all"
                                    title="Excluir Treino"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                           ) : (
                              <div className="space-y-1">
                                <p className={`text-sm font-bold italic ${workout.type === 'Descanso' ? 'text-slate-500' : 'text-slate-100'}`}>{workout.customDescription}</p>
                                {workout.completed && (
                                  <div className="flex flex-wrap gap-2 mt-2">
                                    {(workout.rpe || 0) > 0 && (
                                      <span className="text-[9px] font-black px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-md uppercase italic border border-amber-500/20">Percepção: {workout.rpe}/10</span>
                                    )}
                                    {workout.feedback && (
                                      <div className="w-full flex items-start gap-1.5 bg-white/5 p-2 rounded-xl border border-white/5">
                                        <MessageSquare className="w-3 h-3 text-slate-400 mt-0.5" />
                                        <p className="text-[10px] text-slate-400 font-medium italic leading-tight">{workout.feedback}</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                           )}
                        </div>
                        <div className="w-full sm:w-auto flex justify-end items-center border-t sm:border-none border-white/5 pt-2 sm:pt-0 mt-1 sm:mt-0">
                           {isEditing ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[8px] font-black text-slate-500 uppercase sm:hidden">KM:</span>
                                <input 
                                  type="number" 
                                  className="w-16 bg-white/5 border border-white/10 text-white rounded-lg p-1 text-center font-black text-sm outline-none focus:ring-1 focus:ring-emerald-500" 
                                  value={workout.distance === 0 || workout.distance === undefined ? '' : workout.distance} 
                                  onFocus={e => e.target.select()}
                                  onChange={e => updateWorkout(weekIndex, dayIndex, 'distance', Number(e.target.value))}
                                />
                              </div>
                           ) : (
                               workout.distance && workout.distance > 0 ? (
                                 <div className="flex flex-col items-end gap-1">
                                   <span className="font-black text-white text-xs whitespace-nowrap bg-white/5 px-3 py-1 rounded-full border border-white/5" title="Distância Planejada">{workout.distance} KM</span>
                                   {workout.completed && workout.actualDistance !== undefined && (
                                     <span className="text-[9px] font-black px-2 py-0.5 rounded-md uppercase italic whitespace-nowrap bg-emerald-500/15 text-emerald-400 border border-emerald-500/20" title="Distância Real Concluída">
                                       Real: {workout.actualDistance} KM
                                     </span>
                                   )}
                                 </div>
                                ) : <span className="text-[9px] font-black text-slate-600 uppercase italic">--</span>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white/5 p-20 rounded-[3rem] border-2 border-dashed border-white/10 flex flex-col items-center text-center">
                <CalendarDays className="w-16 h-16 text-white/10 mb-4" />
                <p className="text-slate-400 font-black uppercase italic tracking-widest text-sm">Insira os parâmetros e a Data da Prova para gerar o ciclo automático ou crie manualmente.</p>
              </div>
            )}

            {isEditing && fullPlan && (
              <button 
                onClick={addWeek}
                className="w-full py-6 border-4 border-dashed border-white/5 rounded-[2.5rem] text-slate-500 hover:text-emerald-500 hover:border-emerald-500/20 transition-all flex flex-col items-center gap-2 group mt-8"
              >
                <Plus className="w-8 h-8 group-hover:scale-110 transition-transform" />
                <span className="font-black uppercase italic tracking-widest text-xs">Adicionar Semana ao Ciclo</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE EXERCÍCIOS (MODO ELITE TORNEIO) */}
      <AnimatePresence>
        {editingExercises && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: 20 }}
               className="bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]"
             >
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/5">
                  <div className="flex items-center gap-4">
                    <div className="bg-purple-500/20 p-3 rounded-2xl border border-purple-500/20 text-purple-400">
                      <ListOrdered className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white uppercase italic tracking-tighter">Exercícios Detalhados</h3>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest italic">{fullPlan?.weeks[editingExercises.wIdx].workouts[editingExercises.dIdx].day} • Semana {fullPlan?.weeks[editingExercises.wIdx].weekNumber}</p>
                    </div>
                  </div>
                  <button onClick={() => setEditingExercises(null)} className="p-3 hover:bg-white/5 rounded-full transition-colors text-slate-400 hover:text-white">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                  {(fullPlan?.weeks[editingExercises.wIdx].workouts[editingExercises.dIdx].exercises || []).map((ex, idx) => (
                    <div key={ex.id} className="grid grid-cols-12 gap-3 bg-white/5 p-4 rounded-2xl border border-white/5 group relative">
                       <div className="col-span-12 md:col-span-1 flex items-center justify-center">
                          <span className="text-xs font-black text-slate-600">#{idx + 1}</span>
                       </div>
                       <div className="col-span-12 md:col-span-4">
                          <input 
                            placeholder="Exercício"
                            className="pro-input w-full text-xs"
                            value={ex.name}
                            onChange={(e) => updateWorkoutExercise(editingExercises.wIdx, editingExercises.dIdx, ex.id, 'name', e.target.value)}
                          />
                       </div>
                       <div className="col-span-4 md:col-span-2">
                          <input 
                            placeholder="Séries"
                            className="pro-input w-full text-[10px] text-center"
                            value={ex.sets}
                            onChange={(e) => updateWorkoutExercise(editingExercises.wIdx, editingExercises.dIdx, ex.id, 'sets', e.target.value)}
                          />
                       </div>
                       <div className="col-span-4 md:col-span-2">
                          <input 
                            placeholder="Reps"
                            className="pro-input w-full text-[10px] text-center"
                            value={ex.reps}
                            onChange={(e) => updateWorkoutExercise(editingExercises.wIdx, editingExercises.dIdx, ex.id, 'reps', e.target.value)}
                          />
                       </div>
                       <div className="col-span-4 md:col-span-2">
                          <input 
                            placeholder="Carga"
                            className="pro-input w-full text-[10px] text-center"
                            value={ex.load}
                            onChange={(e) => updateWorkoutExercise(editingExercises.wIdx, editingExercises.dIdx, ex.id, 'load', e.target.value)}
                          />
                       </div>
                       <div className="absolute -right-2 -top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => removeWorkoutExercise(editingExercises.wIdx, editingExercises.dIdx, ex.id)}
                            className="bg-red-500 text-white p-1.5 rounded-lg shadow-lg hover:bg-red-600 transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                       </div>
                    </div>
                  ))}

                  <button 
                    onClick={() => addWorkoutExercise(editingExercises.wIdx, editingExercises.dIdx)}
                    className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-slate-500 hover:text-emerald-500 hover:border-emerald-500/20 transition-all flex items-center justify-center gap-2 group"
                  >
                    <Plus className="w-4 h-4 group-hover:scale-110" />
                    <span className="text-[10px] font-black uppercase italic tracking-widest">Adicionar Exercício Técnica</span>
                  </button>
                </div>

                <div className="p-8 border-t border-white/5 flex justify-end">
                  <button 
                    onClick={() => setEditingExercises(null)}
                    className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase italic tracking-widest shadow-xl hover:bg-emerald-700 transition-all"
                  >
                    OK, CONCLUÍDO
                  </button>
                </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Periodization;

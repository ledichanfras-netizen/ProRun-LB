
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { calculatePaces } from '../utils/calculations';
import { exportToImage } from '../utils/exporter';
import { getAppNow } from '../utils/time';
import { 
  AlertCircle, 
  CheckCircle, 
  Circle, 
  Trophy, 
  X, 
  Activity,
  Image as ImageIcon,
  MessageSquare,
  Loader2,
  Check,
  TrendingUp,
  Sparkles,
  Zap,
  Flag,
  Play,
  PlayCircle,
  Dumbbell
} from 'lucide-react';
import { WorkoutType, UserAchievement, Exercise } from '../types';
import { PrintLayout } from '../components/PrintLayout';
import { AIPerformanceHub } from '../components/AIPerformanceHub';
import { motion, AnimatePresence } from 'motion/react';
import { getProgressToNextLevel } from '../services/gamificationService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  ResponsiveContainer,
  LabelList 
} from 'recharts';

const TimerComponent: React.FC = () => {
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    let interval: any = null;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, seconds]);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-3 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
      <span className="text-sm font-black text-emerald-700 font-mono tracking-tighter">{formatTime(seconds)}</span>
      <button 
        onClick={() => setIsActive(!isActive)}
        className={`w-6 h-6 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-amber-100 text-amber-600' : 'bg-emerald-600 text-white'}`}
      >
        {isActive ? <span className="text-[8px] font-black">PAUSA</span> : <Play className="w-3 h-3 fill-current" />}
      </button>
      {seconds > 0 && (
        <button onClick={() => {setSeconds(0); setIsActive(false);}} className="text-[8px] font-black text-slate-400 uppercase">Reset</button>
      )}
    </div>
  );
};

const AthletePortal: React.FC = () => {
  const { athletes, selectedAthleteId, athletePlans, updateWorkoutStatus, addNotification, updateAthleteReadiness } = useApp();
  const navigate = useNavigate();
  const activeAthlete = athletes.find(a => a.id === selectedAthleteId);
  
  const portalRoot = document.getElementById('printable-portal');
  
  const [selectedWorkout, setSelectedWorkout] = useState<{
    weekIndex: number;
    dayIndex: number;
    data: any;
  } | null>(null);

  const [feedbackText, setFeedbackText] = useState('');
  const [rpeValue, setRpeValue] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', type: 'distance' as const, targetValue: 5, deadline: getAppNow().toISOString().split('T')[0] });
  const [selectedAchievement, setSelectedAchievement] = useState<UserAchievement | null>(null);
  const [localExercises, setLocalExercises] = useState<Exercise[]>([]);
  const [selectedDayPerWeek, setSelectedDayPerWeek] = useState<Record<number, number>>({});
  const { addUserGoal } = useApp();

  const handleAddGoal = async () => {
    if (!activeAthlete || !newGoal.title || !newGoal.targetValue) return;
    await addUserGoal(activeAthlete.id, newGoal);
    setShowGoalModal(false);
    setNewGoal({ title: '', type: 'distance' as const, targetValue: 5, deadline: getAppNow().toISOString().split('T')[0] });
    addNotification({
      title: 'Meta Definida!',
      message: `Você definiu um novo desafio: ${newGoal.title}. Boa sorte!`,
      type: 'info',
      category: 'plan',
      link: '/athlete-portal'
    } as any);
  };

  if (!activeAthlete) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 animate-fade-in">
        <AlertCircle className="w-16 h-16 text-slate-200 mb-4" />
        <h2 className="text-xl font-black text-slate-700 uppercase italic tracking-tighter">Acesso Restrito</h2>
        <p className="max-w-md text-center mt-2 font-medium">Nenhum perfil carregado. Por favor, faça login.</p>
      </div>
    );
  }

  const athletePlan = athletePlans[activeAthlete.id];
  const allWeeks = athletePlan?.weeks || [];
  const visibleWeeks = allWeeks
    .filter(w => w.isVisible === true)
    .sort((a, b) => a.weekNumber - b.weekNumber);
  const paces = activeAthlete.customZones || calculatePaces(activeAthlete.metrics.vdot, activeAthlete.metrics.fcThreshold, activeAthlete.metrics.fcMax);

  if (visibleWeeks.length === 0) {
    return (
      <div className="max-w-md mx-auto space-y-8 pb-24 animate-fade-in flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        <div className="bg-emerald-500/10 p-8 rounded-[3rem] border border-emerald-500/20 mb-6">
          <Sparkles className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter">Preparando sua Evolução</h2>
          <p className="text-slate-500 text-sm font-medium italic mt-2">
            Seu treinador está finalizando sua periodização personalizada. Assim que as planilhas forem publicadas, elas aparecerão aqui em tempo real.
          </p>
        </div>
        <div className="space-y-4 w-full">
           <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-950 rounded-xl flex items-center justify-center text-xl">⚡</div>
              <div className="text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dica de Performance</p>
                <p className="text-xs font-bold text-slate-700 italic">Mantenha seu VDOT atualizado nas avaliações.</p>
              </div>
           </div>
           <button onClick={() => navigate('/')} className="w-full bg-emerald-950 text-white py-4 rounded-2xl font-black text-xs uppercase italic tracking-widest">VOLTAR AO PAINEL</button>
        </div>
      </div>
    );
  }

  const isFinalWorkout = useMemo(() => {
    if (!selectedWorkout || !allWeeks.length) return false;
    return selectedWorkout.weekIndex === (allWeeks.length - 1) && 
           (selectedWorkout.data.type === 'Longão' || selectedWorkout.data.customDescription?.toLowerCase().includes('prova'));
  }, [selectedWorkout, allWeeks]);

  const getRPEColor = (val: number) => {
    if (val === 0) return 'text-slate-300';
    if (val <= 3) return 'text-emerald-500';
    if (val <= 6) return 'text-blue-500';
    if (val <= 8) return 'text-orange-500';
    return 'text-red-600';
  };

  const getRPELabel = (val: number) => {
    const labels = ["Não avaliado", "Muito Leve", "Leve", "Leve/Moderado", "Moderado", "Moderado/Forte", "Muito Forte", "Exaustivo", "Quase Máximo", "Máximo", "Exaustão Total"];
    return labels[val] || "Selecione";
  };

  const { todayWorkout, tomorrowWorkout, currentWeek } = useMemo(() => {
    if (!visibleWeeks.length) return { todayWorkout: null, tomorrowWorkout: null, currentWeek: null };
    
    const today = getAppNow();
    const dayOfWeek = today.getDay(); // 0 is Sunday
    const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const tomorrowIndex = (todayIndex + 1) % 7;
    
    // 1. Tentar encontrar a semana por data (startDate)
    let activeWeek: any = null;
    const plan = athletePlans[activeAthlete.id];

    if (plan?.startDate) {
      // Forçar interpretação como local
      const start = new Date(plan.startDate + 'T00:00:00');
      // Ajustar para o início daquela semana (segunda-feira)
      const startDay = start.getDay() === 0 ? 6 : start.getDay() - 1;
      const firstMonday = new Date(start);
      firstMonday.setDate(start.getDate() - startDay);
      firstMonday.setHours(0, 0, 0, 0);
      
      const todayCopy = new Date(today);
      todayCopy.setHours(0, 0, 0, 0);

      const diffMs = todayCopy.getTime() - firstMonday.getTime();
      const weekIdx = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
      
      if (weekIdx >= 0 && weekIdx < allWeeks.length) {
        activeWeek = allWeeks[weekIdx];
      }
    }

    // 2. Heurística de progresso: Se não achou por data ou semana não está visível, 
    // pega a primeira semana visível que tenha treinos não concluídos
    if (!activeWeek || !activeWeek.isVisible) {
      const firstIncompleteWeek = visibleWeeks.find(w => 
        w.workouts.some(wo => !wo.completed && wo.type !== 'Descanso')
      );
      
      if (firstIncompleteWeek) {
        const firstIncompleteIdx = visibleWeeks.indexOf(firstIncompleteWeek);
        // Se a semana incompleta não for a primeira visível, e a semana anterior estiver 100% concluída,
        // mas hoje NÃO for segunda-feira (ou seja, ainda estamos na semana que acabou de ser concluída, como no domingo),
        // devemos manter a semana anterior ativa para que o treino de hoje continue mostrando o treino concluído.
        if (firstIncompleteIdx > 0 && todayIndex !== 0) {
          const prevWeek = visibleWeeks[firstIncompleteIdx - 1];
          const prevFinished = prevWeek.workouts.every(wo => wo.completed || wo.type === 'Descanso');
          const currentHasNoProgress = !firstIncompleteWeek.workouts.some(wo => wo.completed);
          
          if (prevFinished && currentHasNoProgress) {
            activeWeek = prevWeek;
          } else {
            activeWeek = firstIncompleteWeek;
          }
        } else {
          activeWeek = firstIncompleteWeek;
        }
      } else {
        // Fallback para a última visível se tudo estiver pronto
        activeWeek = visibleWeeks[visibleWeeks.length - 1];
      }
    }
    
    if (!activeWeek || !activeWeek.workouts) return { todayWorkout: null, tomorrowWorkout: null, currentWeek: activeWeek };
    
    const todayW = activeWeek.workouts[todayIndex];
    
    // Lógica para o treino de amanhã: pode ser na mesma semana ou na próxima
    let tomorrowW = activeWeek.workouts[tomorrowIndex];
    let tomorrowWeekIdx = allWeeks.indexOf(activeWeek);

    // Se hoje for domingo, amanhã é segunda da próxima semana
    if (todayIndex === 6) {
      const nextWeek = allWeeks[tomorrowWeekIdx + 1];
      if (nextWeek && nextWeek.workouts) {
        tomorrowW = nextWeek.workouts[0];
        tomorrowWeekIdx = tomorrowWeekIdx + 1;
      }
    }
    
    return { 
      todayWorkout: todayW ? { workout: todayW, weekIndex: allWeeks.indexOf(activeWeek), dayIndex: todayIndex, isDescanso: todayW.type === 'Descanso' } : null,
      tomorrowWorkout: tomorrowW ? { workout: tomorrowW, weekIndex: tomorrowWeekIdx, dayIndex: tomorrowIndex, isDescanso: tomorrowW.type === 'Descanso' } : null,
      currentWeek: activeWeek
    };
  }, [visibleWeeks, allWeeks, athletePlans, activeAthlete.id]);

  const weeklyProgress = useMemo(() => {
    if (!currentWeek) return { completed: 0, total: 0 };
    const total = currentWeek.workouts.filter((w: any) => w.type !== 'Descanso').length;
    const completed = currentWeek.workouts.filter((w: any) => w.completed && w.type !== 'Descanso').length;
    return { completed, total };
  }, [currentWeek]);

  // Lógica de notificação automática de treino perdido
  useEffect(() => {
    if (!activeAthlete || !visibleWeeks.length) return;
    
    const checkMissedTraining = async () => {
      const today = getAppNow();
      const dayOfWeek = today.getDay(); 
      const todayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      
      // Se hoje não for segunda-feira, verificamos o dia de ontem
      if (todayIndex > 0) {
        const yesterdayIndex = todayIndex - 1;
        const activeW = currentWeek;
        const yesterdayWorkout = activeW?.workouts[yesterdayIndex];
        
        // Se o treino de ontem era planejado, não era descanso e não foi concluído
        if (yesterdayWorkout && yesterdayWorkout.type !== 'Descanso' && !yesterdayWorkout.completed) {
          const lastNotifKey = `notif_missed_${activeAthlete.id}_${yesterdayIndex}_${getAppNow().toDateString()}`;
          const alreadyNotified = localStorage.getItem(lastNotifKey);
          
          if (!alreadyNotified) {
            addNotification({
              title: 'Treino Não Realizado!',
              message: `${activeAthlete.name} não concluiu o treino de ontem (${yesterdayWorkout.type}). Verifique se está tudo bem!`,
              type: 'warning',
              category: 'workout',
              link: '/dashboard'
            });
            localStorage.setItem(lastNotifKey, 'true');
          }
        }
      }
    };

    checkMissedTraining();
  }, [activeAthlete, visibleWeeks, addNotification]);

  const readinessLevels = [
    { id: 'ready', label: 'Pronto', color: 'text-emerald-500', icon: '⚡' },
    { id: 'fatigued', label: 'Fadigado', color: 'text-amber-500', icon: '😴' },
    { id: 'recovering', label: 'Recuperação', color: 'text-blue-500', icon: '🧘' }
  ];

  const handleToggleComplete = async () => {
    if (!selectedWorkout || !activeAthlete || isSaving) return;

    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      const newStatus = !selectedWorkout.data.completed;
      
      await updateWorkoutStatus(
        activeAthlete.id, 
        selectedWorkout.weekIndex, 
        selectedWorkout.dayIndex, 
        newStatus, 
        feedbackText,
        rpeValue,
        localExercises
      );

      // Gatilho de Notificação para Esforço Alto (PSE >= 8)
      if (newStatus && rpeValue >= 8) {
        addNotification({
          title: 'Alerta de Esforço Alto!',
          message: `${activeAthlete.name} registrou PSE ${rpeValue} no treino "${selectedWorkout.data.type || 'Corrida'}". Verifique a fadiga!`,
          type: 'critical',
          link: '/dashboard',
          category: 'workout'
        });
      }
      
      setSaveSuccess(true);
      
      setTimeout(() => {
        setSelectedWorkout(null); 
        setIsSaving(false);
        setSaveSuccess(false);
        setFeedbackText('');
        setRpeValue(0);
      }, 800);

    } catch (err: any) {
      console.error("Erro ao salvar:", err?.message || "Erro desconhecido");
      alert("Erro ao sincronizar. Verifique sua conexão.");
      setIsSaving(false);
    }
  };

  const openWorkoutModal = (wIdx: number, dIdx: number, workout: any) => {
    setSelectedWorkout({ weekIndex: wIdx, dayIndex: dIdx, data: workout });
    setFeedbackText(workout.feedback || '');
    setRpeValue(workout.rpe || 0);
    setLocalExercises(workout.exercises || []);
    setSaveSuccess(false);
    setIsSaving(false);
  };

  const updateLocalExercise = (id: string, field: keyof Exercise, value: string) => {
    setLocalExercises(prev => prev.map(ex => 
      ex.id === id ? { ...ex, [field]: value } : ex
    ));
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-24 animate-fade-in no-print">
      {/* Header com Status Físico */}
      <div className="flex flex-col gap-4 px-2">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">
              {getAppNow().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">
              Olá, <span className="text-emerald-500">{activeAthlete.name.split(' ')[0]}</span>!
            </h1>
          </div>
          <div className="flex gap-2">
            {readinessLevels.map(level => (
              <button 
                key={level.id}
                onClick={() => updateAthleteReadiness(activeAthlete.id, level.id as any)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all shadow-sm border-2 ${
                  activeAthlete.readiness === level.id 
                    ? 'bg-white border-emerald-500 scale-105 shadow-emerald-500/10' 
                    : 'bg-slate-50 border-transparent opacity-40 hover:opacity-100'
                }`}
                title={level.label}
              >
                {level.icon}
              </button>
            ))}
          </div>
        </div>
        
        {/* Gamification Dashboard */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-3">
               <div>
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Nível {activeAthlete.gamification?.level || 1}</p>
                 <h4 className="text-lg font-black text-slate-800 italic uppercase tracking-tighter">{activeAthlete.gamification?.xp || 0} XP</h4>
               </div>
               <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600">
                 <Trophy className="w-4 h-4" />
               </div>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${getProgressToNextLevel(activeAthlete.gamification?.xp || 0)}%` }}
                className="h-full bg-emerald-500 rounded-full"
              />
            </div>
          </div>

          <div className="bg-emerald-950 rounded-3xl p-4 shadow-lg flex flex-col justify-between overflow-hidden relative">
            <div className="absolute top-0 right-0 p-2 opacity-10">
              <Zap className="w-12 h-12 text-white" />
            </div>
            <div className="relative z-10">
              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">Sua Labareda</p>
              <h4 className="text-xl font-black text-white italic uppercase tracking-tighter flex items-center gap-2">
                {activeAthlete.gamification?.streak || 0} Dias <Zap className="w-4 h-4 fill-orange-500 text-orange-500" />
              </h4>
              <p className="text-[8px] font-bold text-emerald-300 uppercase italic mt-1 leading-tight">
                {activeAthlete.gamification?.streak === 0 ? 'Comece sua sequência hoje!' : 'Fogo no treino! Mantenha o ritmo.'}
              </p>
            </div>
          </div>
        </div>

        {/* Descrição da Prontidão */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3">
          <p className="text-[10px] font-bold text-slate-500 leading-relaxed italic">
            <span className="text-emerald-600 font-black uppercase">Prontidão:</span> Como você se sente hoje? Selecione um ícone para indicar se está <span className="text-emerald-600">Pronto (⚡)</span>, <span className="text-amber-600">Fadigado (😴)</span> ou em <span className="text-blue-600">Recuperação (🧘)</span>. Isso ajuda o treinador a ajustar sua carga!
          </p>
        </div>
      </div>

      {/* Card Destaque: Treino de Hoje */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-emerald-700 rounded-[2.5rem] blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
        <div className="relative bg-emerald-950 rounded-[2.2rem] p-8 text-white shadow-2xl overflow-hidden border border-emerald-900">
          <div className="absolute top-0 right-0 p-4 opacity-5">
             <Trophy className="w-32 h-32 rotate-12" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="px-3 py-1 bg-emerald-500 text-emerald-950 text-[9px] font-black uppercase rounded-lg italic tracking-tighter">
                {todayWorkout?.workout.type.toUpperCase().includes('PROVA') ? 'Dia de Prova' : (todayWorkout?.isDescanso ? 'Recuperação' : 'Treino de Hoje')}
              </div>
              {todayWorkout?.workout.completed && (
                <div className="flex items-center gap-1 text-emerald-400 font-black text-[9px] uppercase italic">
                  <CheckCircle className="w-3 h-3" /> Concluído
                </div>
              )}
            </div>

            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2 leading-tight">
              {todayWorkout ? todayWorkout.workout.type : 'Dia de Descanso'}
            </h2>
            
            <p className="text-emerald-300/80 text-sm font-medium mb-8 leading-relaxed line-clamp-2">
              {todayWorkout?.workout.type.toUpperCase().includes('PROVA') 
                ? 'Hoje é o grande dia! Coloque em prática tudo o que treinou. Boa prova!' 
                : (todayWorkout ? todayWorkout.workout.customDescription : 'Aproveite para recuperar as energias e focar na mobilidade.')}
            </p>

            {todayWorkout && todayWorkout.workout.type !== 'Descanso' && (
              <button 
                onClick={() => openWorkoutModal(todayWorkout.weekIndex, todayWorkout.dayIndex, todayWorkout.workout)}
                className="w-full bg-white text-emerald-950 font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-black/20 hover:bg-emerald-50 transition-all active:scale-[0.98] uppercase italic tracking-tighter"
              >
                {todayWorkout.workout.completed ? <Check className="w-5 h-5" /> : <Zap className="w-5 h-5 fill-emerald-500 text-emerald-500" />} 
                {todayWorkout.workout.completed ? 'Ver Detalhes' : 'Iniciar Treino'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Próximo Treino (Menos Ênfase) */}
      {tomorrowWorkout && (
        <div className="mx-2 p-4 bg-slate-50 border border-slate-200 rounded-3xl flex items-center justify-between group hover:bg-white transition-colors cursor-pointer"
             onClick={() => openWorkoutModal(tomorrowWorkout.weekIndex, tomorrowWorkout.dayIndex, tomorrowWorkout.workout)}>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm ${tomorrowWorkout.isDescanso ? 'bg-blue-50 text-blue-500' : 'bg-emerald-100 text-emerald-600'}`}>
              {tomorrowWorkout.isDescanso ? '🧘' : '👟'}
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
                Amanhã {tomorrowWorkout.weekIndex !== todayWorkout?.weekIndex ? `• Semana ${allWeeks[tomorrowWorkout.weekIndex]?.weekNumber}` : ''}
              </p>
              <h4 className="text-sm font-black text-slate-700 uppercase italic tracking-tighter">{tomorrowWorkout.workout.type}</h4>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 italic">Ver detalhes</span>
            <PlayCircle className="w-5 h-5 text-slate-200 group-hover:text-emerald-500 transition-colors" />
          </div>
        </div>
      )}

      {/* Metas Ativas */}
      <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-black text-slate-800 text-xs uppercase italic tracking-tighter flex items-center gap-2">
            <Flag className="w-4 h-4 text-emerald-500" /> Suas Metas
          </h3>
          <button 
            onClick={() => setShowGoalModal(true)}
            className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors uppercase italic"
          >
            + Nova Meta
          </button>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
          {(!activeAthlete.gamification?.goals || activeAthlete.gamification.goals.filter(g => !g.completed).length === 0) ? (
            <div className="flex-shrink-0 w-full p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center">
              <p className="text-[10px] font-bold text-slate-400 italic">Nenhuma meta ativa. Defina novos desafios!</p>
            </div>
          ) : (
            activeAthlete.gamification.goals.filter(g => !g.completed).map(goal => (
              <div key={goal.id} className="flex-shrink-0 w-48 p-4 bg-slate-50 rounded-2xl border border-slate-100 relative">
                <p className="text-[8px] font-black text-slate-400 uppercase italic mb-1">{goal.type}</p>
                <h4 className="text-xs font-black text-slate-800 italic uppercase mb-2 line-clamp-1">{goal.title}</h4>
                <div className="flex justify-between items-end mb-1">
                  <span className="text-[9px] font-black text-emerald-600 italic">{goal.currentValue} / {goal.targetValue}</span>
                  <span className="text-[7px] font-bold text-slate-400 italic">PV: {new Date(goal.deadline).toLocaleDateString()}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${Math.min(100, (goal.currentValue / goal.targetValue) * 100)}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Conquistas Recentes */}
      {activeAthlete.gamification?.achievements && activeAthlete.gamification.achievements.length > 0 && (
        <div className="bg-slate-900/50 rounded-[2rem] p-6 border border-white/5 shadow-xl backdrop-blur-sm">
          <h3 className="font-black text-white text-xs uppercase italic tracking-tighter flex items-center gap-2 mb-4">
            <Trophy className="w-4 h-4 text-emerald-400" /> Conquistas Recentes
          </h3>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {activeAthlete.gamification.achievements.slice(-5).reverse().map(achievement => (
              <button 
                key={achievement.id} 
                onClick={() => setSelectedAchievement(achievement)}
                className="flex-shrink-0 flex flex-col items-center gap-1 group transition-all"
              >
                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-2xl shadow-sm group-hover:scale-110 group-hover:bg-emerald-500/20 border border-white/5 transition-all">
                  {achievement.icon}
                </div>
                <span className="text-[8px] font-black text-slate-300 italic text-center w-14 leading-tight truncate">{achievement.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resumo Semanal Mini */}
      <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-black text-slate-800 text-xs uppercase italic tracking-tighter flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" /> Constância Semana {currentWeek?.weekNumber || ''}
            </h3>
            {currentWeek?.weekNumber === 8 && (
              <p className="text-[8px] font-bold text-emerald-600 uppercase italic mt-1 bg-emerald-50 px-2 py-0.5 rounded-full w-fit">
                Semana da Prova
              </p>
            )}
          </div>
          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase italic border border-emerald-100">
            {weeklyProgress.completed}/{weeklyProgress.total} Concluídos
          </span>
        </div>
        
        <div className="flex justify-between gap-2">
          {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, i) => {
            const today = getAppNow();
            const currentDayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;
            const isToday = i === currentDayIndex;
            
            return (
              <div key={i} className="flex flex-col items-center gap-3 flex-1">
                <div className={`w-full aspect-square rounded-xl flex items-center justify-center text-[10px] transition-all border-2 ${
                  isToday
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-600 font-black scale-105' 
                    : 'border-slate-50 bg-slate-50 text-slate-400 font-bold'
                }`}>
                  {day}
                </div>
                <div className={`w-2 h-2 rounded-full transition-all duration-500 ${
                  currentWeek?.workouts[i]?.completed ? 'bg-emerald-500 scale-110 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-200'
                }`} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Navegação de Semanas Moderna */}
      <div className="pt-4 px-2">
        <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] mb-6 italic">Cronograma Completo</h3>
        <div className="space-y-6">
          {visibleWeeks.slice().reverse().map((week, wIdx) => {
             const originalWeekIndex = allWeeks.findIndex(p => p.weekNumber === week.weekNumber);
             const isCurrentWeek = currentWeek?.weekNumber === week.weekNumber;
             return (
               <div key={wIdx} className={`rounded-[2rem] p-6 border transition-all ${isCurrentWeek ? 'bg-white border-emerald-500 shadow-lg shadow-emerald-500/5 ring-4 ring-emerald-500/5' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase italic ${isCurrentWeek ? 'text-emerald-600' : 'text-slate-500'}`}>Semana {week.weekNumber}</span>
                      {isCurrentWeek && <span className="bg-emerald-500 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase italic">Atual</span>}
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 bg-white px-2 py-0.5 rounded-lg border border-slate-100 italic">{week.totalVolume} KM</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 md:gap-2 mb-4">
                    {week.workouts.map((workout, dIdx) => (
                      <button 
                        key={dIdx}
                        onClick={() => {
                          setSelectedDayPerWeek(prev => ({ ...prev, [week.weekNumber]: dIdx }));
                          openWorkoutModal(originalWeekIndex, dIdx, workout);
                        }}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center transition-all border-2 ${
                          workout.completed 
                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                            : workout.type === 'Descanso' ? 'bg-slate-100 border-slate-100 text-slate-300' : 'bg-white border-slate-100 text-slate-300 hover:border-emerald-200'
                        }`}
                      >
                         <span className="text-[7px] font-black uppercase mb-0.5 opacity-60">
                           {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'][dIdx]}
                         </span>
                         {workout.completed ? <Check className="w-3 h-3" /> : <div className="w-1 h-1 rounded-full bg-current opacity-20" />}
                      </button>
                    ))}
                  </div>

                  {/* NOVO: Detalhe interativo do Dia Selecionado / Quilometragem & Descrição */}
                  {(() => {
                    const selDayIdx = selectedDayPerWeek[week.weekNumber] !== undefined ? selectedDayPerWeek[week.weekNumber] : 0;
                    const wk = week.workouts[selDayIdx];
                    if (!wk) return null;
                    const weekdaysFull = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'];
                    return (
                      <div className="mb-4 p-4 bg-white rounded-2xl border border-slate-100/80 space-y-2 shadow-sm animate-fade-in">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black uppercase text-slate-400">{weekdaysFull[selDayIdx]}</span>
                          {wk.type !== 'Descanso' && (
                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100/50 italic">
                              📏 {wk.distance || '--'} KM
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-black text-slate-700 uppercase italic tracking-tighter">{wk.type}</h4>
                        <p className="text-slate-500 text-[10px] font-medium leading-relaxed italic">
                          {wk.type === 'Descanso' 
                            ? 'Dia reservado para repouso absoluto, focado em recuperação muscular, mobilidade e hidratação.' 
                            : (wk.customDescription || 'Nenhuma descrição informada.')}
                        </p>
                      </div>
                    );
                  })()}

                  <p className="text-[9px] font-bold text-slate-400 italic px-1">
                    Foco: <span className="text-emerald-600 uppercase font-black">{week.phase}</span>
                  </p>
               </div>
             );
          })}
        </div>
      </div>

      {/* Seção de Evolução */}
      <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
        <h3 className="font-black text-slate-800 text-sm uppercase italic tracking-tighter mb-8 flex items-center gap-2">
          <TrendingUp className="text-emerald-500 w-5 h-5" /> Sua Evolução Semanal
        </h3>
        
        <div className="min-h-[260px] w-full" style={{ height: 260, width: '100%', minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart 
              data={visibleWeeks.slice().sort((a, b) => a.weekNumber - b.weekNumber).map(w => ({ 
                name: `S${w.weekNumber}`, 
                km: w.totalVolume,
                load: Math.round(w.totalVolume * 10) 
              }))}
              margin={{ top: 30, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#475569', fontSize: 10, fontWeight: 900 }} 
              />
              <YAxis hide />
              <Tooltip 
                cursor={{ fill: '#f1f5f9', radius: 8 }}
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
                formatter={(value: any) => [`${value} KM`, 'Volume']}
              />
              <Bar dataKey="km" fill="url(#barGradient)" radius={[8, 8, 0, 0]} barSize={28} >
                 <LabelList dataKey="km" position="top" style={{ fill: '#10b981', fontSize: '11px', fontWeight: '900' }} offset={15} />
                 <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <p className="text-[9px] text-slate-400 font-bold uppercase italic tracking-widest text-center mt-6">
          Volume total acumulado (KM) por semana
        </p>
      </div>

      {selectedWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md no-print" onClick={() => !isSaving && setSelectedWorkout(null)}>
          <div className="bg-slate-900 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up flex flex-col max-h-[95vh] border border-white/5" onClick={e => e.stopPropagation()}>
            <div className={`p-6 md:p-8 border-b flex justify-between items-start flex-shrink-0 ${isFinalWorkout ? 'bg-emerald-950 text-white' : 'bg-white/5'}`}>
               <div className="flex flex-col">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 italic ${isFinalWorkout ? 'text-emerald-400' : 'text-slate-400'}`}>{selectedWorkout.data.day}</span>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter text-white">{isFinalWorkout ? '🏁 PROVA ALVO' : (selectedWorkout.data.type || 'Treino')}</h3>
                  </div>
               </div>
               <button disabled={isSaving} onClick={() => setSelectedWorkout(null)} className={`p-3 rounded-full transition-colors ${isFinalWorkout ? 'bg-white/10 hover:bg-white/20' : 'bg-white/5 hover:bg-white/10'}`}><X className="w-5 h-5 text-white" /></button>
            </div>
            
            <div className="p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 bg-slate-900">
              <div className="space-y-4">
                <div className={`${isFinalWorkout ? 'bg-emerald-950 border-emerald-900 text-white shadow-[0_0_30px_rgba(16,185,129,0.1)]' : 'bg-white/5 border-white/10 text-white'} p-6 rounded-3xl border text-center italic font-bold shadow-sm leading-relaxed text-sm`}>
                  "{selectedWorkout.data.customDescription}"
                </div>

                {((selectedWorkout.data.distance && selectedWorkout.data.distance > 0) || 
                  (selectedWorkout.data.distanceKm && selectedWorkout.data.distanceKm > 0) || 
                  (selectedWorkout.data.durationMinutes && selectedWorkout.data.durationMinutes > 0)) && (
                  <div className="flex justify-center gap-3">
                    {((selectedWorkout.data.distance && selectedWorkout.data.distance > 0) || (selectedWorkout.data.distanceKm && selectedWorkout.data.distanceKm > 0)) && (
                      <span className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 text-xs font-black uppercase px-4 py-2 rounded-2xl border border-emerald-500/25 italic tracking-wider">
                        📏 {selectedWorkout.data.distance || selectedWorkout.data.distanceKm} KM
                      </span>
                    )}
                    {(selectedWorkout.data.durationMinutes && selectedWorkout.data.durationMinutes > 0) && (
                      <span className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-400 text-xs font-black uppercase px-4 py-2 rounded-2xl border border-blue-500/25 italic tracking-wider">
                        ⏱️ {selectedWorkout.data.durationMinutes} Minutos
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Se for Descanso, não mostramos PSE nem Cronômetro */}
              {selectedWorkout.data.type === 'Descanso' ? (
                <div className="bg-blue-500/10 p-8 rounded-[2rem] border border-blue-500/20 text-center space-y-4">
                  <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto text-3xl">
                    🧘
                  </div>
                  <h4 className="text-xl font-black text-white italic uppercase tracking-tighter">Recuperação Necessária</h4>
                  <p className="text-slate-400 text-sm font-medium italic">
                    O descanso é parte fundamental do seu treino. Aproveite para focar na mobilidade, sono de qualidade e hidratação.
                  </p>
                </div>
              ) : (
                <>
                  {/* Hub de Ritmos do Atleta */}
                  <div className="space-y-4">
                    <label className="pro-label flex items-center gap-2 px-1">
                      <Flag className="w-3.5 h-3.5 text-emerald-400" /> Seus Ritmos Alvo
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {paces.map((p, idx) => (
                        <div key={idx} className="bg-white/5 p-3 rounded-2xl border border-white/5 shadow-sm flex flex-col justify-center">
                          <span className="text-[8px] font-black text-slate-500 uppercase tracking-wider mb-0.5">{p.zone}</span>
                          <span className="text-sm font-black text-emerald-400 italic tracking-tighter">{p.minPace} min/km</span>
                          {p.heartRateRange && (
                            <span className="text-[7px] font-bold text-slate-600 uppercase">{p.heartRateRange} bpm</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detalhamento de Exercícios (Elite Torneio Mode) */}
                  {localExercises.length > 0 && (
                    <div className="space-y-4">
                      <label className="pro-label flex items-center gap-2 px-1">
                        <Dumbbell className="w-3.5 h-3.5 text-purple-400" /> Detalhamento Técnico
                      </label>
                      <div className="space-y-3">
                        {localExercises.sort((a, b) => a.order - b.order).map((ex) => (
                          <div key={ex.id} className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                            <div className="flex justify-between items-center">
                              <h4 className="text-xs font-black text-white uppercase italic">{ex.name}</h4>
                              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{ex.sets} séries</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">Repetições</label>
                                <input 
                                  className="pro-input w-full py-2 text-xs text-center"
                                  value={ex.reps}
                                  onChange={e => updateLocalExercise(ex.id, 'reps', e.target.value)}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest px-1">Carga Utilizada</label>
                                <input 
                                  className="pro-input w-full py-2 text-xs text-center border-purple-500/30 focus:border-purple-500"
                                  value={ex.load}
                                  onChange={e => updateLocalExercise(ex.id, 'load', e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-[9px] text-slate-500 italic px-1 font-medium">As cargas e repetições sugeridas pelo Coach foram pré-preenchidas. Ajuste conforme sua execução real.</p>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <label className="pro-label flex items-center gap-2">
                        <Zap className="w-4 h-4 text-amber-500" /> Esforço Percebido (PSE)
                      </label>
                      <span className={`text-[10px] font-black italic uppercase tracking-tighter ${getRPEColor(rpeValue)}`}>
                        {getRPELabel(rpeValue)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <button
                          key={num}
                          disabled={isSaving}
                          onClick={() => setRpeValue(num)}
                          className={`h-12 rounded-xl font-black text-sm transition-all border-2 flex items-center justify-center
                            ${rpeValue === num 
                              ? 'bg-emerald-500 text-white border-emerald-500 scale-105 shadow-[0_0_20px_rgba(16,185,129,0.3)]' 
                              : 'bg-white/5 text-slate-500 border-white/5 hover:border-emerald-500/50 hover:text-emerald-400'}
                          `}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Cronômetro de Suporte</span>
                        <span className="text-[8px] text-slate-600 font-bold uppercase italic">Use para marcar intervalos ou tempo total</span>
                      </div>
                      <TimerComponent />
                    </div>
                    <textarea 
                      disabled={isSaving}
                      className="pro-input w-full h-32 focus:ring-4 focus:ring-emerald-500/20"
                      placeholder="Relate sensações, dores ou conquistas..."
                      value={feedbackText}
                      onChange={e => setFeedbackText(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-6 md:p-8 bg-slate-900 border-t border-white/5 flex-shrink-0 font-sans">
              <button 
                onClick={handleToggleComplete} 
                disabled={isSaving}
                className={`w-full py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 
                  ${saveSuccess ? 'bg-emerald-500 text-white' : 
                    selectedWorkout.data.type === 'Descanso' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-emerald-950 text-white hover:bg-black active:scale-95'} 
                  disabled:opacity-50`}
              >
                {isSaving ? (
                  <div className="flex items-center gap-3">
                    {saveSuccess ? <Check className="w-6 h-6 animate-fade-in" /> : <Loader2 className="w-6 h-6 animate-spin" />}
                    <span>{saveSuccess ? 'SINCRONIZADO!' : 'SINCRONIZANDO...'}</span>
                  </div>
                ) : (
                  selectedWorkout.data.completed 
                    ? (selectedWorkout.data.type === 'Descanso' ? 'DESMARCAR DESCANSO' : 'DESMARCAR CONCLUÍDO') 
                    : (selectedWorkout.data.type === 'Descanso' ? 'MARCAR COMO DESCANSO' : 'CONCLUIR TREINO')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nova Meta */}
      <AnimatePresence>
        {showGoalModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md px-6">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl p-8 border border-white/5"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black italic uppercase tracking-tighter text-white">Nova Meta</h3>
                <button onClick={() => setShowGoalModal(false)} className="p-2 bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"><X className="w-4 h-4" /></button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="pro-label">Título da Meta</label>
                  <input 
                    type="text" 
                    className="pro-input w-full" 
                    placeholder="Ex: Correr 100km total"
                    value={newGoal.title}
                    onChange={e => setNewGoal(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="pro-label">Tipo</label>
                    <select 
                      className="pro-input w-full cursor-pointer"
                      value={newGoal.type}
                      onChange={e => setNewGoal(prev => ({ ...prev, type: e.target.value as any }))}
                    >
                      <option value="distance" className="bg-slate-900">Distância (KM)</option>
                      <option value="frequency" className="bg-slate-900">Frequência</option>
                      <option value="consistency" className="bg-slate-900">Consistência</option>
                    </select>
                  </div>
                  <div>
                    <label className="pro-label">Alvo</label>
                    <input 
                      type="number" 
                      className="pro-input w-full"
                      value={newGoal.targetValue}
                      onChange={e => setNewGoal(prev => ({ ...prev, targetValue: Number(e.target.value) }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="pro-label">Prazo</label>
                  <input 
                    type="date" 
                    className="pro-input w-full uppercase"
                    value={newGoal.deadline}
                    onChange={e => setNewGoal(prev => ({ ...prev, deadline: e.target.value }))}
                  />
                </div>

                <button 
                  onClick={handleAddGoal}
                  className="w-full bg-emerald-500 text-emerald-950 font-black py-4 rounded-2xl uppercase italic tracking-widest mt-4 shadow-[0_10px_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400 transition-all"
                >
                  Confirmar Desafio
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Detalhes da Conquista */}
      <AnimatePresence>
        {selectedAchievement && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md" onClick={() => setSelectedAchievement(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 rounded-[3rem] w-full max-w-sm overflow-hidden shadow-2xl p-8 border border-white/10 relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedAchievement(null)} 
                className="absolute top-6 right-6 p-2 bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-emerald-500/20 rounded-[2.5rem] flex items-center justify-center text-5xl mb-6 shadow-[0_0_40px_rgba(16,185,129,0.2)] border border-emerald-500/20">
                  {selectedAchievement.icon}
                </div>
                
                <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-2 leading-none">
                  {selectedAchievement.name}
                </h3>
                
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-6 italic">
                  Conquistado em {new Date(selectedAchievement.dateEarned).toLocaleDateString()}
                </p>

                <div className="bg-white/5 p-6 rounded-3xl border border-white/5 w-full">
                  <p className="text-slate-300 font-medium italic leading-relaxed">
                    {selectedAchievement.description}
                  </p>
                </div>

                <button 
                  onClick={() => setSelectedAchievement(null)}
                  className="w-full bg-emerald-500 text-emerald-950 font-black py-4 rounded-2xl uppercase italic tracking-widest mt-8 shadow-[0_10px_20px_rgba(16,185,129,0.3)] hover:bg-emerald-400 transition-all font-sans"
                >
                  Continuar Evoluindo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AthletePortal;

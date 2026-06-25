
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { calculatePaces } from '../utils/calculations';
import { exportToImage } from '../utils/exporter';
import { getAppNow, formatWeekDateRange, getWorkoutDate, formatWorkoutDateShort } from '../utils/time';
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
import { motion, AnimatePresence } from 'framer-motion';
import { getProgressToNextLevel } from '../services/gamificationService';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  ResponsiveContainer,
  LabelList,
  AreaChart,
  Area,
  LineChart,
  Line
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
  const { athletes, selectedAthleteId, athletePlans, updateWorkoutStatus, addNotification, updateAthleteReadiness, updateAthlete } = useApp();
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
  const [actualDistanceValue, setActualDistanceValue] = useState<string>('');
  
  // Scientific Daily Readiness States
  const [sleepValue, setSleepValue] = useState<number>(4);
  const [stressValue, setStressValue] = useState<number>(2);
  const [sorenessValue, setSorenessValue] = useState<number>(2);
  const [moodValue, setMoodValue] = useState<number>(4);
  const [menstrualPhaseValue, setMenstrualPhaseValue] = useState<'follicular' | 'ovulatory' | 'luteal' | 'menstrual' | 'none'>('none');

  // Standalone Daily Readiness Panel States (Pre-Workout Evaluation)
  const [portalSleep, setPortalSleep] = useState<number>(4);
  const [portalStress, setPortalStress] = useState<number>(2);
  const [portalSoreness, setPortalSoreness] = useState<number>(2);
  const [portalMood, setPortalMood] = useState<number>(4);
  const [portalMenstrual, setPortalMenstrual] = useState<'follicular' | 'ovulatory' | 'luteal' | 'menstrual' | 'none'>('none');
  const [portalIsSubmitting, setPortalIsSubmitting] = useState(false);
  const [showPortalForm, setShowPortalForm] = useState(false);
  const [portalDate, setPortalDate] = useState<string>(new Date().toISOString().split('T')[0]);

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

  useEffect(() => {
    if (!activeAthlete) return;
    const history = activeAthlete.readinessHistory || [];
    const existing = history.find(entry => entry.date === portalDate);
    if (existing) {
      setPortalSleep(existing.sleepScore || 4);
      setPortalStress(existing.stressScore || 2);
      setPortalSoreness(existing.sorenessScore || 2);
      setPortalMood(existing.moodScore || 4);
      setPortalMenstrual(existing.menstrualPhase || 'none');
    } else {
      // If no entry exists for this date, let's try to fall back to the last registered readiness or default values
      const lastR = activeAthlete.lastReadiness;
      setPortalSleep(lastR?.sleepScore || 4);
      setPortalStress(lastR?.stressScore || 2);
      setPortalSoreness(lastR?.sorenessScore || 2);
      setPortalMood(lastR?.moodScore || 4);
      setPortalMenstrual(lastR?.menstrualPhase || 'none');
    }
  }, [portalDate, activeAthlete?.id]);

  const handleSavePortalReadiness = async () => {
    if (!activeAthlete) return;
    setPortalIsSubmitting(true);
    try {
      // Calculate scientific readiness score
      const sleepPct = ((portalSleep - 1) / 4) * 100;
      const stressPct = ((5 - portalStress) / 4) * 100;
      const sorenessPct = ((5 - portalSoreness) / 4) * 100;
      const moodPct = ((portalMood - 1) / 4) * 100;
      const calculatedScore = Math.round((sleepPct * 0.30) + (stressPct * 0.20) + (sorenessPct * 0.30) + (moodPct * 0.20));

      const history = activeAthlete.readinessHistory ? [...activeAthlete.readinessHistory] : [];
      const existingIndex = history.findIndex(entry => entry.date === portalDate);
      const newEntry = {
        id: existingIndex >= 0 ? history[existingIndex].id : Math.random().toString(36).substring(2, 9),
        date: portalDate,
        sleepScore: portalSleep,
        stressScore: portalStress,
        sorenessScore: portalSoreness,
        moodScore: portalMood,
        menstrualPhase: portalMenstrual,
        readinessScore: calculatedScore
      };

      if (existingIndex >= 0) {
        history[existingIndex] = newEntry;
      } else {
        history.push(newEntry);
      }

      // Sort history by date descending
      history.sort((a, b) => b.date.localeCompare(a.date));

      // Most recent entry chronologically
      const latestEntry = history[0] || null;

      const updatePayload = {
        readinessHistory: history,
        lastReadiness: latestEntry ? {
          date: latestEntry.date,
          sleepScore: latestEntry.sleepScore,
          stressScore: latestEntry.stressScore,
          sorenessScore: latestEntry.sorenessScore,
          moodScore: latestEntry.moodScore,
          menstrualPhase: latestEntry.menstrualPhase,
          readinessScore: latestEntry.readinessScore
        } : undefined,
        readiness: latestEntry ? (
          latestEntry.readinessScore >= 70 ? 'ready' as const :
          latestEntry.readinessScore >= 40 ? 'recovering' as const : 'fatigued' as const
        ) : undefined
      };

      await updateAthlete(activeAthlete.id, updatePayload);

      addNotification({
        title: 'Prontidão Atualizada!',
        message: `Sua prontidão para o dia ${portalDate.split('-').reverse().join('/')} foi registrada com sucesso! Seu score é de ${calculatedScore}%.`,
        type: 'success',
        category: 'workout',
        link: '/athlete-portal'
      } as any);

      setShowPortalForm(false);
    } catch (e) {
      console.error("Erro ao salvar prontidão no portal:", e);
    } finally {
      setPortalIsSubmitting(false);
    }
  };

  const handleDeleteReadiness = async (dateToDelete: string) => {
    if (!activeAthlete) return;
    if (!window.confirm(`Deseja realmente excluir a prontidão do dia ${dateToDelete.split('-').reverse().join('/')}?`)) return;

    setPortalIsSubmitting(true);
    try {
      const history = activeAthlete.readinessHistory ? [...activeAthlete.readinessHistory] : [];
      const updatedHistory = history.filter(entry => entry.date !== dateToDelete);

      // Most recent entry chronologically
      const latestEntry = updatedHistory[0] || null;

      const updatePayload = {
        readinessHistory: updatedHistory,
        lastReadiness: latestEntry ? {
          date: latestEntry.date,
          sleepScore: latestEntry.sleepScore,
          stressScore: latestEntry.stressScore,
          sorenessScore: latestEntry.sorenessScore,
          moodScore: latestEntry.moodScore,
          menstrualPhase: latestEntry.menstrualPhase,
          readinessScore: latestEntry.readinessScore
        } : undefined,
        readiness: latestEntry ? (
          latestEntry.readinessScore >= 70 ? 'ready' as const :
          latestEntry.readinessScore >= 40 ? 'recovering' as const : 'fatigued' as const
        ) : undefined
      };

      await updateAthlete(activeAthlete.id, updatePayload);

      addNotification({
        title: 'Prontidão Excluída!',
        message: `O registro de prontidão para o dia ${dateToDelete.split('-').reverse().join('/')} foi removido.`,
        type: 'warning',
        category: 'workout',
        link: '/athlete-portal'
      } as any);

    } catch (e) {
      console.error("Erro ao excluir prontidão:", e);
    } finally {
      setPortalIsSubmitting(false);
    }
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
      const parsedDistance = actualDistanceValue !== '' ? Number(String(actualDistanceValue).replace(',', '.')) : undefined;
      
      // Calculate scientific readiness score
      const sleepPct = ((sleepValue - 1) / 4) * 100;
      const stressPct = ((5 - stressValue) / 4) * 100;
      const sorenessPct = ((5 - sorenessValue) / 4) * 100;
      const moodPct = ((moodValue - 1) / 4) * 100;
      const calculatedScore = Math.round((sleepPct * 0.30) + (stressPct * 0.20) + (sorenessPct * 0.30) + (moodPct * 0.20));

      await updateWorkoutStatus(
        activeAthlete.id, 
        selectedWorkout.weekIndex, 
        selectedWorkout.dayIndex, 
        newStatus, 
        feedbackText,
        rpeValue,
        localExercises,
        parsedDistance,
        sleepValue,
        stressValue,
        sorenessValue,
        moodValue,
        menstrualPhaseValue,
        calculatedScore
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
        setActualDistanceValue('');
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
    setActualDistanceValue(workout.actualDistance !== undefined ? String(workout.actualDistance) : String(workout.distance || ''));
    setSleepValue(workout.sleepScore || activeAthlete?.lastReadiness?.sleepScore || 4);
    setStressValue(workout.stressScore || activeAthlete?.lastReadiness?.stressScore || 2);
    setSorenessValue(workout.sorenessScore || activeAthlete?.lastReadiness?.sorenessScore || 2);
    setMoodValue(workout.moodScore || activeAthlete?.lastReadiness?.moodScore || 4);
    setMenstrualPhaseValue(workout.menstrualPhase || (activeAthlete?.lastReadiness?.menstrualPhase as any) || 'none');
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
      </div>

      {/* PAINEL DE CONTROLE DE PRONTIDÃO DIÁRIA */}
      <div className="bg-slate-900 border border-slate-800 rounded-[2.2rem] p-6 text-white shadow-xl space-y-6 animate-fade-in">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-tight italic">
              Controle de Prontidão Diária
            </h3>
          </div>
          <span className="text-[8px] bg-emerald-500/10 text-emerald-400 font-black px-2 py-1 rounded-lg border border-emerald-500/20 uppercase tracking-widest italic">
            Fisiologia
          </span>
        </div>

        {/* 1. SELETOR DE DATA */}
        <div className="space-y-2 bg-white/5 p-4 rounded-2xl border border-white/5">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">📅 Data da Prontidão</span>
            <span className="text-[10px] text-emerald-400 font-bold italic">Selecione para preencher ou editar</span>
          </div>
          <input 
            type="date"
            value={portalDate}
            onChange={(e) => setPortalDate(e.target.value)}
            className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-emerald-500"
          />
          {(() => {
            const hasEntry = (activeAthlete?.readinessHistory || []).some(entry => entry.date === portalDate);
            return (
              <p className={`text-[10px] font-medium leading-normal italic ${hasEntry ? 'text-amber-400' : 'text-slate-400'}`}>
                {hasEntry 
                  ? '✨ Prontidão já registrada para esta data. Você pode editar os valores abaixo e salvar, ou excluir o registro.' 
                  : '📝 Nenhum registro encontrado para esta data. Preencha e grave sua prontidão.'}
              </p>
            );
          })()}
        </div>

        {/* 2. QUESTIONÁRIO */}
        <div className="space-y-4 pt-2">
          {/* 2.1 Sono */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">💤 Qualidade do Sono</span>
              <span className="text-[10px] font-black text-emerald-400 italic">
                {portalSleep === 5 ? 'Excelente (Restaurador)' :
                 portalSleep === 4 ? 'Bom' :
                 portalSleep === 3 ? 'Regular' :
                 portalSleep === 2 ? 'Ruim' : 'Péssimo'}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPortalSleep(val)}
                  className={`py-2 text-xs font-black rounded-lg transition-all border ${
                    portalSleep === val 
                      ? 'bg-emerald-500 text-white border-emerald-500 scale-105 shadow-md shadow-emerald-500/25' 
                      : 'bg-white/5 text-slate-400 border-transparent hover:border-white/10'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* 2.2 Estresse */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">🧠 Estresse Mental</span>
              <span className="text-[10px] font-black text-amber-400 italic">
                {portalStress === 1 ? 'Zero (Muito Calmo)' :
                 portalStress === 2 ? 'Baixo' :
                 portalStress === 3 ? 'Moderado' :
                 portalStress === 4 ? 'Alto' : 'Extremo'}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPortalStress(val)}
                  className={`py-2 text-xs font-black rounded-lg transition-all border ${
                    portalStress === val 
                      ? 'bg-amber-500 text-white border-amber-500 scale-105 shadow-md shadow-amber-500/25' 
                      : 'bg-white/5 text-slate-400 border-transparent hover:border-white/10'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* 2.3 Dor Muscular */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">🩹 Dor Muscular (DOMS)</span>
              <span className="text-[10px] font-black text-red-400 italic">
                {portalSoreness === 1 ? 'Nenhuma (Zero dor)' :
                 portalSoreness === 2 ? 'Leve' :
                 portalSoreness === 3 ? 'Moderada' :
                 portalSoreness === 4 ? 'Forte' : 'Extrema'}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPortalSoreness(val)}
                  className={`py-2 text-xs font-black rounded-lg transition-all border ${
                    portalSoreness === val 
                      ? 'bg-red-500 text-white border-red-500 scale-105 shadow-md shadow-red-500/25' 
                      : 'bg-white/5 text-slate-400 border-transparent hover:border-white/10'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* 2.4 Humor */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">🔥 Humor / Disposição</span>
              <span className="text-[10px] font-black text-blue-400 italic">
                {portalMood === 5 ? 'Incrível' :
                 portalMood === 4 ? 'Disposto' :
                 portalMood === 3 ? 'Neutro' :
                 portalMood === 2 ? 'Apático' : 'Irritado'}
              </span>
            </div>
            <div className="grid grid-cols-5 gap-1.5">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPortalMood(val)}
                  className={`py-2 text-xs font-black rounded-lg transition-all border ${
                    portalMood === val 
                      ? 'bg-blue-500 text-white border-blue-500 scale-105 shadow-md shadow-blue-500/25' 
                      : 'bg-white/5 text-slate-400 border-transparent hover:border-white/10'
                  }`}
                >
                  {val}
                </button>
              ))}
            </div>
          </div>

          {/* 2.5 Menstrual */}
          {activeAthlete.gender === 'female' && activeAthlete.trackMenstrual !== false && (
            <div className="pt-3 border-t border-white/5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest">🌸 Fase do Ciclo Menstrual</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { phase: 'follicular', label: 'Fase Folicular', icon: '⚡' },
                  { phase: 'ovulatory', label: 'Fase Ovulatória', icon: '🔥' },
                  { phase: 'luteal', label: 'Fase Lútea (TPM)', icon: '🧘' },
                  { phase: 'menstrual', label: 'Fase Menstrual', icon: '🩸' },
                ].map((item) => (
                  <button
                    key={item.phase}
                    type="button"
                    onClick={() => setPortalMenstrual(item.phase as any)}
                    className={`p-2 rounded-xl transition-all border flex items-center gap-1.5 font-black text-[10px] ${
                      portalMenstrual === item.phase 
                        ? 'bg-purple-600 text-white border-purple-500 shadow-sm scale-[1.02]' 
                        : 'bg-white/5 text-slate-300 border-transparent hover:border-white/10'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* BOTÕES DE AÇÃO */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSavePortalReadiness}
            disabled={portalIsSubmitting}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] uppercase italic text-xs tracking-tight"
          >
            {portalIsSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {(activeAthlete?.readinessHistory || []).some(entry => entry.date === portalDate) ? 'Salvar Edição' : 'Gravar Prontidão'}
          </button>
          {(() => {
            const hasEntry = (activeAthlete?.readinessHistory || []).some(entry => entry.date === portalDate);
            if (hasEntry) {
              return (
                <button
                  onClick={() => handleDeleteReadiness(portalDate)}
                  disabled={portalIsSubmitting}
                  className="px-4 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/20 hover:border-transparent transition-colors py-3 rounded-xl font-bold text-xs uppercase"
                  title="Excluir prontidão desta data"
                >
                  Excluir
                </button>
              );
            }
            return (
              <button
                onClick={() => setPortalDate(new Date().toISOString().split('T')[0])}
                className="px-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl text-xs font-bold transition-colors"
              >
                Hoje
              </button>
            );
          })()}
        </div>

        {/* 3. GRÁFICO DA PRONTIDÃO */}
        {(() => {
          const history = activeAthlete?.readinessHistory || [];
          if (history.length === 0) return null;

          // Chart data: latest 10 entries in ascending chronological order
          const chartData = [...history]
            .slice(0, 10)
            .reverse()
            .map(entry => {
              const [y, m, d] = entry.date.split('-');
              return {
                label: `${d}/${m}`,
                Score: entry.readinessScore,
                Sono: entry.sleepScore * 20,
              };
            });

          return (
            <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 space-y-3">
              <div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">📈 Evolução da Prontidão</p>
                <p className="text-[8px] text-slate-400 font-bold uppercase italic mt-0.5">Últimos {chartData.length} registros (Score %)</p>
              </div>
              <div className="h-44 w-full text-slate-300 font-mono text-[9px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                    <XAxis dataKey="label" stroke="#94a3b860" tickLine={false} />
                    <YAxis stroke="#94a3b860" domain={[0, 100]} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                      labelStyle={{ color: '#94a3b8', fontWeight: 'bold' }}
                    />
                    <Area type="monotone" dataKey="Score" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorScore)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })()}

        {/* 4. HISTÓRICO DE PRONTIDÃO */}
        {(() => {
          const history = activeAthlete?.readinessHistory || [];
          if (history.length === 0) return null;

          return (
            <div className="bg-slate-950/50 p-4 rounded-2xl border border-white/5 space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center sticky top-0 bg-slate-900/95 py-1 z-10">
                <div>
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">📜 Histórico de Registros</p>
                  <p className="text-[8px] text-slate-400 font-bold uppercase italic mt-0.5">Clique para carregar e editar</p>
                </div>
                <span className="text-[8px] bg-white/5 text-slate-400 font-bold px-2 py-0.5 rounded uppercase">
                  {history.length} {history.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>
              <div className="space-y-2 pt-1">
                {history.map((entry) => {
                  const [y, m, d] = entry.date.split('-');
                  const dateStr = `${d}/${m}/${y}`;
                  const scoreColor = entry.readinessScore >= 70 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 
                                     entry.readinessScore >= 40 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 
                                     'text-red-400 bg-red-500/10 border-red-500/20';
                  
                  return (
                    <div 
                      key={entry.id} 
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 border border-white/5 hover:border-emerald-500/30 transition-all group"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`text-[10px] font-black px-2 py-1 rounded-lg border flex items-center justify-center ${scoreColor}`}>
                          {entry.readinessScore}%
                        </div>
                        <div>
                          <p className="text-xs font-black text-white italic">{dateStr}</p>
                          <p className="text-[9px] text-slate-400 font-medium">
                            Sono: {entry.sleepScore}/5 • Dor: {entry.sorenessScore}/5
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setPortalDate(entry.date)}
                          className="px-2 py-1 bg-white/5 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 border border-transparent hover:border-emerald-500/20 rounded-lg text-[9px] font-black uppercase transition-colors"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteReadiness(entry.date)}
                          className="p-1 text-slate-500 hover:text-red-400 transition-colors rounded-lg"
                          title="Excluir"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
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
              <div className="px-3 py-1 bg-emerald-500 text-emerald-950 text-[9px] font-black uppercase rounded-lg italic tracking-tighter flex items-center gap-1.5 flex-wrap">
                <span>{todayWorkout?.workout.type.toUpperCase().includes('PROVA') ? 'Dia de Prova' : (todayWorkout?.isDescanso ? 'Recuperação' : 'Treino de Hoje')}</span>
                {athletePlan?.startDate && todayWorkout && (
                  <span className="opacity-70 font-black">
                    ({formatWorkoutDateShort(getWorkoutDate(athletePlan.startDate, todayWorkout.weekIndex, todayWorkout.dayIndex))})
                  </span>
                )}
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
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-1.5 flex-wrap">
                <span>Amanhã {tomorrowWorkout.weekIndex !== todayWorkout?.weekIndex ? `• Semana ${allWeeks[tomorrowWorkout.weekIndex]?.weekNumber}` : ''}</span>
                {athletePlan?.startDate && (
                  <span className="text-emerald-600 bg-emerald-100/50 px-1.5 py-0.5 rounded text-[8px] font-extrabold whitespace-nowrap">
                    ({formatWorkoutDateShort(getWorkoutDate(athletePlan.startDate, tomorrowWorkout.weekIndex, tomorrowWorkout.dayIndex))})
                  </span>
                )}
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
                  <div className="flex justify-between items-center flex-wrap gap-2 mb-4">
                    <div className="flex flex-col gap-1 xs:flex-row xs:items-center xs:gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-black uppercase italic ${isCurrentWeek ? 'text-emerald-600' : 'text-slate-500'}`}>Semana {week.weekNumber}</span>
                        {isCurrentWeek && <span className="bg-emerald-500 text-white text-[7px] font-black px-2 py-0.5 rounded-full uppercase italic">Atual</span>}
                      </div>
                      {athletePlan?.startDate && (
                        <span className="text-[8px] text-slate-400 font-extrabold uppercase bg-slate-100 border border-slate-200/50 px-1.5 py-0.5 rounded-md italic">
                          📅 {formatWeekDateRange(athletePlan.startDate, originalWeekIndex)}
                        </span>
                      )}
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
                        <div className="flex justify-between items-center flex-wrap gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase text-slate-400">{weekdaysFull[selDayIdx]}</span>
                            {athletePlan?.startDate && (
                              <span className="text-[8px] font-extrabold italic bg-emerald-50 text-emerald-600 border border-emerald-100/50 px-1.5 py-0.5 rounded-md">
                                {formatWorkoutDateShort(getWorkoutDate(athletePlan.startDate, originalWeekIndex, selDayIdx))}
                              </span>
                            )}
                          </div>
                          {wk.type !== 'Descanso' && (
                            <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-100/50 italic flex items-center justify-center gap-1">
                              📏{' '}
                              {wk.completed && wk.actualDistance !== undefined ? (
                                <>
                                  <span className="line-through text-slate-400 font-medium mr-1">{wk.distance || 0} KM</span>
                                  <span>{wk.actualDistance} KM Real</span>
                                </>
                              ) : (
                                <span>{wk.distance || '--'} KM</span>
                              )}
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

                  {/* Espaço para inserir a quilometragem real do Treino */}
                  <div className="space-y-2 bg-white/5 p-5 rounded-[2rem] border border-white/5">
                    <div className="flex justify-between items-center px-1">
                      <label className="pro-label flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" /> Distância Real Executada (KM)
                      </label>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white/5 px-2.5 py-1 rounded-lg border border-white/5 italic">
                        Planejado: {selectedWorkout.data.distance || 0} KM
                      </span>
                    </div>
                    <p className="text-[9px] text-slate-400 font-medium px-1">
                      Insira a quilometragem total real percorrida (incluindo aquecimento e desaquecimento).
                    </p>
                    <div className="relative mt-2">
                      <input 
                        type="text"
                        disabled={isSaving}
                        className="pro-input w-full py-4 px-5 text-base font-black text-emerald-400 italic bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-emerald-500/50 transition-all pr-16"
                        placeholder="Ex: 12.5"
                        value={actualDistanceValue}
                        onChange={e => setActualDistanceValue(e.target.value)}
                      />
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400 italic">
                        KM REAL
                      </div>
                    </div>
                  </div>

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

                  {/* Questionário Científico de Prontidão Diária */}
                  {activeAthlete.lastReadiness?.date === new Date().toISOString().split('T')[0] ? (
                    <div className="bg-emerald-950/40 p-5 rounded-3xl border border-emerald-500/20 space-y-2 text-center">
                      <p className="text-xs font-black text-emerald-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                        <CheckCircle className="w-4 h-4" /> Prontidão Diária Registrada!
                      </p>
                      <p className="text-[11px] text-slate-300 font-medium">
                        Seu score de prontidão pré-treino para hoje é de <span className="text-emerald-400 font-black">{activeAthlete.lastReadiness.readinessScore}%</span> ({activeAthlete.lastReadiness.readinessScore >= 70 ? 'Pronto para correr' : activeAthlete.lastReadiness.readinessScore >= 40 ? 'Moderar esforço' : 'Focar em recuperação'}). Ele já foi salvo e associado à sua fisiologia de hoje.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 space-y-5">
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-emerald-400" />
                          <h4 className="text-sm font-black text-white uppercase italic tracking-tighter">Fisiologia & Prontidão Diária</h4>
                        </div>
                        <span className="text-[8px] font-black bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-500/20 uppercase tracking-widest italic">
                          Científico
                        </span>
                      </div>

                      {/* 1. Qualidade do Sono */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">💤 Qualidade do Sono</span>
                          <span className="text-[10px] font-black text-emerald-400 italic">
                            {sleepValue === 5 ? 'Excelente (8h+ profundo)' :
                             sleepValue === 4 ? 'Bom (Restaurador)' :
                             sleepValue === 3 ? 'Regular (Interrompido)' :
                             sleepValue === 2 ? 'Ruim (Poucas horas)' : 'Péssimo (Insônia/Exausto)'}
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setSleepValue(val)}
                              className={`py-2 text-xs font-black rounded-lg transition-all border ${
                                sleepValue === val 
                                  ? 'bg-emerald-500 text-white border-emerald-500 font-extrabold shadow-sm scale-105' 
                                  : 'bg-white/5 text-slate-400 border-transparent hover:border-white/10'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 2. Estresse Mental */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">🧠 Estresse Mental</span>
                          <span className="text-[10px] font-black text-amber-400 italic">
                            {stressValue === 1 ? 'Nenhum (Muito Calmo)' :
                             stressValue === 2 ? 'Baixo (Controlado)' :
                             stressValue === 3 ? 'Moderado (Produtivo)' :
                             stressValue === 4 ? 'Alto (Preocupado)' : 'Extremo (Esgotado)'}
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setStressValue(val)}
                              className={`py-2 text-xs font-black rounded-lg transition-all border ${
                                stressValue === val 
                                  ? 'bg-amber-500 text-white border-amber-500 font-extrabold shadow-sm scale-105' 
                                  : 'bg-white/5 text-slate-400 border-transparent hover:border-white/10'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 3. Dor Muscular (DOMS) */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">🩹 Dor Muscular (DOMS)</span>
                          <span className="text-[10px] font-black text-red-400 italic">
                            {sorenessValue === 1 ? 'Nenhuma (Zero dor)' :
                             sorenessValue === 2 ? 'Leve (Apenas estímulo)' :
                             sorenessValue === 3 ? 'Moderada (Suportável)' :
                             sorenessValue === 4 ? 'Forte (Dificulta corrida)' : 'Extrema (Lesão/Sem treinar)'}
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setSorenessValue(val)}
                              className={`py-2 text-xs font-black rounded-lg transition-all border ${
                                sorenessValue === val 
                                  ? 'bg-red-500 text-white border-red-500 font-extrabold shadow-sm scale-105' 
                                  : 'bg-white/5 text-slate-400 border-transparent hover:border-white/10'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 4. Disposição / Humor */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">🔥 Humor / Disposição</span>
                          <span className="text-[10px] font-black text-blue-400 italic">
                            {moodValue === 5 ? 'Incrível (Foco Máximo)' :
                             moodValue === 4 ? 'Disposto (Motivado)' :
                             moodValue === 3 ? 'Normal (Neutro)' :
                             moodValue === 2 ? 'Apático (Sem vontade)' : 'Irritado / Deprimido'}
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {[1, 2, 3, 4, 5].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setMoodValue(val)}
                              className={`py-2 text-xs font-black rounded-lg transition-all border ${
                                moodValue === val 
                                  ? 'bg-blue-500 text-white border-blue-500 font-extrabold shadow-sm scale-105' 
                                  : 'bg-white/5 text-slate-400 border-transparent hover:border-white/10'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 5. Menstrual Cycle Tracker (Feminino com trackMenstrual ativo) */}
                      {activeAthlete.gender === 'female' && activeAthlete.trackMenstrual !== false && (
                        <div className="pt-4 border-t border-white/5 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-purple-400 uppercase tracking-widest flex items-center gap-1">🌸 Fase do Ciclo Menstrual</span>
                            <span className="text-[8px] bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-md border border-purple-500/20 uppercase tracking-wide">
                              Mulher Atleta
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { phase: 'follicular', label: 'Fase Folicular', icon: '⚡', desc: 'Energia em alta' },
                              { phase: 'ovulatory', label: 'Fase Ovulatória', icon: '🔥', desc: 'Pico de força' },
                              { phase: 'luteal', label: 'Fase Lútea (TPM)', icon: '🧘', desc: 'Fadiga / Rodagem' },
                              { phase: 'menstrual', label: 'Fase Menstrual', icon: '🩸', desc: 'Cólicas / Escuta' },
                            ].map((item) => (
                              <button
                                key={item.phase}
                                type="button"
                                onClick={() => setMenstrualPhaseValue(item.phase as any)}
                                className={`p-2.5 text-left rounded-xl transition-all border flex flex-col justify-between ${
                                  menstrualPhaseValue === item.phase 
                                    ? 'bg-purple-600 text-white border-purple-500 shadow-sm scale-[1.02]' 
                                    : 'bg-white/5 text-slate-300 border-transparent hover:border-white/10'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 font-black text-[11px]">
                                  <span>{item.icon}</span>
                                  <span className="truncate">{item.label}</span>
                                </div>
                                <span className={`text-[8px] font-medium mt-1 leading-none ${menstrualPhaseValue === item.phase ? 'text-purple-100' : 'text-slate-500'}`}>
                                  {item.desc}
                                </span>
                              </button>
                            ))}
                          </div>

                          {/* Science Insights for Menstrual Cycle */}
                          {menstrualPhaseValue !== 'none' && (
                            <div className="bg-purple-950/20 border border-purple-500/10 p-3.5 rounded-2xl space-y-1.5 text-left animate-fade-in">
                              <p className="text-[9px] font-black text-purple-400 uppercase tracking-widest italic flex items-center gap-1">
                                💡 Insight Científico
                              </p>
                              <p className="text-[10px] text-purple-200 font-medium italic leading-relaxed">
                                {menstrualPhaseValue === 'follicular' && 'Hormônios baixos e estrogênio subindo: Excelente para tiros de alta intensidade, treinos de ritmo e força. Recuperação ultra-rápida!'}
                                {menstrualPhaseValue === 'ovulatory' && 'Pico de estrogênio: Força e potência máxima no pico de desempenho. Atenção extra ao aquecimento para proteger ligamentos.'}
                                {menstrualPhaseValue === 'luteal' && 'Progesterona alta: Temperatura corporal elevada e batimentos sobem mais rápido. Ideal para rodagens de resistência estável. Evite exaustão extrema.'}
                                {menstrualPhaseValue === 'menstrual' && 'Possíveis sintomas de cólica e retenção líquida. Seu corpo está iniciando a recuperação. Escute seus sintomas e adapte o ritmo se necessário.'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

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

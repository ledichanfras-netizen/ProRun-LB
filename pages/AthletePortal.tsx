
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
  Archive,
  Image as ImageIcon,
  Download,
  MessageSquare,
  Loader2,
  Check,
  TrendingUp,
  Sparkles,
  Zap,
  Flag,
  Play,
  PlayCircle,
  Dumbbell,
  MapPin,
  Navigation,
  Compass,
  FileCode2,
  Timer,
  Camera,
  Share2
} from 'lucide-react';
import { WorkoutType, UserAchievement, Exercise } from '../types';
import { PrintLayout } from '../components/PrintLayout';
import { AIPerformanceHub } from '../components/AIPerformanceHub';
import { GpsWorkoutTracker } from '../components/GpsWorkoutTracker';
import { WorkoutMap } from '../components/WorkoutMap';
import { decodePolyline } from '../utils/gpsUtils';
import { formatStructuredWorkoutSummary } from '../utils/workoutParser';
import { WorkoutShareModal, WorkoutShareData } from '../components/WorkoutShareModal';
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
  const { athletes, selectedAthleteId, athletePlans, updateWorkoutStatus, addNotification, updateAthleteReadiness, updateAthlete, addUserGoal, theme } = useApp();
  const isLight = theme === 'light';
  const navigate = useNavigate();
  const activeAthlete = athletes.find(a => a.id === selectedAthleteId);
  
  const portalRoot = document.getElementById('printable-portal');
  
  const [selectedWorkout, setSelectedWorkout] = useState<{
    weekIndex: number;
    dayIndex: number;
    data: any;
  } | null>(null);

  const [shareWorkoutData, setShareWorkoutData] = useState<WorkoutShareData | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [rpeValue, setRpeValue] = useState<number>(0);
  const [actualDistanceValue, setActualDistanceValue] = useState<string>('');
  const [currentGpsRoute, setCurrentGpsRoute] = useState<any>(null);
  const [showGpsTracker, setShowGpsTracker] = useState(false);
  
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
  const [activePortalTab, setActivePortalTab] = useState<'current' | 'history'>('current');
  const [expandedArchivedId, setExpandedArchivedId] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', type: 'distance' as const, targetValue: 5, deadline: getAppNow().toISOString().split('T')[0] });
  const [selectedAchievement, setSelectedAchievement] = useState<UserAchievement | null>(null);
  const [localExercises, setLocalExercises] = useState<Exercise[]>([]);
  const [selectedDayPerWeek, setSelectedDayPerWeek] = useState<Record<number, number>>({});

  const handleDownloadWorkoutImage = async () => {
    if (exportLoading || !activeAthlete) return;
    setExportLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const filename = `Treino_${activeAthlete.name.replace(/\s+/g, '_')}`;
      await exportToImage('print-layout-root', filename);
    } catch (err: any) {
      console.error("Erro no download da imagem:", err);
    } finally {
      setExportLoading(false);
    }
  };

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
    return selectedWorkout.data.type === 'Prova' || (selectedWorkout.weekIndex === (allWeeks.length - 1) && 
           (selectedWorkout.data.type === 'Longão' || selectedWorkout.data.customDescription?.toLowerCase().includes('prova')));
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
        calculatedScore,
        currentGpsRoute
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
        setCurrentGpsRoute(null);
        setShowGpsTracker(false);
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
    setCurrentGpsRoute(workout.gpsRoute || null);
    setShowGpsTracker(false);
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
                {activeAthlete.gamification?.streak || 0} Dias <Zap className="w-4 h-4 fill-emerald-500 text-emerald-500" />
              </h4>
              <p className="text-[8px] font-bold text-emerald-300 uppercase italic mt-1 leading-tight">
                {activeAthlete.gamification?.streak === 0 ? 'Comece sua sequência hoje!' : 'Fogo no treino! Mantenha o ritmo.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Abas do Portal do Atleta */}
      <div className="bg-slate-900 border border-slate-800 p-1.5 rounded-[1.8rem] flex gap-1 shadow-inner">
        <button
          onClick={() => setActivePortalTab('current')}
          className={`flex-1 py-3 text-center rounded-2xl font-black text-[11px] uppercase tracking-wider italic transition-all flex justify-center items-center gap-2 ${
            activePortalTab === 'current'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/10'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Activity className="w-4 h-4" /> Ciclo Atual
        </button>
        <button
          onClick={() => setActivePortalTab('history')}
          className={`flex-1 py-3 text-center rounded-2xl font-black text-[11px] uppercase tracking-wider italic transition-all flex justify-center items-center gap-2 ${
            activePortalTab === 'history'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/10'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Archive className="w-4 h-4" /> Ciclos Concluídos
        </button>
      </div>

      {activePortalTab === 'current' ? (
        <>
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
        <div className={`absolute -inset-1 rounded-[2.5rem] blur opacity-20 group-hover:opacity-30 transition duration-1000 ${
          todayWorkout?.workout.type === 'Prova' 
            ? 'bg-gradient-to-r from-amber-500 to-red-600 opacity-40 group-hover:opacity-60' 
            : 'bg-gradient-to-r from-emerald-500 to-emerald-700'
        }`}></div>
        <div className={`relative rounded-[2.2rem] p-8 text-white shadow-2xl overflow-hidden border ${
          todayWorkout?.workout.type === 'Prova'
            ? 'bg-gradient-to-br from-slate-950 via-amber-950 to-red-950 border-amber-600/30'
            : 'bg-emerald-950 border-emerald-900'
        }`}>
          <div className="absolute top-0 right-0 p-4 opacity-5">
             <Trophy className="w-32 h-32 rotate-12" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className={`px-3 py-1 text-[9px] font-black uppercase rounded-lg italic tracking-tighter flex items-center gap-1.5 flex-wrap ${
                todayWorkout?.workout.type === 'Prova'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-emerald-500 text-emerald-950'
              }`}>
                <span>{todayWorkout?.workout.type.toUpperCase().includes('PROVA') ? 'Dia de Prova 🏁' : (todayWorkout?.isDescanso ? 'Recuperação' : 'Treino de Hoje')}</span>
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
              {todayWorkout?.workout.gpsRoute && (
                <div className="flex items-center gap-1 text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-md font-black text-[8px] uppercase italic border border-emerald-400/30">
                  <Navigation className="w-2.5 h-2.5" /> Rota GPS Gravada ({todayWorkout.workout.gpsRoute.totalDistanceKm}k)
                </div>
              )}
            </div>

            <h2 className={`text-3xl font-black italic uppercase tracking-tighter mb-2 leading-tight ${
              todayWorkout?.workout.type === 'Prova' ? 'text-amber-400' : ''
            }`}>
              {todayWorkout ? todayWorkout.workout.type : 'Dia de Descanso'}
            </h2>
            
            <p className={`text-sm font-medium mb-8 leading-relaxed line-clamp-2 ${
              todayWorkout?.workout.type === 'Prova' ? 'text-amber-200/80' : 'text-emerald-300/80'
            }`}>
              {todayWorkout?.workout.type.toUpperCase().includes('PROVA') 
                ? 'Hoje é o grande dia! Coloque em prática tudo o que treinou. Boa prova!' 
                : (todayWorkout ? todayWorkout.workout.customDescription : 'Aproveite para recuperar as energias e focar na mobilidade.')}
            </p>

            {todayWorkout?.workout.structuredWorkout && (
              <div className="mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/10 backdrop-blur-md rounded-xl text-[11px] font-black uppercase italic tracking-wider text-emerald-300 border border-white/20 shadow-sm">
                <Timer className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>DETALHADA: {formatStructuredWorkoutSummary(todayWorkout.workout.structuredWorkout)}</span>
              </div>
            )}

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
                            : workout.type === 'Descanso' 
                              ? 'bg-slate-100 border-slate-100 text-slate-300' 
                              : workout.type === 'Prova'
                                ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/25 animate-pulse'
                                : 'bg-white border-slate-100 text-slate-300 hover:border-emerald-200'
                        }`}
                      >
                         <span className="text-[7px] font-black uppercase mb-0.5 opacity-60">
                           {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'][dIdx]}
                         </span>
                         {workout.completed ? (
                           <Check className="w-3 h-3" />
                         ) : workout.type === 'Prova' ? (
                           <span className="text-[10px] leading-none">🏁</span>
                         ) : (
                           <div className="w-1 h-1 rounded-full bg-current opacity-20" />
                         )}
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
        </>
      ) : (
        <div className="space-y-6 animate-fade-in px-2">
          {/* Header of history section */}
          <div className="bg-slate-900 border border-slate-800 rounded-[2.2rem] p-6 text-white shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black uppercase italic tracking-tighter text-white">Histórico de Ciclos</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase leading-tight mt-0.5">Seus períodos de periodização concluídos e arquivados.</p>
              </div>
            </div>
          </div>

          {/* List of completed/archived cycles */}
          {!activeAthlete.archivedPlans || activeAthlete.archivedPlans.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-[2.2rem] p-10 text-center flex flex-col items-center justify-center gap-4 text-slate-400">
              <div className="w-16 h-16 bg-slate-800/50 border border-white/5 rounded-full flex items-center justify-center text-slate-500 text-2xl">
                📁
              </div>
              <div>
                <h4 className="font-black text-white text-xs uppercase italic tracking-wider mb-1">Nenhum Ciclo Concluído</h4>
                <p className="text-[10px] leading-relaxed max-w-xs mx-auto">Seu treinador ainda não arquivou nenhum período ou ciclo. Continue treinando firme no seu ciclo atual!</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeAthlete.archivedPlans.map((archived) => {
                const isExpanded = expandedArchivedId === archived.id;
                
                // Calculate completion metrics
                let totalWorkoutsPlanned = 0;
                let totalWorkoutsCompleted = 0;
                let totalArchivedVolume = 0;
                
                archived.weeks.forEach((w: any) => {
                  totalArchivedVolume += Number(w.totalVolume) || 0;
                  w.workouts.forEach((work: any) => {
                    if (work.type !== 'Descanso') {
                      totalWorkoutsPlanned++;
                      if (work.completed) totalWorkoutsCompleted++;
                    }
                  });
                });
                
                const completionRate = totalWorkoutsPlanned > 0 ? Math.round((totalWorkoutsCompleted / totalWorkoutsPlanned) * 100) : 0;
                
                return (
                  <div key={archived.id} className="bg-slate-900 border border-slate-800 rounded-[2.2rem] overflow-hidden transition-all shadow-md">
                    <div className="p-6 flex flex-col gap-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[8px] font-black uppercase tracking-widest text-amber-400 italic">Ciclo Finalizado</span>
                          <h4 className="text-sm font-black text-white uppercase italic tracking-tight mt-0.5">{archived.name}</h4>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-xl">
                          <p className="text-[8px] text-emerald-400 uppercase font-black tracking-widest">Aproveitamento</p>
                          <p className="text-xs font-black text-white mt-0.5 text-center">{completionRate}%</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-400 bg-slate-950/30 p-3 rounded-2xl border border-white/5">
                        <div className="min-w-0">
                          <p className="text-[8px] text-slate-500 uppercase font-black">🏁 Objetivo</p>
                          <p className="text-white truncate">{archived.specificGoal || 'Não informado'}</p>
                        </div>
                        <div>
                          <p className="text-[8px] text-slate-500 uppercase font-black">📅 Período</p>
                          <p className="text-white">{archived.startDate.split('-').reverse().slice(0, 2).join('/')} - {archived.endDate.split('-').reverse().slice(0, 2).join('/')}</p>
                        </div>
                        <div className="mt-1">
                          <p className="text-[8px] text-slate-500 uppercase font-black">📈 Volume Total</p>
                          <p className="text-white">{totalArchivedVolume} KM</p>
                        </div>
                        <div className="mt-1">
                          <p className="text-[8px] text-slate-500 uppercase font-black">🏃 Treinos</p>
                          <p className="text-white">{totalWorkoutsCompleted}/{totalWorkoutsPlanned} feitos</p>
                        </div>
                      </div>

                      <button
                        onClick={() => setExpandedArchivedId(isExpanded ? null : archived.id)}
                        className="w-full py-2.5 bg-slate-800 hover:bg-slate-950 text-slate-300 hover:text-white rounded-xl font-bold text-[9px] uppercase tracking-wider transition-colors border border-white/5 text-center flex items-center justify-center gap-1.5"
                      >
                        {isExpanded ? 'Ocultar Cronograma' : 'Ver Cronograma Completo'}
                      </button>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-white/5 bg-slate-950/25 p-4 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                        {archived.weeks.map((week: any) => (
                          <div key={week.id || week.weekNumber} className="bg-slate-900 border border-white/5 rounded-[2rem] overflow-hidden p-4 space-y-3">
                            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                              <span className="font-black text-amber-400 text-[9px] uppercase tracking-widest">SEMANA {week.weekNumber}</span>
                              <span className="text-[9px] font-black text-slate-400 uppercase italic">{week.phase}</span>
                            </div>
                            <div className="space-y-2">
                              {week.workouts.map((workout: any, dIdx: number) => (
                                <div key={dIdx} className={`p-3 rounded-xl border text-[11px] flex flex-col gap-1 transition-all ${
                                  workout.completed 
                                    ? (isLight ? 'bg-emerald-50 border-emerald-300 text-slate-900' : 'bg-emerald-950/10 border-emerald-500/20 text-white') 
                                    : workout.type === 'Descanso' 
                                      ? (isLight ? 'bg-slate-100 border-slate-200 text-slate-500 opacity-70' : 'bg-slate-950/10 border-white/5 opacity-55 text-slate-400') 
                                      : (isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950/30 border-white/5 text-white')
                                }`}>
                                  <div className="flex justify-between items-center">
                                    <span className={`font-black uppercase tracking-wider text-[8px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{workout.day}</span>
                                    {workout.completed ? (
                                      <span className={`text-[7px] font-black px-1.5 py-0.5 rounded uppercase ${isLight ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-emerald-500/15 text-emerald-400'}`}>Feito</span>
                                    ) : workout.type !== 'Descanso' ? (
                                      <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded uppercase ${isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-500/10 text-slate-400'}`}>Não Feito</span>
                                    ) : null}
                                  </div>
                                  <h5 className={`font-black text-xs uppercase italic tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{workout.type}</h5>
                                  {workout.structuredWorkout && (
                                    <div className="flex items-center gap-1 my-1">
                                      <span className={`inline-flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 rounded uppercase italic border ${
                                        isLight ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-blue-500/20 text-blue-300 border-blue-400/20'
                                      }`}>
                                        <Timer className="w-2.5 h-2.5" />
                                        <span>{formatStructuredWorkoutSummary(workout.structuredWorkout)}</span>
                                      </span>
                                    </div>
                                  )}
                                  {workout.customDescription && (
                                    <p className={`italic text-[10px] leading-relaxed ${isLight ? 'text-slate-700 font-medium' : 'text-slate-300'}`}>"{workout.customDescription}"</p>
                                  )}
                                  <div className={`flex items-center gap-3 text-[9px] font-bold pt-1 border-t ${isLight ? 'border-slate-200 text-slate-500' : 'border-white/5 text-slate-500'}`}>
                                    {workout.distance > 0 && <span>Meta: {workout.distance} KM</span>}
                                    {workout.actualDistance > 0 && <span className={isLight ? 'text-emerald-700 font-extrabold' : 'text-emerald-400'}>Dist: {workout.actualDistance} KM</span>}
                                    {workout.rpe && <span className={isLight ? 'text-amber-700 font-extrabold' : 'text-amber-400'}>RPE: {workout.rpe}/10</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modal de Detalhes do Treino (Renderizado via Portal para nunca ser encoberto pelo menu) */}
      {selectedWorkout && createPortal(
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-2 sm:p-6 bg-slate-950/80 backdrop-blur-md no-print overflow-y-auto pt-4 sm:pt-6" onClick={() => !isSaving && setSelectedWorkout(null)}>
          <div className={`rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up flex flex-col max-h-[92vh] border relative my-auto transition-colors ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-white/10 text-white'
          }`} onClick={e => e.stopPropagation()}>
            <div className={`p-4 sm:p-6 border-b flex-shrink-0 space-y-3 ${
              isFinalWorkout 
                ? (isLight ? 'bg-emerald-50 text-emerald-950 border-emerald-200' : 'bg-gradient-to-r from-emerald-950 via-emerald-900 to-slate-900 text-white border-white/10') 
                : (isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-slate-950/60 border-white/10 text-white')
            }`}>
              {/* Top line with Day, Status and Close Button */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-lg italic ${
                    isFinalWorkout 
                      ? 'bg-emerald-500 text-slate-950 font-black' 
                      : (isLight ? 'bg-slate-200 text-slate-800 font-extrabold border border-slate-300' : 'bg-white/10 text-emerald-400')
                  }`}>
                    {selectedWorkout.data.day}
                  </span>
                  {selectedWorkout.data.completed && (
                    <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 ${
                      isLight ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}>
                      <Check className="w-3 h-3" /> Concluído
                    </span>
                  )}
                </div>
                <button 
                  disabled={isSaving} 
                  onClick={() => setSelectedWorkout(null)} 
                  className={`p-2.5 rounded-full transition-colors flex items-center justify-center cursor-pointer ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200' 
                      : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10'
                  }`}
                  title="Fechar"
                  aria-label="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Main Title */}
              <div>
                <h3 className={`text-xl sm:text-2xl font-black uppercase italic tracking-tighter ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  {isFinalWorkout ? '🏁 PROVA ALVO' : (selectedWorkout.data.type || 'Treino')}
                </h3>
              </div>

              {/* Dedicated Action Buttons Bar - Always 100% visible and accessible on mobile & desktop */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button 
                  type="button"
                  onClick={() => {
                    setShareWorkoutData({
                      title: selectedWorkout.data.customDescription?.slice(0, 45) || `${selectedWorkout.data.type || 'Treino'}`,
                      athleteName: activeAthlete?.name,
                      date: selectedWorkout.data.date || new Date().toLocaleDateString('pt-BR'),
                      distanceKm: currentGpsRoute?.totalDistanceKm || Number(actualDistanceValue) || selectedWorkout.data.distance || 0,
                      durationSeconds: currentGpsRoute?.durationSeconds || (currentGpsRoute?.totalDistanceKm ? Math.round(currentGpsRoute.totalDistanceKm * 300) : (selectedWorkout.data.distance ? Math.round(selectedWorkout.data.distance * 300) : 1800)),
                      avgPace: currentGpsRoute?.avgPace || (paces?.find(p => p.zone === 'Z2' || p.name.includes('Fácil'))?.minPace || '05:30'),
                      elevationGainMeters: currentGpsRoute?.elevationGainMeters,
                      avgHeartRate: currentGpsRoute?.avgHeartRate,
                      route: currentGpsRoute,
                      workoutType: selectedWorkout.data.type
                    });
                  }}
                  className="px-3 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl flex items-center justify-center gap-1.5 text-xs font-black uppercase italic tracking-wider transition-all shadow-md shadow-emerald-950/20 cursor-pointer active:scale-95 border border-emerald-400/30"
                  title="Gerar Card Social / Postar Treino"
                >
                  <Camera className="w-4 h-4 text-white" />
                  <span>Postar Treino</span>
                </button>
                <button 
                  disabled={exportLoading}
                  onClick={handleDownloadWorkoutImage}
                  className={`px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs font-black uppercase italic tracking-wider transition-all cursor-pointer active:scale-95 ${
                    isLight 
                      ? 'bg-slate-100 hover:bg-slate-200 text-emerald-800 border border-slate-300' 
                      : 'bg-white/5 hover:bg-white/10 text-emerald-400 border border-white/10'
                  }`}
                  title="Baixar imagem da prescrição"
                >
                  {exportLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>Baixar Imagem</span>
                </button>
              </div>
            </div>
            
            <div className={`p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 ${
              isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
            }`}>
              <div className="space-y-4">
                <div className={`${
                  isFinalWorkout 
                    ? (isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-sm' : 'bg-emerald-950 border-emerald-900 text-white shadow-[0_0_30px_rgba(16,185,129,0.1)]') 
                    : (isLight ? 'bg-slate-50 border-slate-200 text-slate-800 shadow-xs' : 'bg-white/5 border-white/10 text-white')
                } p-6 rounded-3xl border text-center italic font-bold leading-relaxed text-sm`}>
                  "{selectedWorkout.data.customDescription}"
                </div>

                {((selectedWorkout.data.distance && selectedWorkout.data.distance > 0) || 
                  (selectedWorkout.data.distanceKm && selectedWorkout.data.distanceKm > 0) || 
                  (selectedWorkout.data.durationMinutes && selectedWorkout.data.durationMinutes > 0)) && (
                  <div className="flex justify-center gap-3">
                    {((selectedWorkout.data.distance && selectedWorkout.data.distance > 0) || (selectedWorkout.data.distanceKm && selectedWorkout.data.distanceKm > 0)) && (
                      <span className={`inline-flex items-center gap-2 text-xs font-black uppercase px-4 py-2 rounded-2xl border italic tracking-wider ${
                        isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                      }`}>
                        📏 {selectedWorkout.data.distance || selectedWorkout.data.distanceKm} KM
                      </span>
                    )}
                    {(selectedWorkout.data.durationMinutes && selectedWorkout.data.durationMinutes > 0) && (
                      <span className={`inline-flex items-center gap-2 text-xs font-black uppercase px-4 py-2 rounded-2xl border italic tracking-wider ${
                        isLight ? 'bg-blue-100 text-blue-900 border-blue-300' : 'bg-blue-500/10 text-blue-400 border-blue-500/25'
                      }`}>
                        ⏱️ {selectedWorkout.data.durationMinutes} Minutos
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Se for Descanso, não mostramos PSE nem Cronômetro */}
              {selectedWorkout.data.type === 'Descanso' ? (
                <div className={`p-8 rounded-[2rem] border text-center space-y-4 ${
                  isLight ? 'bg-blue-50 border-blue-200 text-slate-900' : 'bg-blue-500/10 border-blue-500/20 text-white'
                }`}>
                  <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto text-3xl">
                    🧘
                  </div>
                  <h4 className={`text-xl font-black italic uppercase tracking-tighter ${isLight ? 'text-blue-950' : 'text-white'}`}>Recuperação Necessária</h4>
                  <p className={`text-sm font-medium italic ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    O descanso é parte fundamental do seu treino. Aproveite para focar na mobilidade, sono de qualidade e hidratação.
                  </p>
                </div>
              ) : (
                <>
                  {/* Hub de Ritmos do Atleta */}
                  <div className="space-y-4">
                    <label className={`pro-label flex items-center gap-2 px-1 ${isLight ? 'text-slate-800 font-extrabold' : 'text-slate-200'}`}>
                      <Flag className="w-3.5 h-3.5 text-emerald-500" /> Seus Ritmos Alvo
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {paces.map((p, idx) => (
                        <div key={idx} className={`p-3 rounded-2xl border shadow-xs flex flex-col justify-center ${
                          isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white/5 border-white/5 text-white'
                        }`}>
                          <span className={`text-[8px] font-black uppercase tracking-wider mb-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{p.zone}</span>
                          <span className={`text-sm font-black italic tracking-tighter ${isLight ? 'text-emerald-700 font-extrabold' : 'text-emerald-400'}`}>{p.minPace} min/km</span>
                          {p.heartRateRange && (
                            <span className={`text-[7px] font-bold uppercase ${isLight ? 'text-slate-500' : 'text-slate-600'}`}>{p.heartRateRange} bpm</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Detalhamento de Exercícios (Elite Torneio Mode) */}
                  {localExercises.length > 0 && (
                    <div className="space-y-4">
                      <label className={`pro-label flex items-center gap-2 px-1 ${isLight ? 'text-slate-800 font-extrabold' : 'text-slate-200'}`}>
                        <Dumbbell className="w-3.5 h-3.5 text-purple-500" /> Detalhamento Técnico
                      </label>
                      <div className="space-y-3">
                        {localExercises.sort((a, b) => a.order - b.order).map((ex) => (
                          <div key={ex.id} className={`p-4 rounded-2xl border space-y-3 ${
                            isLight ? 'bg-slate-50 border-slate-200 text-slate-900 shadow-xs' : 'bg-white/5 border-white/5 text-white'
                          }`}>
                            <div className="flex justify-between items-center">
                              <h4 className={`text-xs font-black uppercase italic ${isLight ? 'text-slate-900' : 'text-white'}`}>{ex.name}</h4>
                              <span className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{ex.sets} séries</span>
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

                  {/* TREINO ESTRUTURADO (PRESCRIÇÃO DETALHADA) */}
                  {selectedWorkout.data.structuredWorkout && (
                    <div className={`space-y-3 p-5 rounded-[2rem] border shadow-xl transition-all ${
                      isLight 
                        ? 'bg-gradient-to-br from-blue-50/90 via-slate-50 to-emerald-50/90 border-blue-200 text-slate-900 shadow-md' 
                        : 'bg-gradient-to-br from-blue-950/40 via-slate-900 to-emerald-950/30 border-blue-500/30 text-white'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            isLight ? 'bg-blue-100 text-blue-700 border border-blue-300' : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            <Timer className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className={`text-xs font-black uppercase italic tracking-tight ${
                              isLight ? 'text-slate-900' : 'text-white'
                            }`}>
                              Prescrição Estruturada Detalhada
                            </h4>
                            <p className={`text-[9px] font-medium ${
                              isLight ? 'text-blue-950 font-bold' : 'text-blue-300'
                            }`}>
                              {formatStructuredWorkoutSummary(selectedWorkout.data.structuredWorkout)}
                            </p>
                          </div>
                        </div>
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase italic border ${
                          isLight ? 'bg-blue-100 text-blue-900 border-blue-300 font-extrabold' : 'bg-blue-500/20 text-blue-300 border-blue-400/20'
                        }`}>
                          {selectedWorkout.data.structuredWorkout.steps.length} Etapas
                        </span>
                      </div>

                      {/* Lista das etapas com ritmos */}
                      <div className={`space-y-1 p-3 rounded-2xl border max-h-40 overflow-y-auto custom-scrollbar ${
                        isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-black/30 border-white/5'
                      }`}>
                        {selectedWorkout.data.structuredWorkout.steps.map((step: any, sIdx: number) => (
                          <div key={step.id || sIdx} className={`flex justify-between items-center text-[10px] py-1 border-b last:border-0 font-mono ${
                            isLight ? 'border-slate-100' : 'border-white/5'
                          }`}>
                            <div className="flex items-center gap-2">
                              <span className={`text-[9px] ${isLight ? 'text-slate-400 font-bold' : 'text-slate-500'}`}>{sIdx + 1}.</span>
                              <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{step.name}</span>
                            </div>
                            <div className="text-right">
                              <span className={`font-bold ${isLight ? 'text-emerald-700 font-extrabold' : 'text-emerald-400'}`}>
                                {step.targetType === 'distance' ? `${step.targetValue}m` : `${Math.floor(step.targetValue / 60)}min`}
                              </span>
                              {step.targetPaceMin && (
                                <span className={`text-[9px] ml-1.5 ${isLight ? 'text-amber-800 font-extrabold' : 'text-amber-400'}`}>
                                  [{step.targetPaceMin}{step.targetPaceMax ? `-${step.targetPaceMax}` : ''}]
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>

                      {!showGpsTracker && (
                        <button
                          type="button"
                          onClick={() => setShowGpsTracker(true)}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-xs uppercase italic tracking-wider shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98] cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-white" /> Executar Treino Estruturado no GPS
                        </button>
                      )}
                    </div>
                  )}

                  {/* ROTA GPS DO TREINO (GPS AO VIVO OU GPX IMPORTADO) */}
                  <div className={`space-y-3 p-5 rounded-[2rem] border transition-colors ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900 shadow-xs' : 'bg-white/5 border-white/5 text-white'
                  }`}>
                    <div className="flex justify-between items-center px-1">
                      <label className={`pro-label flex items-center gap-2 !mb-0 ${isLight ? 'text-slate-800 font-extrabold' : 'text-slate-200'}`}>
                        <Navigation className="w-4 h-4 text-emerald-500" /> Rota & GPS do Treino
                      </label>
                      <span className={`text-[9px] font-black uppercase italic tracking-wider px-2 py-0.5 rounded-md border ${
                        isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        Opção 3 • Híbrido
                      </span>
                    </div>

                    {currentGpsRoute ? (
                      <div className="space-y-3">
                        <div className={`flex items-center justify-between p-3 rounded-2xl border ${
                          isLight ? 'bg-white border-slate-200 text-slate-900 shadow-xs' : 'bg-slate-950/60 border-white/5 text-white'
                        }`}>
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm ${
                              isLight ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-emerald-500/20 text-emerald-400'
                            }`}>
                              {currentGpsRoute.source === 'gpx_file' ? <FileCode2 className="w-4 h-4" /> : <Navigation className="w-4 h-4" />}
                            </div>
                            <div>
                              <p className={`text-xs font-black uppercase italic ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                {currentGpsRoute.totalDistanceKm} KM • {currentGpsRoute.avgPace}/km
                              </p>
                              <p className={`text-[9px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                                {currentGpsRoute.source === 'gpx_file' ? 'Importado via GPX' : 'Gravado com GPS do celular'}
                                {currentGpsRoute.elevationGainMeters ? ` • +${currentGpsRoute.elevationGainMeters}m altimetria` : ''}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm('Deseja desvincular esta rota GPS do treino?')) {
                                setCurrentGpsRoute(null);
                              }
                            }}
                            className="text-[9px] font-black text-red-500 hover:text-red-600 uppercase italic px-2 py-1 bg-red-500/10 rounded-lg border border-red-500/20"
                          >
                            Remover
                          </button>
                        </div>

                        {/* Mapa da Rota Vinculada */}
                        <WorkoutMap
                          points={
                            currentGpsRoute.points && currentGpsRoute.points.length > 0
                              ? currentGpsRoute.points
                              : currentGpsRoute.polyline
                              ? decodePolyline(currentGpsRoute.polyline)
                              : []
                          }
                          height="200px"
                          interactive={true}
                        />

                        {/* Botão de Compartilhar Card de Atividade */}
                        <button
                          type="button"
                          onClick={() => {
                            setShareWorkoutData({
                              title: selectedWorkout.data.customDescription?.slice(0, 45) || `${selectedWorkout.data.type || 'Treino'}`,
                              athleteName: activeAthlete?.name,
                              date: selectedWorkout.data.date || new Date().toLocaleDateString('pt-BR'),
                              distanceKm: currentGpsRoute?.totalDistanceKm || Number(actualDistanceValue) || selectedWorkout.data.distance || 0,
                              durationSeconds: currentGpsRoute?.durationSeconds || (currentGpsRoute?.totalDistanceKm ? Math.round(currentGpsRoute.totalDistanceKm * 300) : 1800),
                              avgPace: currentGpsRoute?.avgPace || (paces?.find(p => p.zone === 'Z2' || p.name.includes('Fácil'))?.minPace || '05:30'),
                              elevationGainMeters: currentGpsRoute?.elevationGainMeters,
                              avgHeartRate: currentGpsRoute?.avgHeartRate,
                              route: currentGpsRoute,
                              workoutType: selectedWorkout.data.type
                            });
                          }}
                          className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-xs uppercase italic tracking-wider shadow-lg shadow-emerald-950/20 transition-all active:scale-[0.98] cursor-pointer"
                        >
                          <Camera className="w-4 h-4" /> 📸 Postar Treino / Gerar Card Social
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {!showGpsTracker ? (
                          <div className={`p-4 rounded-2xl border flex flex-col gap-2 ${
                            isLight ? 'bg-white border-slate-200 text-slate-800 shadow-xs' : 'bg-slate-950/40 border-white/5 text-slate-300'
                          }`}>
                            <p className="text-[11px] font-medium leading-relaxed">
                              Grave o trajeto com o <strong className="text-emerald-600 dark:text-emerald-400">GPS do celular</strong> em tempo real ou suba o arquivo <strong className="text-emerald-600 dark:text-emerald-400">.GPX</strong> do seu relógio (Strava, Polar, Coros, Apple Watch ou qualquer relógio GPS).
                            </p>
                            <button
                              type="button"
                              onClick={() => setShowGpsTracker(true)}
                              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl flex items-center justify-center gap-2 text-xs uppercase italic tracking-wider shadow-md shadow-emerald-600/20 transition-all active:scale-[0.98]"
                            >
                              <Navigation className="w-4 h-4" /> Rastrear GPS / Importar GPX
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <GpsWorkoutTracker
                              workoutType={selectedWorkout.data.type}
                              plannedDistanceKm={selectedWorkout.data.distance}
                              existingRoute={currentGpsRoute}
                              structuredWorkout={selectedWorkout.data.structuredWorkout}
                              workoutDescription={selectedWorkout.data.customDescription}
                              athletePaces={paces}
                              onRouteCaptured={(route) => {
                                setCurrentGpsRoute(route);
                                setActualDistanceValue(String(route.totalDistanceKm));
                                setShowGpsTracker(false);
                              }}
                              onCancel={() => setShowGpsTracker(false)}
                            />
                            <button
                              type="button"
                              onClick={() => setShowGpsTracker(false)}
                              className={`w-full text-[10px] font-black uppercase py-2 ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
                            >
                              ✕ Cancelar Rastreamento
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Espaço para inserir a quilometragem real do Treino */}
                  <div className={`space-y-2 p-5 rounded-[2rem] border transition-colors ${
                    isLight ? 'bg-slate-50 border-slate-200 text-slate-900 shadow-xs' : 'bg-white/5 border-white/5 text-white'
                  }`}>
                    <div className="flex justify-between items-center px-1">
                      <label className={`pro-label flex items-center gap-2 ${isLight ? 'text-slate-800 font-extrabold' : 'text-slate-200'}`}>
                        <TrendingUp className="w-4 h-4 text-emerald-500" /> Distância Real Executada (KM)
                      </label>
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border italic ${
                        isLight ? 'bg-white text-slate-700 border-slate-200' : 'bg-white/5 text-slate-400 border-white/5'
                      }`}>
                        Planejado: {selectedWorkout.data.distance || 0} KM
                      </span>
                    </div>
                    <p className={`text-[9px] font-medium px-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Insira a quilometragem total real percorrida (preenchida automaticamente ao capturar o GPS).
                    </p>
                    <div className="relative mt-2">
                      <input 
                        type="text"
                        disabled={isSaving}
                        className={`pro-input w-full py-4 px-5 text-base font-black italic rounded-2xl outline-none transition-all pr-16 ${
                          isLight ? 'bg-white border-slate-300 text-emerald-800 focus:border-emerald-500 shadow-xs' : 'bg-white/5 border-white/10 text-emerald-400 focus:border-emerald-500/50'
                        }`}
                        placeholder="Ex: 12.5"
                        value={actualDistanceValue}
                        onChange={e => setActualDistanceValue(e.target.value)}
                      />
                      <div className={`absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black italic ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        KM REAL
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <label className={`pro-label flex items-center gap-2 ${isLight ? 'text-slate-800 font-extrabold' : 'text-slate-200'}`}>
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
                              ? 'bg-emerald-500 text-white border-emerald-500 scale-105 shadow-md' 
                              : (isLight 
                                  ? 'bg-white text-slate-700 border-slate-200 hover:border-emerald-500 hover:text-emerald-700' 
                                  : 'bg-white/5 text-slate-500 border-white/5 hover:border-emerald-500/50 hover:text-emerald-400')}
                          `}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Questionário Científico de Prontidão Diária */}
                  {activeAthlete.lastReadiness?.date === new Date().toISOString().split('T')[0] ? (
                    <div className={`p-5 rounded-3xl border space-y-2 text-center ${
                      isLight ? 'bg-emerald-50 border-emerald-200 text-slate-900' : 'bg-emerald-950/40 border-emerald-500/20 text-white'
                    }`}>
                      <p className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                        <CheckCircle className="w-4 h-4" /> Prontidão Diária Registrada!
                      </p>
                      <p className={`text-[11px] font-medium ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        Seu score de prontidão pré-treino para hoje é de <span className="text-emerald-700 dark:text-emerald-400 font-black">{activeAthlete.lastReadiness.readinessScore}%</span> ({activeAthlete.lastReadiness.readinessScore >= 70 ? 'Pronto para correr' : activeAthlete.lastReadiness.readinessScore >= 40 ? 'Moderar esforço' : 'Focar em recuperação'}). Ele já foi salvo e associado à sua fisiologia de hoje.
                      </p>
                    </div>
                  ) : (
                    <div className={`p-6 rounded-3xl border space-y-5 transition-colors ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900 shadow-xs' : 'bg-white/5 border-white/10 text-white'
                    }`}>
                      <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
                        <div className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-emerald-500" />
                          <h4 className={`text-sm font-black uppercase italic tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>Fisiologia & Prontidão Diária</h4>
                        </div>
                        <span className={`text-[8px] font-black px-2.5 py-1 rounded-lg border uppercase tracking-widest italic ${
                          isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          Científico
                        </span>
                      </div>

                      {/* 1. Qualidade do Sono */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>💤 Qualidade do Sono</span>
                          <span className={`text-[10px] font-black italic ${isLight ? 'text-emerald-800 font-extrabold' : 'text-emerald-400'}`}>
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
                                  : (isLight ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100' : 'bg-white/5 text-slate-400 border-transparent hover:border-white/10')
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
                          <span className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>🧠 Estresse Mental</span>
                          <span className={`text-[10px] font-black italic ${isLight ? 'text-amber-800 font-extrabold' : 'text-amber-400'}`}>
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
                                  : (isLight ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100' : 'bg-white/5 text-slate-400 border-transparent hover:border-white/10')
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
                          <span className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>🩹 Dor Muscular (DOMS)</span>
                          <span className={`text-[10px] font-black italic ${isLight ? 'text-red-700 font-extrabold' : 'text-red-400'}`}>
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
                                  : (isLight ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100' : 'bg-white/5 text-slate-400 border-transparent hover:border-white/10')
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
                          <span className={`text-[9px] font-black uppercase tracking-widest ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>🔥 Humor / Disposição</span>
                          <span className={`text-[10px] font-black italic ${isLight ? 'text-blue-800 font-extrabold' : 'text-blue-400'}`}>
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
                                  : (isLight ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100' : 'bg-white/5 text-slate-400 border-transparent hover:border-white/10')
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 5. Menstrual Cycle Tracker (Feminino com trackMenstrual ativo) */}
                      {activeAthlete.gender === 'female' && activeAthlete.trackMenstrual !== false && (
                        <div className={`pt-4 border-t space-y-3 ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
                          <div className="flex justify-between items-center">
                            <span className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest flex items-center gap-1">🌸 Fase do Ciclo Menstrual</span>
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wide ${
                              isLight ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-purple-500/20 text-purple-300 border-purple-500/20'
                            }`}>
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
                                    : (isLight ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100' : 'bg-white/5 text-slate-300 border-transparent hover:border-white/10')
                                }`}
                              >
                                <div className="flex items-center gap-1.5 font-black text-[11px]">
                                  <span>{item.icon}</span>
                                  <span className="truncate">{item.label}</span>
                                </div>
                                <span className={`text-[8px] font-medium mt-1 leading-none ${menstrualPhaseValue === item.phase ? 'text-purple-100' : (isLight ? 'text-slate-500' : 'text-slate-500')}`}>
                                  {item.desc}
                                </span>
                              </button>
                            ))}
                          </div>

                          {/* Science Insights for Menstrual Cycle */}
                          {menstrualPhaseValue !== 'none' && (
                            <div className={`border p-3.5 rounded-2xl space-y-1.5 text-left animate-fade-in ${
                              isLight ? 'bg-purple-50 border-purple-200 text-purple-950' : 'bg-purple-950/20 border-purple-500/10 text-purple-200'
                            }`}>
                              <p className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest italic flex items-center gap-1">
                                💡 Insight Científico
                              </p>
                              <p className={`text-[10px] font-medium italic leading-relaxed ${isLight ? 'text-purple-900' : 'text-purple-200'}`}>
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
                        <span className={`text-[10px] font-black uppercase tracking-widest italic ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Cronômetro de Suporte</span>
                        <span className={`text-[8px] font-bold uppercase italic ${isLight ? 'text-slate-500' : 'text-slate-600'}`}>Use para marcar intervalos ou tempo total</span>
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

            <div className={`p-6 md:p-8 border-t flex-shrink-0 font-sans ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-white/5'
            }`}>
              <button 
                onClick={handleToggleComplete} 
                disabled={isSaving}
                className={`w-full py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 cursor-pointer
                  ${saveSuccess ? 'bg-emerald-500 text-white' : 
                    selectedWorkout.data.type === 'Descanso' ? 'bg-blue-600 text-white hover:bg-blue-700' : (isLight ? 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95' : 'bg-emerald-950 text-white hover:bg-black active:scale-95')}
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
        </div>,
        document.body
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

      {/* Portal de Impressão e Exportação de Imagens */}
      {activeAthlete && portalRoot && createPortal(
        <PrintLayout 
          athlete={activeAthlete} 
          plan={athletePlan?.weeks || []} 
          paces={paces} 
          goal={athletePlan?.specificGoal || "Plano de Treinamento e Performance"} 
          totalWeeks={athletePlan?.weeks?.length || 0}
        />,
        portalRoot
      )}

      {/* Modal de Compartilhamento Social de Treino (Card / Story) */}
      {shareWorkoutData && (
        <WorkoutShareModal
          data={shareWorkoutData}
          onClose={() => setShareWorkoutData(null)}
        />
      )}
    </div>
  );
};

export default AthletePortal;

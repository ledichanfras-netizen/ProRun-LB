
import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Share2,
  Plus,
  Trash,
  Upload,
  Shield,
  Moon,
  Brain,
  Flame,
  Smile,
  Calendar,
  HeartPulse,
  BatteryCharging,
  Info
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

const formatSecondsToTimeString = (secs: number): string => {
  if (isNaN(secs) || secs <= 0) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.round(secs % 60);
  if (h > 0) {
    return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  }
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const calculatePace = (distanceStr: string, durationStr: string): string => {
  const distance = parseFloat(String(distanceStr).replace(',', '.'));
  if (isNaN(distance) || distance <= 0) return '--:--';
  
  let seconds = 0;
  const parts = String(durationStr).trim().split(':').map(Number);
  if (parts.some(isNaN) || parts.length === 0) return '--:--';
  
  if (parts.length === 1) {
    // just minutes
    seconds = parts[0] * 60;
  } else if (parts.length === 2) {
    // MM:SS
    seconds = parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    // HH:MM:SS
    seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else {
    return '--:--';
  }
  
  if (seconds <= 0) return '--:--';
  
  const paceSecondsPerKm = seconds / distance;
  const mins = Math.floor(paceSecondsPerKm / 60);
  const secs = Math.round(paceSecondsPerKm % 60);
  
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const parseDurationStringToSeconds = (durationStr: string): number => {
  const parts = String(durationStr).trim().split(':').map(Number);
  if (parts.some(isNaN) || parts.length === 0) return 0;
  if (parts.length === 1) return parts[0] * 60;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
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
  const [actualDurationValue, setActualDurationValue] = useState<string>('');
  const [currentGpsRoute, setCurrentGpsRoute] = useState<any>(null);
  const [showGpsTracker, setShowGpsTracker] = useState(false);
  const [localSteps, setLocalSteps] = useState<any[]>([]);
  
  // Scientific Daily Readiness States
  const [sleepValue, setSleepValue] = useState<number>(4);
  const [stressValue, setStressValue] = useState<number>(2);
  const [sorenessValue, setSorenessValue] = useState<number>(2);
  const [moodValue, setMoodValue] = useState<number>(4);
  const [menstrualPhaseValue, setMenstrualPhaseValue] = useState<'follicular' | 'ovulatory' | 'luteal' | 'menstrual' | 'none'>('none');

  // Standalone Daily Readiness Panel States (Pre-Workout Evaluation)
  const [portalSleepHours, setPortalSleepHours] = useState<number>(7.5); // Horas de Sono
  const [portalBedTime, setPortalBedTime] = useState<string>('22:30'); // Horário que foi dormir
  const [portalWakeTime, setPortalWakeTime] = useState<string>('06:30'); // Horário que acordou
  const [portalSleep, setPortalSleep] = useState<number>(8); // Qualidade do Sono (0 a 10)
  const [portalStress, setPortalStress] = useState<number>(2); // Estresse Mental (0 a 10)
  const [portalSoreness, setPortalSoreness] = useState<number>(2); // Dor Muscular (0 a 10)
  const [portalMood, setPortalMood] = useState<number>(8); // Humor para Treino (0 a 10)
  const [portalMenstrual, setPortalMenstrual] = useState<'follicular' | 'ovulatory' | 'luteal' | 'menstrual' | 'none'>('none');
  const [portalIsSubmitting, setPortalIsSubmitting] = useState(false);
  const [showPortalForm, setShowPortalForm] = useState(false);
  const [showHistoryInModal, setShowHistoryInModal] = useState(false);
  const [portalDate, setPortalDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [readinessChartTab, setReadinessChartTab] = useState<'readiness' | 'multi'>('readiness');

  // Post-Workout Completion Prompt & Photo Capture States
  const [completedWorkoutPrompt, setCompletedWorkoutPrompt] = useState<{
    workout: any;
    distanceKm: number;
    durationSeconds: number;
    avgPace: string;
    route?: any;
    workoutType?: string;
    rpe?: number;
  } | null>(null);

  const completionCameraInputRef = useRef<HTMLInputElement>(null);
  const completionGalleryInputRef = useRef<HTMLInputElement>(null);

  const handleCompletionPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !completedWorkoutPrompt) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const photoUrl = event.target?.result as string;
      setShareWorkoutData({
        title: completedWorkoutPrompt.workout.customDescription?.slice(0, 45) || `${completedWorkoutPrompt.workout.type || 'Treino'}`,
        athleteName: activeAthlete?.name,
        date: completedWorkoutPrompt.workout.date || new Date().toLocaleDateString('pt-BR'),
        distanceKm: completedWorkoutPrompt.distanceKm,
        durationSeconds: completedWorkoutPrompt.durationSeconds,
        avgPace: completedWorkoutPrompt.avgPace,
        elevationGainMeters: completedWorkoutPrompt.route?.elevationGainMeters,
        avgHeartRate: completedWorkoutPrompt.route?.avgHeartRate,
        route: completedWorkoutPrompt.route,
        workoutType: completedWorkoutPrompt.workout.type,
        initialPhotoUrl: photoUrl,
        rpe: completedWorkoutPrompt.rpe
      });
      setCompletedWorkoutPrompt(null);
    };
    reader.readAsDataURL(file);
  };

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

  const calculateHoursDiff = (bedTime: string, wakeTime: string): number => {
    if (!bedTime || !wakeTime) return 8;
    const [bedH, bedM] = bedTime.split(':').map(Number);
    const [wakeH, wakeM] = wakeTime.split(':').map(Number);
    if (isNaN(bedH) || isNaN(bedM) || isNaN(wakeH) || isNaN(wakeM)) return 8;

    let diffMins = (wakeH * 60 + wakeM) - (bedH * 60 + bedM);
    if (diffMins < 0) {
      // Slept before midnight, woke up after midnight
      diffMins += 24 * 60;
    }
    const hours = diffMins / 60;
    return Math.round(hours * 10) / 10;
  };

  useEffect(() => {
    const hours = calculateHoursDiff(portalBedTime, portalWakeTime);
    setPortalSleepHours(hours);
  }, [portalBedTime, portalWakeTime]);

  useEffect(() => {
    if (!activeAthlete) return;
    const history = activeAthlete.readinessHistory || [];
    const existing = history.find(entry => entry.date === portalDate);
    if (existing) {
      setPortalSleepHours(existing.sleepHours !== undefined ? existing.sleepHours : 7.5);
      setPortalBedTime(existing.bedTime || '22:30');
      setPortalWakeTime(existing.wakeTime || '06:30');
      const rawSleep = existing.sleepScore !== undefined ? existing.sleepScore : 8;
      setPortalSleep(rawSleep <= 5 ? Math.min(10, Math.round(rawSleep * 2)) : rawSleep);

      const rawStress = existing.stressScore !== undefined ? existing.stressScore : 2;
      setPortalStress(rawStress <= 5 ? Math.min(10, Math.round(rawStress * 2)) : rawStress);

      const rawSoreness = existing.sorenessScore !== undefined ? existing.sorenessScore : 2;
      setPortalSoreness(rawSoreness <= 5 ? Math.min(10, Math.round(rawSoreness * 2)) : rawSoreness);

      const rawMood = existing.moodScore !== undefined ? existing.moodScore : 8;
      setPortalMood(rawMood <= 5 ? Math.min(10, Math.round(rawMood * 2)) : rawMood);

      setPortalMenstrual(existing.menstrualPhase || 'none');
    } else {
      // If no entry exists for this date, try to fall back to the last registered readiness or default values
      const lastR = activeAthlete.lastReadiness;
      setPortalSleepHours(lastR?.sleepHours !== undefined ? lastR.sleepHours : 7.5);
      setPortalBedTime(lastR?.bedTime || '22:30');
      setPortalWakeTime(lastR?.wakeTime || '06:30');

      const rawSleep = lastR?.sleepScore !== undefined ? lastR.sleepScore : 8;
      setPortalSleep(rawSleep <= 5 ? Math.min(10, Math.round(rawSleep * 2)) : rawSleep);

      const rawStress = lastR?.stressScore !== undefined ? lastR.stressScore : 2;
      setPortalStress(rawStress <= 5 ? Math.min(10, Math.round(rawStress * 2)) : rawStress);

      const rawSoreness = lastR?.sorenessScore !== undefined ? lastR.sorenessScore : 2;
      setPortalSoreness(rawSoreness <= 5 ? Math.min(10, Math.round(rawSoreness * 2)) : rawSoreness);

      const rawMood = lastR?.moodScore !== undefined ? lastR.moodScore : 8;
      setPortalMood(rawMood <= 5 ? Math.min(10, Math.round(rawMood * 2)) : rawMood);

      setPortalMenstrual(lastR?.menstrualPhase || 'none');
    }
  }, [portalDate, activeAthlete?.id]);

  const handleSavePortalReadiness = async () => {
    if (!activeAthlete) return;
    setPortalIsSubmitting(true);
    try {
      // Calculate advanced readiness score across the 0-10 pillars + Sleep Duration
      const sleepHoursPct = Math.min(100, Math.max(0, Math.round((portalSleepHours / 8) * 100)));
      const sleepQualityPct = Math.min(100, Math.max(0, (portalSleep / 10) * 100));
      const stressPct = Math.min(100, Math.max(0, ((10 - portalStress) / 10) * 100));
      const sorenessPct = Math.min(100, Math.max(0, ((10 - portalSoreness) / 10) * 100));
      const moodPct = Math.min(100, Math.max(0, (portalMood / 10) * 100));

      const calculatedScore = Math.round(
        (sleepQualityPct * 0.25) + 
        (sleepHoursPct * 0.20) + 
        (sorenessPct * 0.20) + 
        (stressPct * 0.20) + 
        (moodPct * 0.15)
      );

      const history = activeAthlete.readinessHistory ? [...activeAthlete.readinessHistory] : [];
      const existingIndex = history.findIndex(entry => entry.date === portalDate);
      const newEntry = {
        id: existingIndex >= 0 ? history[existingIndex].id : Math.random().toString(36).substring(2, 9),
        date: portalDate,
        sleepHours: portalSleepHours,
        bedTime: portalBedTime,
        wakeTime: portalWakeTime,
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
          pse: latestEntry.pse,
          sleepHours: latestEntry.sleepHours,
          bedTime: latestEntry.bedTime,
          wakeTime: latestEntry.wakeTime,
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
          pse: latestEntry.pse,
          sleepHours: latestEntry.sleepHours,
          bedTime: latestEntry.bedTime,
          wakeTime: latestEntry.wakeTime,
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

  const handleToggleComplete = async (shouldCloseAfterSave: boolean = false) => {
    if (!selectedWorkout || !activeAthlete || isSaving) return;

    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      const wasCompletedBefore = Boolean(selectedWorkout.data.completed);
      const newStatus = shouldCloseAfterSave ? selectedWorkout.data.completed : !selectedWorkout.data.completed;
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
        currentGpsRoute,
        localSteps,
        actualDurationValue
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
      
      // Update local state instantly so UI matches
      setSelectedWorkout(prev => prev ? {
        ...prev,
        data: {
          ...prev.data,
          completed: newStatus,
          feedback: feedbackText,
          rpe: rpeValue,
          actualDistance: parsedDistance,
          actualDuration: actualDurationValue
        }
      } : null);

      // Snapshot for post-workout sharing prompt if completed
      const completedWorkoutSnapshot = (newStatus && selectedWorkout) ? {
        workout: selectedWorkout.data,
        distanceKm: parsedDistance || currentGpsRoute?.totalDistanceKm || selectedWorkout.data.actualDistance || selectedWorkout.data.distance || 0,
        durationSeconds: actualDurationValue !== '' 
          ? parseDurationStringToSeconds(actualDurationValue) 
          : (currentGpsRoute?.durationSeconds || (selectedWorkout.data.actualDuration ? parseDurationStringToSeconds(selectedWorkout.data.actualDuration) : (selectedWorkout.data.distance ? Math.round(selectedWorkout.data.distance * 300) : 1800))),
        avgPace: calculatePace(
          String(parsedDistance || currentGpsRoute?.totalDistanceKm || selectedWorkout.data.actualDistance || selectedWorkout.data.distance || 0),
          actualDurationValue !== '' ? actualDurationValue : (selectedWorkout.data.actualDuration || formatSecondsToTimeString(currentGpsRoute?.durationSeconds || 1800))
        ),
        route: currentGpsRoute || selectedWorkout.data.gpsRoute,
        workoutType: selectedWorkout.data.type,
        rpe: rpeValue || selectedWorkout.data.rpe
      } : null;

      setTimeout(() => {
        setIsSaving(false);
        setSaveSuccess(false);
        if (shouldCloseAfterSave) {
          setSelectedWorkout(null); 
          setFeedbackText('');
          setRpeValue(0);
          setActualDistanceValue('');
          setActualDurationValue('');
          setCurrentGpsRoute(null);
          setShowGpsTracker(false);

          if (completedWorkoutSnapshot && selectedWorkout.data.type !== 'Descanso') {
            setCompletedWorkoutPrompt(null);
            setShareWorkoutData({
              title: completedWorkoutSnapshot.workout.customDescription?.slice(0, 45) || `${completedWorkoutSnapshot.workout.type || 'Treino'}`,
              athleteName: activeAthlete?.name,
              date: completedWorkoutSnapshot.workout.date || new Date().toLocaleDateString('pt-BR'),
              distanceKm: completedWorkoutSnapshot.distanceKm,
              durationSeconds: completedWorkoutSnapshot.durationSeconds,
              avgPace: completedWorkoutSnapshot.avgPace,
              elevationGainMeters: completedWorkoutSnapshot.route?.elevationGainMeters,
              avgHeartRate: completedWorkoutSnapshot.route?.avgHeartRate,
              route: completedWorkoutSnapshot.route,
              workoutType: completedWorkoutSnapshot.workout.type,
              initialBackgroundType: 'photo',
              rpe: completedWorkoutSnapshot.rpe
            });
          }
        }
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
    let initialDuration = '';
    if (workout.actualDuration) {
      initialDuration = String(workout.actualDuration);
    } else if (workout.gpsRoute?.totalDurationSeconds) {
      initialDuration = formatSecondsToTimeString(workout.gpsRoute.totalDurationSeconds);
    } else if (workout.durationMinutes) {
      initialDuration = `${workout.durationMinutes}:00`;
    }
    setActualDurationValue(initialDuration);
    setSleepValue(workout.sleepScore || activeAthlete?.lastReadiness?.sleepScore || 4);
    setStressValue(workout.stressScore || activeAthlete?.lastReadiness?.stressScore || 2);
    setSorenessValue(workout.sorenessScore || activeAthlete?.lastReadiness?.sorenessScore || 2);
    setMoodValue(workout.moodScore || activeAthlete?.lastReadiness?.moodScore || 4);
    setMenstrualPhaseValue(workout.menstrualPhase || (activeAthlete?.lastReadiness?.menstrualPhase as any) || 'none');
    setCurrentGpsRoute(workout.gpsRoute || null);
    setLocalSteps(workout.structuredWorkout?.steps ? JSON.parse(JSON.stringify(workout.structuredWorkout.steps)) : []);
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
          {/* CARD MENOR DE PRONTIDÃO DIÁRIA (CONFORME O ANEXO, SUPORTANDO LIGHT/DARK MODE) */}
          {(() => {
            const todayDateStr = new Date().toISOString().split('T')[0];
            const todayReadiness = (activeAthlete?.readinessHistory || []).find(e => e.date === todayDateStr);

            // Get configuration for rendering based on readiness score
            const getReadinessConfig = (readiness: any) => {
              if (!readiness) {
                return {
                  statusLabel: 'AVALIAÇÃO PENDENTE',
                  scoreText: '--',
                  subLabel: 'PREENCHA PARA ANALISAR',
                  advice: 'Por favor, preencha a sua prontidão diária para obtermos o cálculo preciso do seu estado físico e mental, gerando as orientações e o aconselhamento para o seu treino de hoje.',
                  colorClass: 'text-amber-500 dark:text-amber-400',
                  pillBgClass: isLight ? 'bg-white border-slate-200 text-slate-800 shadow-sm' : 'bg-slate-900 border-slate-800 text-white',
                  icon: <Zap className="w-5 h-5 animate-pulse text-amber-500" />
                };
              }

              const score = readiness.readinessScore;
              if (score >= 85) {
                return {
                  statusLabel: 'PRONTIDÃO EXCELENTE (MÁXIMA)',
                  scoreText: `${score}`,
                  subLabel: 'PLANILHA 100% LIBERADA',
                  advice: 'Condição física e cognitiva excelentes. O treino planejado pode ser seguido integralmente com intensidade máxima se desejar. Atleta pronto para treinar forte!',
                  colorClass: 'text-emerald-500 dark:text-emerald-400',
                  pillBgClass: isLight ? 'bg-white border-slate-200 text-slate-800 shadow-sm' : 'bg-slate-900 border-slate-800 text-white',
                  icon: <Check className="w-5 h-5 text-emerald-600" />
                };
              } else if (score >= 70) {
                return {
                  statusLabel: 'BOA PRONTIDÃO (REGULAR)',
                  scoreText: `${score}`,
                  subLabel: 'PLANILHA 100% LIBERADA',
                  advice: 'Condição física e tônus muscular adequados. O treino planejado pode ser seguido integralmente sem alterações estruturais. Monitorar apenas caso o atleta aponte desconforto muscular localizado durante o aquecimento.',
                  colorClass: 'text-[#0fa374] dark:text-emerald-400',
                  pillBgClass: isLight ? 'bg-white border-slate-200 text-slate-800 shadow-sm' : 'bg-slate-900 border-slate-800 text-white',
                  icon: <Check className="w-5 h-5 text-[#0fa374]" />
                };
              } else if (score >= 40) {
                return {
                  statusLabel: 'PRONTIDÃO MODERADA (ALERTA)',
                  scoreText: `${score}`,
                  subLabel: 'TREINAR COM CAUTELA',
                  advice: 'Sinais moderados de cansaço, sono parcial ou dores localizadas. O treino planejado pode ser realizado, mas evite desgastes extremos. Ajuste o ritmo se as pernas parecerem excessivamente pesadas.',
                  colorClass: 'text-amber-500 dark:text-amber-400',
                  pillBgClass: isLight ? 'bg-white border-slate-200 text-slate-800 shadow-sm' : 'bg-slate-900 border-slate-800 text-white',
                  icon: <Check className="w-5 h-5 text-amber-500" />
                };
              } else {
                return {
                  statusLabel: 'PRONTIDÃO BAIXA (FADIGADO)',
                  scoreText: `${score}`,
                  subLabel: 'TREINO REGENERATIVO OU REPOUSO',
                  advice: 'Fadiga crítica detectada (sono insuficiente, dor muscular severa ou cansaço acumulado). Fortemente recomendado adaptar o treino para rodagem regenerativa muito leve ou descanso ativo/total, visando a prevenção de lesões.',
                  colorClass: 'text-rose-500 dark:text-rose-400',
                  pillBgClass: isLight ? 'bg-white border-slate-200 text-slate-800 shadow-sm' : 'bg-slate-900 border-slate-800 text-white',
                  icon: <Check className="w-5 h-5 text-rose-500" />
                };
              }
            };

            const config = getReadinessConfig(todayReadiness);

            return (
              <div 
                onClick={() => {
                  setPortalDate(todayDateStr);
                  setShowPortalForm(true);
                }}
                className={`relative overflow-hidden rounded-[2.5rem] p-6 sm:p-8 border flex flex-col items-center justify-center text-center transition-all space-y-6 shadow-md cursor-pointer group hover:scale-[1.01] ${
                  isLight 
                    ? 'bg-[#eefcf7] border-[#ccf2e5] text-slate-800' 
                    : 'bg-slate-950/40 border-emerald-500/20 text-white'
                }`}
              >
                {/* Ambient Glow */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl pointer-events-none rounded-full" />

                {/* Checked Circle / Beacon */}
                <div className="relative z-10">
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm border ${
                    isLight 
                      ? 'bg-[#ccf2e5] border-emerald-300/40 text-emerald-600' 
                      : 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                  }`}>
                    {config.icon}
                  </div>
                </div>

                {/* Pill Status Badge */}
                <div className={`px-6 py-2 rounded-full font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-sm border relative z-10 transition-colors ${config.pillBgClass}`}>
                  {config.statusLabel}
                </div>

                {/* Score Big Display */}
                <div className="space-y-1.5 relative z-10">
                  <span className={`text-[10px] font-black uppercase tracking-[0.25em] block ${
                    isLight ? 'text-slate-500' : 'text-slate-400'
                  }`}>
                    Score de Prontidão
                  </span>
                  <h2 className={`text-6xl sm:text-7xl font-black font-mono leading-none tracking-tight transition-colors ${config.colorClass}`}>
                    {config.scoreText}<span className="text-3xl font-bold ml-0.5">%</span>
                  </h2>
                </div>

                {/* Subtitle / Planilha Status */}
                <div className={`text-xs font-black uppercase tracking-[0.18em] relative z-10 transition-colors ${config.colorClass}`}>
                  {config.subLabel}
                </div>

                {/* Orientação ao Treinador Card */}
                <div className={`w-full p-4 sm:p-5 rounded-[1.8rem] border text-left space-y-2.5 transition-colors relative z-10 ${
                  isLight 
                    ? 'bg-[#dbf7ed] border-[#c0ebd9] text-emerald-900 shadow-sm' 
                    : 'bg-emerald-950/25 border-emerald-500/10 text-emerald-200'
                }`}>
                  <h4 className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-4 h-4 text-emerald-500 dark:text-emerald-400 fill-emerald-500/20" /> 
                    Orientação ao Treinador
                  </h4>
                  <div className={`h-px ${isLight ? 'bg-emerald-800/10' : 'bg-emerald-500/10'}`} />
                  <p className="text-[11px] sm:text-xs font-semibold leading-relaxed">
                    {config.advice}
                  </p>
                </div>

                {/* Action Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPortalDate(todayDateStr);
                    setShowPortalForm(true);
                  }}
                  className={`w-full py-4 text-center rounded-[1.5rem] font-black uppercase italic tracking-widest text-[11px] border transition-all cursor-pointer relative z-10 ${
                    isLight 
                      ? 'bg-white hover:bg-[#e4f6f0] border-emerald-300 text-emerald-700 shadow-sm active:scale-[0.98]' 
                      : 'bg-slate-900/60 hover:bg-slate-900 border-emerald-500/20 text-emerald-400 active:scale-[0.98]'
                  }`}
                >
                  {todayReadiness ? 'Atualizar Prontidão' : 'Preencher Prontidão'}
                </button>
              </div>
            );
          })()}

          {/* MODAL DO FORMULÁRIO DE PRONTIDÃO DIÁRIA */}
          {showPortalForm && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in">
              <div className={`border rounded-[2.2rem] p-5 sm:p-7 shadow-2xl space-y-5 max-w-xl w-full my-auto max-h-[92vh] overflow-y-auto custom-scrollbar relative ${
                isLight ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-900 border-slate-700/80 text-white'
              }`}>
                
                {/* Header */}
                <div className={`flex items-center justify-between border-b pb-4 sticky top-0 backdrop-blur-sm z-20 ${
                  isLight ? 'bg-white/95 border-slate-100 text-slate-800' : 'bg-slate-900/95 border-white/10 text-white'
                }`}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-500">
                      <Activity className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className={`text-sm sm:text-base font-black uppercase tracking-tight italic ${isLight ? 'text-slate-800' : 'text-white'}`}>
                        Avaliação de Prontidão Diária
                      </h3>
                      <p className={`text-[10px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        Dados fisiológicos enviados em tempo real ao Treinador
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPortalForm(false)}
                    className={`p-1.5 rounded-xl transition-colors ${
                      isLight ? 'text-slate-400 hover:text-slate-800 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* 1. SELETOR DE DATA */}
                <div className={`space-y-1.5 p-3.5 rounded-2xl border ${
                  isLight ? 'bg-slate-50 border-slate-200/80' : 'bg-slate-950/70 border-white/5'
                }`}>
                  <div className="flex justify-between items-center">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      📅 Data da Avaliação
                    </span>
                    <button
                      type="button"
                      onClick={() => setPortalDate(new Date().toISOString().split('T')[0])}
                      className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider hover:underline"
                    >
                      Hoje
                    </button>
                  </div>
                  <input 
                    type="date"
                    value={portalDate}
                    onChange={(e) => setPortalDate(e.target.value)}
                    className={`w-full rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-emerald-500 ${
                      isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-white/10 text-white'
                    }`}
                  />
                </div>

                {/* 2. QUESTIONÁRIO */}
                <div className="space-y-4">
                  {/* 1. TEMPO E HORÁRIOS DE SONO */}
                  <div className={`space-y-2 p-4 rounded-2xl border ${
                    isLight ? 'bg-blue-500/5 border-blue-200' : 'bg-slate-950/70 border-blue-500/20'
                  }`}>
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black text-blue-600 dark:text-blue-300 uppercase tracking-wide flex items-center gap-1.5">
                        <Timer className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
                        1. Tempo & Horários de Sono
                      </label>
                      <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-300 font-mono border border-blue-500/20 dark:border-blue-500/30">
                        {portalSleepHours}h calculadas
                      </span>
                    </div>

                    <p className={`text-[10.5px] font-medium leading-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Informe os horários aproximados que foi dormir e acordou. O sistema calculará automaticamente o tempo correto de sono fisiológico.
                    </p>

                    {/* Bedtime / Wake-up time inputs side-by-side */}
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          🛌 Fui Dormir
                        </span>
                        <input
                          type="time"
                          value={portalBedTime}
                          onChange={(e) => setPortalBedTime(e.target.value)}
                          className={`w-full rounded-xl px-3 py-2 text-sm font-black focus:outline-none focus:border-blue-500 text-center font-mono cursor-pointer ${
                            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-white/10 text-white'
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          🌅 Acordei às
                        </span>
                        <input
                          type="time"
                          value={portalWakeTime}
                          onChange={(e) => setPortalWakeTime(e.target.value)}
                          className={`w-full rounded-xl px-3 py-2 text-sm font-black focus:outline-none focus:border-blue-500 text-center font-mono cursor-pointer ${
                            isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-white/10 text-white'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Preset Chips */}
                    <div className="space-y-1.5 pt-2">
                      <span className={`text-[9px] font-bold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        Atalhos Rápidos de Horário:
                      </span>
                      <div className="flex items-center gap-1 flex-wrap">
                        {[
                          { bed: '22:00', wake: '06:00', label: '22h às 6h (8h)' },
                          { bed: '22:30', wake: '06:30', label: '22:30 às 6:30 (8h)' },
                          { bed: '23:00', wake: '07:00', label: '23h às 7h (8h)' },
                          { bed: '23:30', wake: '07:00', label: '23:30 às 7h (7.5h)' },
                          { bed: '00:00', wake: '07:30', label: '00h às 7:30 (7.5h)' }
                        ].map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setPortalBedTime(preset.bed);
                              setPortalWakeTime(preset.wake);
                            }}
                            className={`px-2 py-1 rounded-lg text-[9.5px] font-bold border transition-all cursor-pointer ${
                              portalBedTime === preset.bed && portalWakeTime === preset.wake
                                ? 'bg-blue-500 text-white border-blue-400 font-black'
                                : isLight
                                  ? 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                                  : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* 2. QUALIDADE DO SONO: 0 a 10 */}
                  <div className={`space-y-2 p-4 rounded-2xl border ${
                    isLight ? 'bg-emerald-500/5 border-emerald-200' : 'bg-slate-950/70 border-emerald-500/20'
                  }`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-black uppercase tracking-wide flex items-center gap-1.5 ${isLight ? 'text-emerald-700' : 'text-emerald-300'}`}>
                        <Moon className="w-3.5 h-3.5 text-emerald-500" />
                        2. Qualidade do Sono (0 a 10)
                      </label>
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg font-mono border ${
                        isLight ? 'bg-emerald-500/10 text-emerald-700 border-emerald-300/40' : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                      }`}>
                        {portalSleep}/10
                      </span>
                    </div>

                    <p className={`text-[10.5px] font-medium leading-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Avalie a profundidade e o poder de restauração da noite dormida. 0 é insônia total ou sono péssimo; 10 é sono profundo, ininterrupto e revigorante.
                    </p>

                    <div className="grid grid-cols-6 sm:grid-cols-11 gap-1 pt-1">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                        const isSelected = portalSleep === val;
                        let activeColor = 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400 font-black';
                        if (val >= 7 && val <= 8) activeColor = 'bg-teal-500 text-slate-950 ring-2 ring-teal-400 font-black';
                        if (val >= 5 && val <= 6) activeColor = 'bg-amber-500 text-slate-950 ring-2 ring-amber-400 font-black';
                        if (val >= 3 && val <= 4) activeColor = 'bg-orange-500 text-white ring-2 ring-orange-400 font-black';
                        if (val >= 0 && val <= 2) activeColor = 'bg-rose-500 text-white ring-2 ring-rose-400 font-black';

                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setPortalSleep(val)}
                            className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? activeColor
                                : isLight
                                  ? 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                                  : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>

                    <div className={`text-[10px] font-bold p-2.5 rounded-xl border flex items-center justify-between ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-white/5 border-white/5 text-slate-300'
                    }`}>
                      <span>Percepção:</span>
                      <span className="font-black italic">
                        {portalSleep === 10 && '🌟 10 - Sono Perfeito & Profundamente Reparador'}
                        {portalSleep >= 8 && portalSleep <= 9 && '🛌 8 a 9 - Muito Bom / Acordou descansado e restaurado'}
                        {portalSleep >= 6 && portalSleep <= 7 && '💤 6 a 7 - Razoável / Poucas interrupções'}
                        {portalSleep >= 4 && portalSleep <= 5 && '🥱 4 a 5 - Ruim / Sono agitado ou fragmentado'}
                        {portalSleep >= 2 && portalSleep <= 3 && '😴 2 a 3 - Muito Ruim / Acordou cansado'}
                        {portalSleep >= 0 && portalSleep <= 1 && '🚨 0 a 1 - Péssimo / Insônia severa ou noite em claro'}
                      </span>
                    </div>

                    <div className={`flex justify-between text-[9px] font-bold px-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      <span>0 - Péssimo / Insônia</span>
                      <span>10 - Restaurador / Perfeito</span>
                    </div>
                  </div>

                  {/* 3. ESTRESSE MENTAL & ROTINA: 0 a 10 */}
                  <div className={`space-y-2 p-4 rounded-2xl border ${
                    isLight ? 'bg-amber-500/5 border-amber-200' : 'bg-slate-950/70 border-amber-500/20'
                  }`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-black uppercase tracking-wide flex items-center gap-1.5 ${isLight ? 'text-amber-700' : 'text-amber-300'}`}>
                        <Brain className="w-3.5 h-3.5 text-amber-500" />
                        3. Estresse Mental & Rotina (0 a 10)
                      </label>
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg font-mono border ${
                        isLight ? 'bg-amber-500/10 text-amber-700 border-amber-300/40' : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                      }`}>
                        {portalStress}/10
                      </span>
                    </div>

                    <p className={`text-[10.5px] font-medium leading-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Nível de sobrecarga mental, preocupações de trabalho ou vida pessoal. 0 é tranquilidade plena (Zen); 10 é estresse extremo e esgotamento mental.
                    </p>

                    <div className="grid grid-cols-6 sm:grid-cols-11 gap-1 pt-1">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                        const isSelected = portalStress === val;
                        let activeColor = 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400 font-black';
                        if (val >= 2 && val <= 3) activeColor = 'bg-teal-500 text-slate-950 ring-2 ring-teal-400 font-black';
                        if (val >= 4 && val <= 5) activeColor = 'bg-amber-500 text-slate-950 ring-2 ring-amber-400 font-black';
                        if (val >= 6 && val <= 7) activeColor = 'bg-orange-500 text-white ring-2 ring-orange-400 font-black';
                        if (val >= 8 && val <= 10) activeColor = 'bg-rose-500 text-white ring-2 ring-rose-400 font-black';

                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setPortalStress(val)}
                            className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? activeColor
                                : isLight
                                  ? 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                                  : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>

                    <div className={`text-[10px] font-bold p-2.5 rounded-xl border flex items-center justify-between ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-white/5 border-white/5 text-slate-300'
                    }`}>
                      <span>Percepção:</span>
                      <span className="font-black italic">
                        {portalStress <= 1 && '🧘 0 a 1 - Totalmente Zen & Relaxado'}
                        {portalStress >= 2 && portalStress <= 3 && '🌿 2 a 3 - Leve / Rotina tranquila sob controle'}
                        {portalStress >= 4 && portalStress <= 5 && '⚖️ 4 a 5 - Moderado / Demandas habituais do dia'}
                        {portalStress >= 6 && portalStress <= 7 && '⚡ 6 a 7 - Elevado / Cansaço mental e tensão'}
                        {portalStress >= 8 && portalStress <= 9 && '⚠️ 8 a 9 - Muito Alto / Sobrecarga e estresse acentuado'}
                        {portalStress === 10 && '🚨 10 - Extremo / Esgotamento mental / Burnout'}
                      </span>
                    </div>

                    <div className={`flex justify-between text-[9px] font-bold px-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      <span>0 - Totalmente Zen / Calmo</span>
                      <span>10 - Estresse Extremo / Esgotamento</span>
                    </div>
                  </div>

                  {/* 4. DOR MUSCULAR / DOMS: 0 a 10 */}
                  <div className={`space-y-2 p-4 rounded-2xl border ${
                    isLight ? 'bg-rose-500/5 border-rose-200' : 'bg-slate-950/70 border-rose-500/20'
                  }`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-black uppercase tracking-wide flex items-center gap-1.5 ${isLight ? 'text-rose-700' : 'text-rose-300'}`}>
                        <Flame className="w-3.5 h-3.5 text-rose-500" />
                        4. Dor Muscular Tardia / DOMS (0 a 10)
                      </label>
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg font-mono border ${
                        isLight ? 'bg-rose-500/10 text-rose-700 border-rose-300/40' : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                      }`}>
                        {portalSoreness}/10
                      </span>
                    </div>

                    <p className={`text-[10.5px] font-medium leading-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Dores musculares e peso acumulado nas pernas de treinos anteriores. 0 é pernas completamente leves e soltas; 10 é dor incapacitante com alto risco de lesão.
                    </p>

                    <div className="grid grid-cols-6 sm:grid-cols-11 gap-1 pt-1">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                        const isSelected = portalSoreness === val;
                        let activeColor = 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400 font-black';
                        if (val >= 2 && val <= 3) activeColor = 'bg-teal-500 text-slate-950 ring-2 ring-teal-400 font-black';
                        if (val >= 4 && val <= 5) activeColor = 'bg-amber-500 text-slate-950 ring-2 ring-amber-400 font-black';
                        if (val >= 6 && val <= 7) activeColor = 'bg-orange-500 text-white ring-2 ring-orange-400 font-black';
                        if (val >= 8 && val <= 10) activeColor = 'bg-rose-500 text-white ring-2 ring-rose-400 font-black';

                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setPortalSoreness(val)}
                            className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? activeColor
                                : isLight
                                  ? 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                                  : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>

                    <div className={`text-[10px] font-bold p-2.5 rounded-xl border flex items-center justify-between ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-white/5 border-white/5 text-slate-300'
                    }`}>
                      <span>Percepção:</span>
                      <span className="font-black italic">
                        {portalSoreness <= 1 && '🏃 0 a 1 - Sem dores / Pernas leves e 100% livres'}
                        {portalSoreness >= 2 && portalSoreness <= 3 && '🦵 2 a 3 - Leve / Fadiga residual comum de treino'}
                        {portalSoreness >= 4 && portalSoreness <= 5 && '🩹 4 a 5 - Moderada / Músculos rígidos ou pesados'}
                        {portalSoreness >= 6 && portalSoreness <= 7 && '⚡ 6 a 7 - Forte / Incômodo ao descer escadas ou correr'}
                        {portalSoreness >= 8 && portalSoreness <= 9 && '⚠️ 8 a 9 - Intensa / Limitação mecânica evidente'}
                        {portalSoreness === 10 && '🚨 10 - Incapacitante / Risco de lesão muscular'}
                      </span>
                    </div>

                    <div className={`flex justify-between text-[9px] font-bold px-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      <span>0 - Sem Dores / Pernas Livres</span>
                      <span>10 - Dor Incapacitante / Travado</span>
                    </div>
                  </div>

                  {/* 5. HUMOR PARA TREINO & MOTIVAÇÃO: 0 a 10 */}
                  <div className={`space-y-2 p-4 rounded-2xl border ${
                    isLight ? 'bg-[#eefcf7] border-[#ccf2e5]' : 'bg-slate-950/70 border-teal-500/20'
                  }`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-black uppercase tracking-wide flex items-center gap-1.5 ${isLight ? 'text-teal-700' : 'text-teal-300'}`}>
                        <Smile className="w-3.5 h-3.5 text-teal-500" />
                        5. Humor para Treino & Motivação (0 a 10)
                      </label>
                      <span className={`text-xs font-black px-2.5 py-0.5 rounded-lg font-mono border ${
                        isLight ? 'bg-teal-500/10 text-teal-700 border-teal-300/40' : 'bg-teal-500/10 text-teal-300 border-teal-500/20'
                      }`}>
                        {portalMood}/10
                      </span>
                    </div>

                    <p className={`text-[10.5px] font-medium leading-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      Sua disposição psicológica e entusiasmo para calçar o tênis e treinar hoje. 0 é total apatia ou aversão; 10 é motivação máxima e foco absoluto na sessão.
                    </p>

                    <div className="grid grid-cols-6 sm:grid-cols-11 gap-1 pt-1">
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => {
                        const isSelected = portalMood === val;
                        let activeColor = 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400 font-black';
                        if (val >= 7 && val <= 8) activeColor = 'bg-teal-500 text-slate-950 ring-2 ring-teal-400 font-black';
                        if (val >= 5 && val <= 6) activeColor = 'bg-amber-500 text-slate-950 ring-2 ring-amber-400 font-black';
                        if (val >= 3 && val <= 4) activeColor = 'bg-orange-500 text-white ring-2 ring-orange-400 font-black';
                        if (val >= 0 && val <= 2) activeColor = 'bg-rose-500 text-white ring-2 ring-rose-400 font-black';

                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setPortalMood(val)}
                            className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? activeColor
                                : isLight
                                  ? 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                                  : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {val}
                          </button>
                        );
                      })}
                    </div>

                    <div className={`text-[10px] font-bold p-2.5 rounded-xl border flex items-center justify-between ${
                      isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-white/5 border-white/5 text-slate-300'
                    }`}>
                      <span>Percepção:</span>
                      <span className="font-black italic">
                        {portalMood === 10 && '🔥 10 - Foco Total / Motivação & Garra Máxima'}
                        {portalMood >= 8 && portalMood <= 9 && '⚡ 8 a 9 - Super Animado / Disposto e confiante'}
                        {portalMood >= 6 && portalMood <= 7 && '🏃 6 a 7 - Motivação Normal / Pronto para o treino'}
                        {portalMood >= 4 && portalMood <= 5 && '😐 4 a 5 - Desânimo Leve / Precisa de esforço para iniciar'}
                        {portalMood >= 2 && portalMood <= 3 && '🥱 2 a 3 - Muito Desanimado / Forçando para ir'}
                        {portalMood >= 0 && portalMood <= 1 && '🛑 0 a 1 - Sem Vontade Nenhuma / Bloqueio total'}
                      </span>
                    </div>

                    <div className={`flex justify-between text-[9px] font-bold px-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      <span>0 - Sem Vontade / Desanimado</span>
                      <span>10 - Motivação & Foco Máximo</span>
                    </div>
                  </div>

                  {/* FASE DO CICLO MENSTRUAL (Opcional) */}
                  {activeAthlete?.gender === 'female' && (
                    <div className={`space-y-2 p-4 rounded-2xl border ${
                      isLight ? 'bg-purple-500/5 border-purple-200' : 'bg-slate-950/70 border-purple-500/20'
                    }`}>
                      <label className="text-xs font-black text-purple-600 dark:text-purple-300 uppercase tracking-wide flex items-center gap-1.5">
                        🌸 Ciclo Menstrual (Mulher Atleta)
                      </label>
                      <p className={`text-[10.5px] font-medium leading-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        Fase atual do seu ciclo menstrual. Permite ao treinador entender flutuações hormonais naturais que impactam diretamente a força, tolerância à fadiga e termorregulação.
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {[
                          { id: 'follicular', label: 'Folicular (⚡ Energia)' },
                          { id: 'ovulatory', label: 'Ovulatória (🔥 Força)' },
                          { id: 'luteal', label: 'Lútea (🧘 Fadiga/TPM)' },
                          { id: 'menstrual', label: 'Menstrual (🩸 Regeneração)' }
                        ].map((phase) => (
                          <button
                            key={phase.id}
                            type="button"
                            onClick={() => setPortalMenstrual(phase.id as any)}
                            className={`p-2 rounded-xl text-[10px] font-bold border text-center transition-all ${
                              portalMenstrual === phase.id
                                ? 'bg-purple-600 text-white border-purple-400 font-black'
                                : isLight
                                  ? 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                                  : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {phase.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PREVIEW DO SCORE CALCULADO */}
                  {(() => {
                    const sleepHoursPct = Math.min(100, Math.max(0, Math.round((portalSleepHours / 8) * 100)));
                    const sleepQualityPct = Math.min(100, Math.max(0, (portalSleep / 10) * 100));
                    const stressPct = Math.min(100, Math.max(0, ((10 - portalStress) / 10) * 100));
                    const sorenessPct = Math.min(100, Math.max(0, ((10 - portalSoreness) / 10) * 100));
                    const moodPct = Math.min(100, Math.max(0, (portalMood / 10) * 100));

                    const previewScore = Math.round(
                      (sleepQualityPct * 0.25) + 
                      (sleepHoursPct * 0.20) + 
                      (sorenessPct * 0.20) + 
                      (stressPct * 0.20) + 
                      (moodPct * 0.15)
                    );

                    const status = previewScore >= 85 ? '🚀 Prontidão Excelente' : previewScore >= 70 ? '⚡ Boa Prontidão' : previewScore >= 40 ? '🧘 Prontidão Moderada' : '😴 Prontidão Baixa';
                    const statusColor = previewScore >= 85 ? 'text-emerald-600 dark:text-emerald-400' : previewScore >= 70 ? 'text-teal-600 dark:text-teal-400' : previewScore >= 40 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';

                    return (
                      <div className={`p-4 rounded-2xl border flex items-center justify-between ${
                        isLight ? 'bg-slate-100 border-slate-200' : 'bg-gradient-to-r from-slate-950 to-slate-900 border-white/10'
                      }`}>
                        <div>
                          <span className={`text-[9px] font-black uppercase tracking-wider block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            Score de Prontidão Estimado
                          </span>
                          <span className={`text-sm sm:text-base font-black uppercase italic ${statusColor}`}>
                            {status}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className={`text-2xl font-black font-mono ${isLight ? 'text-slate-800' : 'text-white'}`}>
                            {previewScore}%
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* BOTÕES DE AÇÃO DO FORMULÁRIO */}
                <div className={`flex gap-2 pt-4 border-t ${isLight ? 'border-slate-100' : 'border-white/10'}`}>
                  <button
                    type="button"
                    onClick={handleSavePortalReadiness}
                    disabled={portalIsSubmitting}
                    className="flex-1 py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase italic tracking-wider shadow-lg flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 cursor-pointer"
                  >
                    {portalIsSubmitting ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <Check className="w-4 h-4" />}
                    <span>Gravar Prontidão</span>
                  </button>

                  {(() => {
                    const hasEntry = (activeAthlete?.readinessHistory || []).some(entry => entry.date === portalDate);
                    if (!hasEntry) return null;
                    return (
                      <button
                        type="button"
                        onClick={() => handleDeleteReadiness(portalDate)}
                        disabled={portalIsSubmitting}
                        className="py-3.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-300 border border-rose-500/30 font-black text-xs uppercase italic tracking-wider transition-colors cursor-pointer"
                      >
                        Excluir
                      </button>
                    );
                  })()}

                  <button
                    type="button"
                    onClick={() => setShowPortalForm(false)}
                    className={`py-3.5 px-4 rounded-xl font-bold text-xs uppercase transition-colors cursor-pointer ${
                      isLight 
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-600' 
                        : 'bg-white/5 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    Fechar
                  </button>
                </div>

                {/* HISTÓRICO & GRÁFICOS (EXPANSÍVEL) */}
                <div className="pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setShowHistoryInModal(!showHistoryInModal)}
                    className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-[11px] font-bold uppercase italic flex items-center justify-between transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                      {showHistoryInModal ? 'Ocultar Gráficos e Histórico' : 'Ver Gráficos de Evolução & Histórico de Prontidão'}
                    </span>
                    <span>{showHistoryInModal ? '▲' : '▼'}</span>
                  </button>

                  {showHistoryInModal && (
                    <div className="space-y-4 pt-3">
                      {/* Gráfico da Prontidão */}
                      {(() => {
                        const history = activeAthlete?.readinessHistory || [];
                        if (history.length === 0) {
                          return (
                            <p className="text-xs text-slate-400 text-center py-4 italic">
                              Nenhum histórico de prontidão registrado ainda.
                            </p>
                          );
                        }

                        const chartData = [...history]
                          .slice(0, 10)
                          .reverse()
                          .map(entry => {
                            const [y, m, d] = entry.date.split('-');
                            return {
                              label: `${d}/${m}`,
                              Score: entry.readinessScore,
                              Sono: (entry.sleepHours || 8) * 10,
                            };
                          });

                        return (
                          <div className="bg-slate-950/60 p-4 rounded-2xl border border-white/5 space-y-2">
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">
                              📈 Evolução da Prontidão (Score %)
                            </p>
                            <div className="h-40 w-full text-slate-300 font-mono text-[9px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={chartData} margin={{ top: 10, right: 5, left: -25, bottom: 0 }}>
                                  <defs>
                                    <linearGradient id="colorScoreModal" x1="0" y1="0" x2="0" y2="1">
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
                                  <Area type="monotone" dataKey="Score" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorScoreModal)" />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Lista de Registros Anteriores */}
                      {(() => {
                        const history = activeAthlete?.readinessHistory || [];
                        if (history.length === 0) return null;

                        return (
                          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                            {history.map((entry) => {
                              const [y, m, d] = entry.date.split('-');
                              const dateStr = `${d}/${m}/${y}`;
                              const scoreColor = entry.readinessScore >= 70 ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 
                                                 entry.readinessScore >= 40 ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 
                                                 'text-rose-400 bg-red-500/10 border-red-500/20';

                              return (
                                <div 
                                  key={entry.id} 
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-white/5 hover:border-emerald-500/30 transition-all"
                                >
                                  <div className="flex items-center gap-2">
                                    <div className={`text-[10px] font-black px-2 py-1 rounded-lg border flex items-center justify-center ${scoreColor}`}>
                                      {entry.readinessScore}%
                                    </div>
                                    <div>
                                      <p className="text-xs font-black text-white italic">{dateStr}</p>
                                      <p className="text-[9px] text-slate-400 font-medium">
                                        Sono: {entry.sleepHours !== undefined ? `${entry.sleepHours}h` : 'N/A'}{entry.bedTime && entry.wakeTime ? ` (${entry.bedTime}➔${entry.wakeTime})` : ''} • Qualidade: {entry.sleepScore ?? 'N/A'}/10 • Dor: {entry.sorenessScore ?? 'N/A'}/10 • Estresse: {entry.stressScore ?? 'N/A'}/10 • Humor: {entry.moodScore ?? 'N/A'}/10
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => setPortalDate(entry.date)}
                                      className="px-2 py-1 bg-white/5 hover:bg-emerald-500/10 text-slate-400 hover:text-emerald-400 rounded-lg text-[9px] font-black uppercase transition-colors"
                                    >
                                      Editar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteReadiness(entry.date)}
                                      className="p-1 text-slate-500 hover:text-red-400 transition-colors rounded-lg"
                                      title="Excluir"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>,
            document.body
          )}

      {/* Card Destaque: Treino de Hoje */}
      <div className="relative group">
        <div className={`absolute -inset-1.5 rounded-[2.5rem] blur-md opacity-50 group-hover:opacity-75 transition duration-1000 animate-pulse ${
          todayWorkout?.workout.type === 'Prova' 
            ? 'bg-gradient-to-r from-amber-500 via-orange-600 to-red-600' 
            : 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600'
        }`}></div>
        <div className={`relative rounded-[2.2rem] p-8 shadow-2xl overflow-hidden border transition-all duration-500 ${
          isLight
            ? todayWorkout?.workout.type === 'Prova'
              ? 'bg-gradient-to-br from-amber-50 via-white to-amber-50 border-amber-300 shadow-[0_15px_30px_rgba(245,158,11,0.15)] text-slate-800'
              : 'bg-gradient-to-br from-emerald-50 via-white to-emerald-50 border-emerald-300 shadow-[0_15px_30px_rgba(16,185,129,0.15)] text-slate-800'
            : todayWorkout?.workout.type === 'Prova'
              ? 'bg-gradient-to-br from-slate-950 via-amber-950 to-slate-950 border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.4)] text-white'
              : 'bg-gradient-to-br from-emerald-950 via-slate-950 to-emerald-950 border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)] text-white'
        }`}>
          <div className={`absolute top-0 right-0 p-4 transition-opacity ${isLight ? 'opacity-[0.03]' : 'opacity-5'}`}>
             <Trophy className="w-32 h-32 rotate-12 text-current" />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className={`px-3 py-1 text-[9px] font-black uppercase rounded-lg italic tracking-tighter flex items-center gap-1.5 flex-wrap ${
                todayWorkout?.workout.type === 'Prova'
                  ? isLight ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-amber-500 text-slate-950'
                  : isLight ? 'bg-emerald-100 text-emerald-950 border border-emerald-300 font-black' : 'bg-emerald-500 text-emerald-950 font-black'
              }`}>
                <span>{todayWorkout?.workout.type.toUpperCase().includes('PROVA') ? 'Dia de Prova 🏁' : (todayWorkout?.isDescanso ? 'Recuperação' : 'Treino de Hoje')}</span>
                {athletePlan?.startDate && todayWorkout && (
                  <span className="opacity-70 font-black">
                    ({formatWorkoutDateShort(getWorkoutDate(athletePlan.startDate, todayWorkout.weekIndex, todayWorkout.dayIndex))})
                  </span>
                )}
              </div>
              {todayWorkout?.workout.completed && (
                <div className={`flex items-center gap-1 font-black text-[9px] uppercase italic ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                  <CheckCircle className="w-3 h-3" /> Concluído
                </div>
              )}
              {todayWorkout?.workout.gpsRoute && (
                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-md font-black text-[8px] uppercase italic border ${
                  isLight 
                    ? 'text-emerald-800 bg-emerald-50 border-emerald-300/40' 
                    : 'text-emerald-300 bg-emerald-500/20 border-emerald-400/30'
                }`}>
                  <Navigation className="w-2.5 h-2.5" /> Rota GPS Gravada ({todayWorkout.workout.gpsRoute.totalDistanceKm}k)
                </div>
              )}
            </div>
 
            <h2 className={`text-3xl font-black italic uppercase tracking-tighter mb-2 leading-tight ${
              todayWorkout?.workout.type === 'Prova' 
                ? isLight ? 'text-amber-800' : 'text-amber-400' 
                : isLight ? 'text-emerald-800' : 'text-emerald-400'
            }`}>
              {todayWorkout ? todayWorkout.workout.type : 'Dia de Descanso'}
            </h2>
            
            <p className={`text-sm font-semibold mb-8 leading-relaxed line-clamp-3 ${
              isLight ? 'text-slate-700' : 'text-slate-100'
            }`}>
              {todayWorkout?.workout.type.toUpperCase().includes('PROVA') 
                ? 'Hoje é o grande dia! Coloque em prática tudo o que treinou. Boa prova!' 
                : (todayWorkout ? todayWorkout.workout.customDescription : 'Aproveite para recuperar as energias e focar na mobilidade.')}
            </p>
 
            {todayWorkout?.workout.structuredWorkout && (
              <div className={`mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-[11px] font-black uppercase italic tracking-wider border shadow-xs ${
                isLight 
                  ? 'bg-emerald-50 text-emerald-850 border-emerald-200/60' 
                  : 'bg-white/10 backdrop-blur-md text-emerald-300 border-white/20'
              }`}>
                <Timer className={`w-3.5 h-3.5 shrink-0 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
                <span>DETALHADA: {formatStructuredWorkoutSummary(todayWorkout.workout.structuredWorkout)}</span>
              </div>
            )}
 
            {todayWorkout && todayWorkout.workout.type !== 'Descanso' && (
              <button 
                onClick={() => openWorkoutModal(todayWorkout.weekIndex, todayWorkout.dayIndex, todayWorkout.workout)}
                className={`w-full font-black py-4.5 rounded-2xl flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-[0.98] uppercase italic tracking-wider text-xs sm:text-sm cursor-pointer ${
                  todayWorkout.workout.completed
                    ? isLight
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300'
                      : 'bg-slate-800 text-slate-200 border border-white/10 hover:bg-slate-700'
                    : isLight
                      ? 'bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-500/20'
                      : 'bg-gradient-to-r from-emerald-400 via-emerald-300 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 scale-[1.01] shadow-emerald-500/30'
                }`}
              >
                {todayWorkout.workout.completed 
                  ? <Check className="w-5 h-5" /> 
                  : <Zap className={`w-5 h-5 animate-bounce ${isLight ? 'fill-white text-white' : 'fill-slate-950 text-slate-950'}`} />} 
                {todayWorkout.workout.completed ? 'VER DETALHES DO TREINO' : 'INICIAR TREINO DE HOJE'}
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

      {/* SEÇÃO: CONTROLE DE PRONTIDÃO, QUALIDADE DE SONO, DOR E FADIGA (OPÇÃO 2) */}
      {(() => {
        const todayDateStr = new Date().toISOString().split('T')[0];
        const historyList = activeAthlete?.readinessHistory || [];
        const todayEntry = historyList.find(e => e.date === todayDateStr) || activeAthlete?.lastReadiness;
        const isTodayRegistered = historyList.some(e => e.date === todayDateStr);

        // Normalização de notas (caso venha em escala 0-5 ou 0-10)
        const normalizeScore = (val: number | undefined | null) => {
          if (val === undefined || val === null) return null;
          return val <= 5 ? Math.min(10, Math.round(val * 2)) : val;
        };

        const currentScore = todayEntry?.readinessScore ?? null;
        const currentSleep = normalizeScore(todayEntry?.sleepScore);
        const currentSleepHours = todayEntry?.sleepHours ?? null;
        const currentStress = normalizeScore(todayEntry?.stressScore);
        const currentSoreness = normalizeScore(todayEntry?.sorenessScore);
        const currentMood = normalizeScore(todayEntry?.moodScore);

        // Status esportivo da prontidão
        const getStatusData = (score: number | null) => {
          if (score === null) {
            return {
              label: 'Check-in Pendente',
              sublabel: 'AVALIAÇÃO DE HOJE PENDENTE',
              advice: 'Preencha o check-in de hoje para calcular sua prontidão e receber a recomendação ideal para o seu treino.',
              colorClass: 'text-amber-500',
              bgClass: isLight ? 'bg-amber-500/10 border-amber-500/20 text-amber-700' : 'bg-amber-500/10 border-amber-500/30 text-amber-400',
              gradient: 'from-amber-500/15 via-amber-500/5 to-transparent',
              badgeBorder: 'border-amber-500/30'
            };
          }
          if (score >= 85) {
            return {
              label: 'Excelente Prontidão',
              sublabel: 'PLANILHA 100% LIBERADA',
              advice: 'Recuperação neuromuscular excelente. Corpo e mente aptos para intensidade máxima, ritmo forte e tiros.',
              colorClass: 'text-emerald-500',
              bgClass: isLight ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
              gradient: 'from-emerald-500/15 via-emerald-500/5 to-transparent',
              badgeBorder: 'border-emerald-500/30'
            };
          }
          if (score >= 70) {
            return {
              label: 'Boa Prontidão',
              sublabel: 'LIBERADO PARA TREINAR',
              advice: 'Bom tônus muscular e descanso adequado. O treino planejado pode ser seguido normalmente com segurança.',
              colorClass: 'text-teal-500',
              bgClass: isLight ? 'bg-teal-500/10 border-teal-500/20 text-teal-700' : 'bg-teal-500/10 border-teal-500/30 text-teal-400',
              gradient: 'from-teal-500/15 via-teal-500/5 to-transparent',
              badgeBorder: 'border-teal-500/30'
            };
          }
          if (score >= 45) {
            return {
              label: 'Prontidão Moderada',
              sublabel: 'TREINAR COM CAUTELA',
              advice: 'Sinais leves de cansaço ou sono parcial. O treino pode ser executado, mas evite desgastes extremos se as pernas pesarem.',
              colorClass: 'text-amber-500',
              bgClass: isLight ? 'bg-amber-500/10 border-amber-500/20 text-amber-700' : 'bg-amber-500/10 border-amber-500/30 text-amber-400',
              gradient: 'from-amber-500/15 via-amber-500/5 to-transparent',
              badgeBorder: 'border-amber-500/30'
            };
          }
          return {
            label: 'Fadiga Elevada',
            sublabel: 'REGENERAÇÃO OU REPOUSO',
            advice: 'Fadiga acumulada detectada (sono insuficiente, dor muscular ou estresse). Recomendado treino regenerativo ou repouso ativo.',
            colorClass: 'text-rose-500',
            bgClass: isLight ? 'bg-rose-500/10 border-rose-500/20 text-rose-700' : 'bg-rose-500/10 border-rose-500/30 text-rose-400',
            gradient: 'from-rose-500/15 via-rose-500/5 to-transparent',
            badgeBorder: 'border-rose-500/30'
          };
        };

        const statusInfo = getStatusData(currentScore);

        // Gerar histórico dos últimos 7 dias
        const weekDays = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const dateString = d.toISOString().split('T')[0];
          const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
          const dayName = dayNames[d.getDay()];
          const dayFmt = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
          const isCurrent = i === 0;

          const entry = historyList.find(e => e.date === dateString);

          let dayKm = 0;
          athletePlan?.weeks?.forEach((w: any) => {
            w.workouts?.forEach((work: any) => {
              if (work.date === dateString && work.completed && work.type !== 'Descanso') {
                dayKm += Number(work.actualDistance || work.distance || 0);
              }
            });
          });

          const sleepN = normalizeScore(entry?.sleepScore);
          const stressN = normalizeScore(entry?.stressScore);
          const sorenessN = normalizeScore(entry?.sorenessScore);

          weekDays.push({
            dateString,
            name: isCurrent ? 'Hoje' : dayName,
            fullLabel: isCurrent ? `Hoje (${dayFmt})` : `${dayName} (${dayFmt})`,
            readiness: entry?.readinessScore !== undefined ? entry.readinessScore : (isCurrent && currentScore !== null ? currentScore : null),
            sleepPct: sleepN !== null ? sleepN * 10 : null,
            sleepScore: sleepN,
            sleepHours: entry?.sleepHours || null,
            fatiguePct: stressN !== null ? stressN * 10 : null,
            fatigueScore: stressN,
            sorenessPct: sorenessN !== null ? sorenessN * 10 : null,
            sorenessScore: sorenessN,
            km: Math.round(dayKm * 10) / 10,
            hasData: Boolean(entry)
          });
        }

        const registeredDays = weekDays.filter(d => d.readiness !== null);
        const avgReadiness = registeredDays.length > 0 
          ? Math.round(registeredDays.reduce((acc, cur) => acc + (cur.readiness || 0), 0) / registeredDays.length)
          : null;
        
        const daysWithSleep = weekDays.filter(d => d.sleepHours !== null && d.sleepHours > 0);
        const avgSleepHours = daysWithSleep.length > 0
          ? (daysWithSleep.reduce((acc, cur) => acc + (cur.sleepHours || 0), 0) / daysWithSleep.length).toFixed(1)
          : null;
        
        const totalKm7Days = Math.round(weekDays.reduce((acc, cur) => acc + cur.km, 0) * 10) / 10;

        return (
          <div className={`rounded-[2rem] p-6 sm:p-8 border shadow-sm space-y-6 transition-all ${
            isLight ? 'bg-white border-slate-100' : 'bg-slate-900 border-slate-800'
          }`}>
            {/* CABEÇALHO DO CONTROLE DE PRONTIDÃO */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className={`font-black text-sm uppercase italic tracking-tight ${isLight ? 'text-slate-800' : 'text-white'}`}>
                      Controle de Prontidão & Recuperação
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Qualidade de sono, dor muscular, fadiga e biomarcadores diários
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-bold ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-slate-800/60 border-slate-700 text-slate-300'
                }`}>
                  <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Hoje, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPortalDate(todayDateStr);
                    setShowPortalForm(true);
                  }}
                  className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-[11px] uppercase italic tracking-wider shadow-md flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isTodayRegistered ? 'Atualizar Prontidão' : 'Registrar Prontidão'}</span>
                </button>
              </div>
            </div>

            {/* HERO BANNER: SCORE GERAL DE PRONTIDÃO */}
            <div className={`relative overflow-hidden rounded-[1.8rem] p-5 sm:p-6 border bg-gradient-to-br ${statusInfo.gradient} ${
              isLight ? 'border-slate-100 bg-slate-50/60' : 'border-white/5 bg-slate-950/40'
            }`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10">
                <div className="flex items-center gap-4">
                  <div className={`w-18 h-18 sm:w-20 sm:h-20 rounded-2xl flex flex-col items-center justify-center border shadow-inner ${
                    isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-white/10'
                  }`}>
                    <span className={`text-2xl sm:text-3xl font-black font-mono leading-none ${statusInfo.colorClass}`}>
                      {currentScore !== null ? `${currentScore}%` : '--'}
                    </span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-1">
                      Score
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${statusInfo.bgClass}`}>
                        {statusInfo.sublabel}
                      </span>
                      <span className={`text-[10px] font-bold italic ${
                        isTodayRegistered ? 'text-emerald-500' : 'text-amber-500'
                      }`}>
                        {isTodayRegistered ? '• Check-in de hoje preenchido' : '• Check-in de hoje pendente'}
                      </span>
                    </div>
                    <h4 className={`text-base sm:text-lg font-black uppercase italic tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                      {statusInfo.label}
                    </h4>
                    <p className={`text-xs max-w-xl font-medium leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                      {statusInfo.advice}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 sm:border-l pt-3 sm:pt-0 sm:pl-6 border-slate-200/60 dark:border-white/5 text-right">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Orientação de Carga
                  </span>
                  <span className={`text-xs font-black uppercase italic mt-0.5 ${statusInfo.colorClass}`}>
                    {currentScore === null ? 'Aguardando Avaliação' : currentScore >= 70 ? 'Carga Regular / Alta' : currentScore >= 45 ? 'Carga Moderada' : 'Regenerativo'}
                  </span>
                </div>
              </div>
            </div>

            {/* GRID DOS 4 PILARES: SONO, FADIGA, DOR, ESTRESSE */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* 1. QUALIDADE DO SONO */}
              <div className={`p-4 rounded-2xl border transition-all ${
                isLight ? 'bg-slate-50 border-slate-100 hover:border-indigo-200' : 'bg-slate-950/40 border-white/5 hover:border-indigo-500/30'
              }`}>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-black uppercase italic text-indigo-400 tracking-wider flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    Sono
                  </span>
                  <span className="text-[10px] font-mono font-black text-indigo-400">
                    {currentSleep !== null ? `${currentSleep}/10` : '--'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className={`text-lg font-black font-mono leading-none ${isLight ? 'text-slate-800' : 'text-white'}`}>
                      {currentSleepHours ? `${currentSleepHours}h` : '--'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">
                      {currentSleepHours && currentSleepHours >= 7 ? 'Tempo Ideal' : 'Horas de Repouso'}
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full rounded-full transition-all"
                      style={{ width: `${currentSleep !== null ? Math.min(100, currentSleep * 10) : 0}%` }}
                    />
                  </div>

                  <p className="text-[9px] text-slate-400 font-medium leading-tight line-clamp-1">
                    {currentSleep !== null 
                      ? (currentSleep >= 8 ? 'Sono reparador profundo' : currentSleep >= 6 ? 'Descanso razoável' : 'Sono insuficiente / fragmentado')
                      : 'Não avaliado hoje'}
                  </p>
                </div>
              </div>

              {/* 2. NÍVEL DE FADIGA / CANSAÇO */}
              <div className={`p-4 rounded-2xl border transition-all ${
                isLight ? 'bg-slate-50 border-slate-100 hover:border-amber-200' : 'bg-slate-950/40 border-white/5 hover:border-amber-500/30'
              }`}>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-black uppercase italic text-amber-400 tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Fadiga
                  </span>
                  <span className="text-[10px] font-mono font-black text-amber-400">
                    {currentStress !== null ? `${currentStress}/10` : '--'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className={`text-lg font-black font-mono leading-none ${isLight ? 'text-slate-800' : 'text-white'}`}>
                      {currentStress !== null 
                        ? (currentStress <= 3 ? 'Baixa' : currentStress <= 6 ? 'Moderada' : 'Alta')
                        : '--'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">
                      Sensação Física
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        currentStress === null ? 'bg-slate-400' : currentStress <= 3 ? 'bg-emerald-500' : currentStress <= 6 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${currentStress !== null ? Math.min(100, currentStress * 10) : 0}%` }}
                    />
                  </div>

                  <p className="text-[9px] text-slate-400 font-medium leading-tight line-clamp-1">
                    {currentStress !== null 
                      ? (currentStress <= 3 ? 'Corpo leve e descansado' : currentStress <= 6 ? 'Cansaço físico tolerável' : 'Sobrecarga muscular acumulada')
                      : 'Não avaliado hoje'}
                  </p>
                </div>
              </div>

              {/* 3. NÍVEL DE DOR MUSCULAR */}
              <div className={`p-4 rounded-2xl border transition-all ${
                isLight ? 'bg-slate-50 border-slate-100 hover:border-rose-200' : 'bg-slate-950/40 border-white/5 hover:border-rose-500/30'
              }`}>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-black uppercase italic text-rose-400 tracking-wider flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-rose-400" />
                    Dor Muscular
                  </span>
                  <span className="text-[10px] font-mono font-black text-rose-400">
                    {currentSoreness !== null ? `${currentSoreness}/10` : '--'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className={`text-lg font-black font-mono leading-none ${isLight ? 'text-slate-800' : 'text-white'}`}>
                      {currentSoreness !== null 
                        ? (currentSoreness <= 2 ? 'Nenhuma' : currentSoreness <= 5 ? 'Leve' : 'Intensa')
                        : '--'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">
                      Desconforto
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${
                        currentSoreness === null ? 'bg-slate-400' : currentSoreness <= 2 ? 'bg-emerald-500' : currentSoreness <= 5 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${currentSoreness !== null ? Math.min(100, currentSoreness * 10) : 0}%` }}
                    />
                  </div>

                  <p className="text-[9px] text-slate-400 font-medium leading-tight line-clamp-1">
                    {currentSoreness !== null 
                      ? (currentSoreness <= 2 ? 'Músculos livres de dor' : currentSoreness <= 5 ? 'Dor pós-treino tolerável' : 'Dor aguda / requer atenção')
                      : 'Não avaliado hoje'}
                  </p>
                </div>
              </div>

              {/* 4. DISPOSIÇÃO & ESTRESSE */}
              <div className={`p-4 rounded-2xl border transition-all ${
                isLight ? 'bg-slate-50 border-slate-100 hover:border-teal-200' : 'bg-slate-950/40 border-white/5 hover:border-teal-500/30'
              }`}>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-black uppercase italic text-teal-400 tracking-wider flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-teal-400" />
                    Disposição
                  </span>
                  <span className="text-[10px] font-mono font-black text-teal-400">
                    {currentMood !== null ? `${currentMood}/10` : '--'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <span className={`text-lg font-black font-mono leading-none ${isLight ? 'text-slate-800' : 'text-white'}`}>
                      {currentMood !== null 
                        ? (currentMood >= 7 ? 'Alta' : currentMood >= 4 ? 'Normal' : 'Baixa')
                        : '--'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">
                      Foco Mental
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-teal-500 h-full rounded-full transition-all"
                      style={{ width: `${currentMood !== null ? Math.min(100, currentMood * 10) : 0}%` }}
                    />
                  </div>

                  <p className="text-[9px] text-slate-400 font-medium leading-tight line-clamp-1">
                    {currentMood !== null 
                      ? (currentMood >= 7 ? 'Motivado para treinar forte' : currentMood >= 4 ? 'Foco estável' : 'Desmotivado / mentalmente cansado')
                      : 'Não avaliado hoje'}
                  </p>
                </div>
              </div>
            </div>

            {/* GRÁFICO SEMANAL ANALÍTICO DOS ÚLTIMOS 7 DIAS (OPÇÃO 2) */}
            <div className={`p-5 sm:p-6 rounded-[1.8rem] border space-y-4 ${
              isLight ? 'bg-slate-50/70 border-slate-100' : 'bg-slate-950/40 border-white/5'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className={`text-xs font-black uppercase italic tracking-wider flex items-center gap-2 ${
                    isLight ? 'text-slate-800' : 'text-white'
                  }`}>
                    <TrendingUp className="w-4 h-4 text-emerald-500" />
                    Tendência dos Últimos 7 Dias (Prontidão vs Treinos)
                  </h4>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Correlação entre volume de corrida (KM), índice de prontidão, sono e fadiga
                  </p>
                </div>

                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-200 dark:border-white/5 text-[10px] font-black uppercase italic self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setReadinessChartTab('readiness')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      readinessChartTab === 'readiness'
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Prontidão (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReadinessChartTab('multi')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      readinessChartTab === 'multi'
                        ? 'bg-emerald-500 text-slate-950 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Multimétricas
                  </button>
                </div>
              </div>

              {/* ÁREA DO GRÁFICO RECHARTS */}
              <div className="h-[220px] w-full" style={{ width: '100%', minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  {readinessChartTab === 'readiness' ? (
                    <AreaChart
                      data={weekDays}
                      margin={{ top: 20, right: 10, left: -25, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="readinessGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isLight ? '#e2e8f0' : '#1e293b'} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: isLight ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 900 }} 
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        ticks={[0, 25, 50, 75, 100]}
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: isLight ? '#94a3b8' : '#64748b', fontSize: 9 }}
                        unit="%"
                      />
                      <Tooltip 
                        cursor={{ stroke: '#10b981', strokeWidth: 1, strokeDasharray: '3 3' }}
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className={`p-3.5 rounded-2xl shadow-xl border text-xs space-y-2 min-w-[170px] ${
                              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                            }`}>
                              <div className="flex items-center justify-between border-b pb-1.5 border-slate-100 dark:border-white/10">
                                <span className="font-black uppercase tracking-wider text-[11px]">{d.fullLabel}</span>
                                {d.km > 0 && (
                                  <span className="text-emerald-500 font-black text-[11px]">{d.km} KM</span>
                                )}
                              </div>
                              <div className="space-y-1 pt-0.5 text-[10px]">
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    Prontidão:
                                  </span>
                                  <span className="font-black font-mono text-emerald-500">
                                    {d.readiness !== null ? `${d.readiness}%` : 'Sem registro'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
                                    Sono:
                                  </span>
                                  <span className="font-black font-mono">
                                    {d.sleepScore !== null ? `${d.sleepScore}/10 (${d.sleepHours || 0}h)` : '--'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                                    Fadiga:
                                  </span>
                                  <span className="font-black font-mono">
                                    {d.fatigueScore !== null ? `${d.fatigueScore}/10` : '--'}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-slate-400 font-bold flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                                    Dor Muscular:
                                  </span>
                                  <span className="font-black font-mono">
                                    {d.sorenessScore !== null ? `${d.sorenessScore}/10` : '--'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="readiness" 
                        stroke="#10b981" 
                        strokeWidth={3} 
                        fill="url(#readinessGradient)" 
                        dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: isLight ? '#fff' : '#0f172a' }}
                        activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                        connectNulls={true}
                      />
                    </AreaChart>
                  ) : (
                    <LineChart
                      data={weekDays}
                      margin={{ top: 20, right: 10, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isLight ? '#e2e8f0' : '#1e293b'} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: isLight ? '#64748b' : '#94a3b8', fontSize: 10, fontWeight: 900 }} 
                      />
                      <YAxis 
                        domain={[0, 100]} 
                        ticks={[0, 25, 50, 75, 100]}
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: isLight ? '#94a3b8' : '#64748b', fontSize: 9 }}
                        unit="%"
                      />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (!active || !payload || !payload.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className={`p-3.5 rounded-2xl shadow-xl border text-xs space-y-2 min-w-[170px] ${
                              isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'
                            }`}>
                              <div className="flex items-center justify-between border-b pb-1.5 border-slate-100 dark:border-white/10">
                                <span className="font-black uppercase tracking-wider text-[11px]">{d.fullLabel}</span>
                                {d.km > 0 && <span className="text-emerald-500 font-black text-[11px]">{d.km} KM</span>}
                              </div>
                              <div className="space-y-1 pt-0.5 text-[10px]">
                                <div className="flex items-center justify-between">
                                  <span className="text-emerald-500 font-bold">Prontidão:</span>
                                  <span className="font-black font-mono">{d.readiness !== null ? `${d.readiness}%` : '--'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-indigo-400 font-bold">Sono:</span>
                                  <span className="font-black font-mono">{d.sleepScore !== null ? `${d.sleepScore}/10` : '--'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-amber-400 font-bold">Fadiga:</span>
                                  <span className="font-black font-mono">{d.fatigueScore !== null ? `${d.fatigueScore}/10` : '--'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-rose-400 font-bold">Dor Muscular:</span>
                                  <span className="font-black font-mono">{d.sorenessScore !== null ? `${d.sorenessScore}/10` : '--'}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }}
                      />
                      <Line 
                        type="monotone" 
                        name="Prontidão" 
                        dataKey="readiness" 
                        stroke="#10b981" 
                        strokeWidth={2.5} 
                        dot={{ r: 3, fill: '#10b981' }} 
                        connectNulls={true} 
                      />
                      <Line 
                        type="monotone" 
                        name="Sono" 
                        dataKey="sleepPct" 
                        stroke="#818cf8" 
                        strokeWidth={2} 
                        strokeDasharray="4 4" 
                        dot={{ r: 3, fill: '#818cf8' }} 
                        connectNulls={true} 
                      />
                      <Line 
                        type="monotone" 
                        name="Fadiga" 
                        dataKey="fatiguePct" 
                        stroke="#f59e0b" 
                        strokeWidth={2} 
                        dot={{ r: 3, fill: '#f59e0b' }} 
                        connectNulls={true} 
                      />
                      <Line 
                        type="monotone" 
                        name="Dor" 
                        dataKey="sorenessPct" 
                        stroke="#f43f5e" 
                        strokeWidth={2} 
                        dot={{ r: 3, fill: '#f43f5e' }} 
                        connectNulls={true} 
                      />
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* RODAPÉ COM INDICADORES SEMANAIS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200/70 dark:border-white/5">
                <div className="text-center p-2 rounded-xl bg-white/50 dark:bg-slate-900/50">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Média Prontidão</span>
                  <span className="text-xs font-black font-mono text-emerald-500">
                    {avgReadiness !== null ? `${avgReadiness}%` : '--'}
                  </span>
                </div>
                <div className="text-center p-2 rounded-xl bg-white/50 dark:bg-slate-900/50">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Média de Sono</span>
                  <span className="text-xs font-black font-mono text-indigo-400">
                    {avgSleepHours ? `${avgSleepHours}h / noite` : '--'}
                  </span>
                </div>
                <div className="text-center p-2 rounded-xl bg-white/50 dark:bg-slate-900/50">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Volume Semana</span>
                  <span className="text-xs font-black font-mono text-slate-700 dark:text-slate-200">
                    {totalKm7Days} KM
                  </span>
                </div>
                <div className="text-center p-2 rounded-xl bg-white/50 dark:bg-slate-900/50">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Monitorados</span>
                  <span className="text-xs font-black font-mono text-teal-400">
                    {registeredDays.length} / 7 dias
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
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
            </div>
            
            <div className={`p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1 ${
              isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'
            }`}>
              <div className="space-y-4">
                {((selectedWorkout.data.distance && selectedWorkout.data.distance > 0) || 
                  (selectedWorkout.data.distanceKm && selectedWorkout.data.distanceKm > 0) || 
                  (selectedWorkout.data.durationMinutes && selectedWorkout.data.durationMinutes > 0)) && (
                  <div className="flex justify-center gap-3">
                    {selectedWorkout.data.completed && ((selectedWorkout.data.distance && selectedWorkout.data.distance > 0) || (selectedWorkout.data.distanceKm && selectedWorkout.data.distanceKm > 0)) && (
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
                  {/* PRESCRIÇÃO ESTRUTURADA DETALHADA (GREEN THEME) */}
                  {!selectedWorkout.data.completed && (
                    <div className={`space-y-4 p-5 sm:p-6 rounded-[2rem] border shadow-xl transition-all ${
                      isLight 
                        ? 'bg-gradient-to-br from-emerald-50/90 via-slate-50 to-teal-50/90 border-emerald-200 text-slate-900 shadow-md' 
                        : 'bg-gradient-to-br from-emerald-950/20 via-slate-900 to-teal-950/20 border-emerald-500/20 text-white'
                    }`}>
                      <div className="flex items-center justify-between border-b pb-3 border-emerald-500/10">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                            isLight ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            <Timer className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className={`text-xs font-black uppercase italic tracking-tight ${
                              isLight ? 'text-slate-900' : 'text-white'
                            }`}>
                              Prescrição Estruturada Detalhada
                            </h4>
                            <p className={`text-[9px] font-bold uppercase tracking-wider ${
                              isLight ? 'text-emerald-800' : 'text-emerald-400'
                            }`}>
                              {localSteps.length} Etapas • Personalizável
                            </p>
                          </div>
                        </div>
                        <span className={`text-[8px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider border italic ${
                          isLight ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          Ajustável
                        </span>
                      </div>

                      {/* Steps List Editor */}
                      <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                        {localSteps.map((step: any, sIdx: number) => (
                          <div key={step.id || sIdx} className={`p-3 rounded-2xl border space-y-2 relative transition-all ${
                            isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-black/30 border-white/5'
                          }`}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="text-[10px] font-black text-emerald-500 font-mono">#{sIdx + 1}</span>
                                <input
                                  type="text"
                                  className={`w-full bg-transparent font-black text-xs uppercase italic outline-none border-b border-transparent focus:border-emerald-500/30 ${
                                    isLight ? 'text-slate-800' : 'text-slate-100'
                                  }`}
                                  value={step.name || ''}
                                  onChange={(e) => {
                                    const updated = [...localSteps];
                                    updated[sIdx].name = e.target.value;
                                    setLocalSteps(updated);
                                  }}
                                  placeholder="Nome da Etapa"
                                />
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = localSteps.filter((_, i) => i !== sIdx);
                                  setLocalSteps(updated);
                                }}
                                className="text-red-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                                title="Excluir Etapa"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                              {/* Target Type */}
                              <div className="space-y-0.5">
                                <label className="text-[8px] font-black uppercase text-slate-500">Tipo</label>
                                <select
                                  className={`w-full p-1.5 rounded-lg text-[10px] font-bold bg-transparent border cursor-pointer ${
                                    isLight ? 'border-slate-200 text-slate-800' : 'border-white/10 text-slate-300'
                                  }`}
                                  value={step.targetType || 'distance'}
                                  onChange={(e) => {
                                    const updated = [...localSteps];
                                    updated[sIdx].targetType = e.target.value;
                                    if (e.target.value === 'distance') {
                                      updated[sIdx].targetValue = 1000;
                                    } else {
                                      updated[sIdx].targetValue = 300;
                                    }
                                    setLocalSteps(updated);
                                  }}
                                >
                                  <option value="distance" className={isLight ? 'text-slate-900 bg-white' : 'text-white bg-slate-900'}>Distância</option>
                                  <option value="time" className={isLight ? 'text-slate-900 bg-white' : 'text-white bg-slate-900'}>Tempo</option>
                                </select>
                              </div>

                              {/* Value Input */}
                              <div className="space-y-0.5">
                                <label className="text-[8px] font-black uppercase text-slate-500">
                                  {step.targetType === 'distance' ? 'Metros' : 'Minutos'}
                                </label>
                                <input
                                  type="number"
                                  className={`w-full p-1 rounded-lg text-[10px] font-mono font-bold bg-transparent border text-center ${
                                    isLight ? 'border-slate-200 text-slate-800' : 'border-white/10 text-slate-200'
                                  }`}
                                  value={step.targetType === 'distance' ? step.targetValue : Math.round(step.targetValue / 60)}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    const updated = [...localSteps];
                                    if (step.targetType === 'distance') {
                                      updated[sIdx].targetValue = val;
                                    } else {
                                      updated[sIdx].targetValue = val * 60;
                                    }
                                    setLocalSteps(updated);
                                  }}
                                />
                              </div>

                              {/* Pace Input */}
                              <div className="space-y-0.5">
                                <label className="text-[8px] font-black uppercase text-slate-500">Ritmo</label>
                                <input
                                  type="text"
                                  className={`w-full p-1 rounded-lg text-[10px] font-mono font-bold bg-transparent border text-center ${
                                    isLight ? 'border-slate-200 text-slate-800' : 'border-white/10 text-slate-200'
                                  }`}
                                  placeholder="Ex: 05:00"
                                  value={step.targetPaceMin || ''}
                                  onChange={(e) => {
                                    const updated = [...localSteps];
                                    updated[sIdx].targetPaceMin = e.target.value;
                                    setLocalSteps(updated);
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Step and Start Run Actions */}
                      <div className="space-y-2 pt-2 border-t border-emerald-500/10">
                        <button
                          type="button"
                          onClick={() => {
                            setLocalSteps([
                              ...localSteps,
                              {
                                id: Math.random().toString(36).substring(2, 11),
                                name: "Intervalo Novo",
                                targetType: "distance",
                                targetValue: 400,
                                targetPaceMin: "05:00"
                              }
                            ]);
                          }}
                          className={`w-full py-2.5 rounded-xl border-2 border-dashed font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            isLight 
                              ? 'border-emerald-300 text-emerald-800 hover:bg-emerald-50' 
                              : 'border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/5'
                          }`}
                        >
                          <Plus className="w-4 h-4" /> Adicionar Nova Etapa
                        </button>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => setShowGpsTracker(true)}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs uppercase italic tracking-wider shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98] cursor-pointer"
                          >
                            <Play className="w-4 h-4 fill-white" /> Iniciar com GPS
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (!actualDistanceValue && selectedWorkout.data.distance) {
                                setActualDistanceValue(String(selectedWorkout.data.distance));
                              }
                              if (!actualDurationValue && selectedWorkout.data.durationMinutes) {
                                setActualDurationValue(`${selectedWorkout.data.durationMinutes}:00`);
                              }
                              setSelectedWorkout(prev => prev ? {
                                ...prev,
                                data: {
                                  ...prev.data,
                                  completed: true
                                }
                              } : null);
                            }}
                            className={`w-full py-3.5 rounded-xl border flex items-center justify-center gap-2 text-xs font-black uppercase italic tracking-wider transition-all active:scale-[0.98] cursor-pointer ${
                              isLight 
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300' 
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            <Check className="w-4 h-4" /> Concluir (Esteira / Manual)
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* RELATÓRIO DE EXECUÇÃO (ENVIAR AO TREINADOR) - Only visible after marking the workout as completed */}
                  {selectedWorkout.data.completed && (
                    <div className={`p-6 rounded-[2rem] border space-y-6 transition-all ${
                      isLight ? 'bg-slate-50 border-slate-200 text-slate-900 shadow-sm' : 'bg-white/5 border-white/5 text-white'
                    }`}>
                      <div className="flex items-center justify-between border-b pb-3 border-emerald-500/10">
                        <div className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-emerald-500" />
                          <h4 className={`text-sm font-black uppercase italic tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>
                            Relatório de Execução do Treino
                          </h4>
                        </div>
                      </div>

                      {/* 1. Métricas Reais do Treino */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Distância */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                              <TrendingUp className="w-4 h-4 text-emerald-500" /> Distância (KM)
                            </label>
                          </div>
                          <div className="relative">
                            <input 
                              type="text"
                              disabled={isSaving}
                              className={`pro-input w-full py-4 px-4 text-sm font-black italic rounded-2xl outline-none transition-all pr-12 ${
                                isLight ? 'bg-white border-slate-300 text-emerald-800 focus:border-emerald-500' : 'bg-white/5 border-white/10 text-emerald-400 focus:border-emerald-500/50'
                              }`}
                              placeholder="Ex: 10.5"
                              value={actualDistanceValue}
                              onChange={e => setActualDistanceValue(e.target.value)}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black italic text-slate-500">
                              KM
                            </div>
                          </div>
                          <div className="text-[9px] font-black uppercase text-slate-500/80 italic pl-1">
                            Plano: {selectedWorkout.data.distance || 0} KM
                          </div>
                        </div>

                        {/* Tempo */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                              <Timer className="w-4 h-4 text-amber-500" /> Tempo Total
                            </label>
                          </div>
                          <div className="relative">
                            <input 
                              type="text"
                              disabled={isSaving}
                              className={`pro-input w-full py-4 px-4 text-sm font-black italic rounded-2xl outline-none transition-all pr-14 ${
                                isLight ? 'bg-white border-slate-300 text-emerald-800 focus:border-emerald-500' : 'bg-white/5 border-white/10 text-emerald-400 focus:border-emerald-500/50'
                              }`}
                              placeholder="Ex: 45:00"
                              value={actualDurationValue}
                              onChange={e => setActualDurationValue(e.target.value)}
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black italic text-slate-500">
                              MIN/SEG
                            </div>
                          </div>
                          <div className="text-[9px] font-black uppercase text-slate-500/80 italic pl-1">
                            Plano: {selectedWorkout.data.durationMinutes || '--'} min
                          </div>
                        </div>
                      </div>

                      {/* Real-time Pace calculation badge */}
                      <div className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${
                        isLight ? 'bg-emerald-50/50 border-emerald-100' : 'bg-emerald-500/5 border-emerald-500/10'
                      }`}>
                        <div className="flex items-center gap-2">
                          <Activity className="w-4 h-4 text-emerald-500" />
                          <span className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                            Ritmo Médio Calculado (Pace)
                          </span>
                        </div>
                        <span className="text-sm font-mono font-black italic text-emerald-500">
                          {calculatePace(actualDistanceValue, actualDurationValue)} / KM
                        </span>
                      </div>

                      {/* 2. Percepção de Esforço (PSE) */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <label className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                            <Zap className="w-4 h-4 text-amber-500" /> Percepção de Esforço (PSE)
                          </label>
                          <span className={`text-[10px] font-black italic uppercase tracking-tighter ${getRPEColor(rpeValue)}`}>
                            {getRPELabel(rpeValue)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-5 gap-1.5">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                            <button
                              key={num}
                              type="button"
                              disabled={isSaving}
                              onClick={() => setRpeValue(num)}
                              className={`h-10 rounded-xl font-black text-xs transition-all border flex items-center justify-center
                                ${rpeValue === num 
                                  ? 'bg-emerald-500 text-white border-emerald-500 font-extrabold shadow-sm' 
                                  : (isLight 
                                      ? 'bg-white text-slate-700 border-slate-200 hover:border-emerald-500 hover:text-emerald-700' 
                                      : 'bg-white/5 text-slate-400 border-white/5 hover:border-emerald-500/50 hover:text-emerald-400')}
                              `}
                            >
                              {num}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* 3. Feedback do Treino */}
                      <div className="space-y-2">
                        <label className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                          <MessageSquare className="w-4 h-4 text-emerald-500" /> Feedback para o Treinador
                        </label>
                        <textarea 
                          disabled={isSaving}
                          className="pro-input w-full h-28 focus:ring-4 focus:ring-emerald-500/20 text-xs py-3 px-4 rounded-2xl"
                          placeholder="Relate suas sensações, ritmos mantidos, cansaço ou qualquer observação relevante para o Coach..."
                          value={feedbackText}
                          onChange={e => setFeedbackText(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {!selectedWorkout.data.completed ? (
              <div className={`p-4 sm:p-6 border-t flex-shrink-0 font-sans ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-white/5'
              }`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowGpsTracker(true)}
                    className="py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>INICIAR COM GPS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!actualDistanceValue && selectedWorkout.data.distance) {
                        setActualDistanceValue(String(selectedWorkout.data.distance));
                      }
                      if (!actualDurationValue && selectedWorkout.data.durationMinutes) {
                        setActualDurationValue(`${selectedWorkout.data.durationMinutes}:00`);
                      }
                      setSelectedWorkout(prev => prev ? {
                        ...prev,
                        data: {
                          ...prev.data,
                          completed: true
                        }
                      } : null);
                    }}
                    className={`py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border flex items-center justify-center gap-2 cursor-pointer active:scale-95 ${
                      isLight 
                        ? 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300' 
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    <span>CONCLUIR (ESTEIRA / MANUAL)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className={`p-6 md:p-8 border-t flex-shrink-0 font-sans ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900 border-white/5'
              }`}>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleToggleComplete(false)} 
                      disabled={isSaving}
                      className={`py-4 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer
                        ${isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-white/5 hover:bg-white/10 text-slate-300'}
                        disabled:opacity-50`}
                    >
                      {selectedWorkout.data.type === 'Descanso' ? 'DESMARCAR DESCANSO' : 'DESMARCAR CONCLUÍDO'}
                    </button>
                    <button 
                      onClick={() => handleToggleComplete(true)} 
                      disabled={isSaving}
                      className="py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isSaving ? (
                        <div className="flex items-center gap-2">
                          {saveSuccess ? <Check className="w-5 h-5 animate-fade-in" /> : <Loader2 className="w-5 h-5 animate-spin" />}
                          <span>{saveSuccess ? 'SALVO!' : 'SALVANDO...'}</span>
                        </div>
                      ) : (
                        'SALVAR E CONCLUIR'
                      )}
                    </button>
                  </div>

                  {selectedWorkout.data.type !== 'Descanso' && (
                    <button
                      type="button"
                      onClick={() => {
                        const parsedDist = actualDistanceValue !== '' ? Number(String(actualDistanceValue).replace(',', '.')) : undefined;
                        const distKm = parsedDist || currentGpsRoute?.totalDistanceKm || selectedWorkout.data.actualDistance || selectedWorkout.data.distance || 0;
                        const durSec = actualDurationValue !== ''
                          ? parseDurationStringToSeconds(actualDurationValue)
                          : (currentGpsRoute?.durationSeconds || (selectedWorkout.data.actualDuration ? parseDurationStringToSeconds(selectedWorkout.data.actualDuration) : (selectedWorkout.data.distance ? Math.round(selectedWorkout.data.distance * 300) : 1800)));
                        const pace = calculatePace(
                          String(distKm),
                          actualDurationValue !== '' ? actualDurationValue : (selectedWorkout.data.actualDuration || formatSecondsToTimeString(currentGpsRoute?.durationSeconds || 1800))
                        );

                        setShareWorkoutData({
                          title: selectedWorkout.data.customDescription?.slice(0, 45) || `${selectedWorkout.data.type || 'Treino'}`,
                          athleteName: activeAthlete?.name,
                          date: selectedWorkout.data.date || new Date().toLocaleDateString('pt-BR'),
                          distanceKm: distKm,
                          durationSeconds: durSec,
                          avgPace: pace,
                          elevationGainMeters: currentGpsRoute?.elevationGainMeters || selectedWorkout.data.gpsRoute?.elevationGainMeters,
                          avgHeartRate: currentGpsRoute?.avgHeartRate || selectedWorkout.data.gpsRoute?.avgHeartRate,
                          route: currentGpsRoute || selectedWorkout.data.gpsRoute,
                          workoutType: selectedWorkout.data.type,
                          initialBackgroundType: 'photo',
                          initialPhotoUrl: (selectedWorkout.data as any).photoUrl || (selectedWorkout.data as any).imageUrl || undefined,
                          rpe: rpeValue || selectedWorkout.data.rpe
                        });
                        setSelectedWorkout(null);
                      }}
                      className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 text-emerald-400 border border-emerald-500/40 font-black text-xs uppercase italic tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-[0.98]"
                    >
                      <Camera className="w-4 h-4 text-emerald-400" />
                      <span>POSTAR FOTO DESTE TREINO</span>
                    </button>
                  )}
                </div>
              </div>
            )}
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

      {/* Hidden file inputs for Camera and Gallery photo pick */}
      <input
        ref={completionCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleCompletionPhotoUpload}
      />
      <input
        ref={completionGalleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCompletionPhotoUpload}
      />

      {/* Modal de Conclusão do Treino - Mensagem para Postar & Tirar Foto */}
      {completedWorkoutPrompt && createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div 
            className="bg-slate-900 border border-emerald-500/40 rounded-[2.5rem] p-6 sm:p-8 text-white shadow-2xl max-w-md w-full relative overflow-hidden space-y-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Ambient glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-500/20 blur-3xl pointer-events-none rounded-full" />

            {/* Header with celebration badge */}
            <div className="text-center relative z-10 space-y-2">
              <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 p-0.5 mx-auto shadow-lg shadow-emerald-500/30 animate-bounce">
                <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-3xl">
                  🎉
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400 italic">
                Treino Finalizado
              </span>
              <h3 className="text-2xl font-black italic uppercase tracking-tight text-white leading-none">
                Parabéns, Treino Concluído!
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Seus dados foram sincronizados com seu treinador. Deseja postar seu treino com uma foto agora?
              </p>
            </div>

            {/* Resumo do Treino (Métricas Calculadas: Distância, Tempo, Pace) */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-4 rounded-2xl border border-white/5 relative z-10">
              <div className="text-center space-y-0.5">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Distância</span>
                <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
                  {completedWorkoutPrompt.distanceKm} <span className="text-[9px]">KM</span>
                </span>
              </div>
              <div className="text-center space-y-0.5 border-x border-white/5">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Tempo</span>
                <span className="text-base sm:text-lg font-black font-mono text-white">
                  {formatSecondsToTimeString(completedWorkoutPrompt.durationSeconds)}
                </span>
              </div>
              <div className="text-center space-y-0.5">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Pace Médio</span>
                <span className="text-base sm:text-lg font-black font-mono text-teal-400">
                  {completedWorkoutPrompt.avgPace} <span className="text-[9px]">/km</span>
                </span>
              </div>
            </div>

            {/* Ações de Compartilhamento / Tirar Foto */}
            <div className="space-y-2.5 relative z-10 pt-1">
              {/* Botão Principal: Tirar Foto para o Treino */}
              <button
                type="button"
                onClick={() => {
                  if (completionCameraInputRef.current) {
                    completionCameraInputRef.current.click();
                  }
                }}
                className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs uppercase italic tracking-wider shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Camera className="w-5 h-5 text-slate-950 fill-current" />
                <span>Tirar Foto & Postar Treino</span>
              </button>

              {/* Botão Secundário: Galeria / Card sem foto de câmera */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (completionGalleryInputRef.current) {
                      completionGalleryInputRef.current.click();
                    }
                  }}
                  className="py-3 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Foto da Galeria</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShareWorkoutData({
                      title: completedWorkoutPrompt.workout.customDescription?.slice(0, 45) || `${completedWorkoutPrompt.workout.type || 'Treino'}`,
                      athleteName: activeAthlete?.name,
                      date: completedWorkoutPrompt.workout.date || new Date().toLocaleDateString('pt-BR'),
                      distanceKm: completedWorkoutPrompt.distanceKm,
                      durationSeconds: completedWorkoutPrompt.durationSeconds,
                      avgPace: completedWorkoutPrompt.avgPace,
                      elevationGainMeters: completedWorkoutPrompt.route?.elevationGainMeters,
                      avgHeartRate: completedWorkoutPrompt.route?.avgHeartRate,
                      route: completedWorkoutPrompt.route,
                      workoutType: completedWorkoutPrompt.workout.type,
                      rpe: completedWorkoutPrompt.rpe
                    });
                    setCompletedWorkoutPrompt(null);
                  }}
                  className="py-3 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>Card Oficial</span>
                </button>
              </div>

              {/* Dispensar */}
              <button
                type="button"
                onClick={() => setCompletedWorkoutPrompt(null)}
                className="w-full py-2.5 text-center text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
              >
                Agora Não / Concluir
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de Compartilhamento Social de Treino (Card / Story) */}
      {shareWorkoutData && (
        <WorkoutShareModal
          data={shareWorkoutData}
          onClose={() => setShareWorkoutData(null)}
        />
      )}

      {/* Standalone Fullscreen GPS Running Portal */}
      {showGpsTracker && selectedWorkout && createPortal(
        <div className="fixed inset-0 z-[10000] bg-black overflow-hidden select-none">
          <GpsWorkoutTracker
            workoutType={selectedWorkout.data.type}
            plannedDistanceKm={selectedWorkout.data.distance}
            existingRoute={currentGpsRoute}
            structuredWorkout={{
              ...selectedWorkout.data.structuredWorkout,
              steps: localSteps
            }}
            workoutDescription={selectedWorkout.data.customDescription}
            athletePaces={paces}
            onRouteCaptured={(route) => {
              setCurrentGpsRoute(route);
              setActualDistanceValue(String(route.totalDistanceKm));
              setSelectedWorkout(prev => prev ? {
                ...prev,
                data: {
                  ...prev.data,
                  completed: true
                }
              } : null);
              setShowGpsTracker(false);
            }}
            onCancel={() => setShowGpsTracker(false)}
          />
        </div>,
        document.body
      )}
    </div>
  );
};

export default AthletePortal;

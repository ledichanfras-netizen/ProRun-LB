import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Upload, 
  Navigation, 
  Check, 
  AlertCircle, 
  RefreshCw, 
  Footprints,
  Timer,
  Volume2,
  VolumeX,
  FastForward,
  ChevronDown,
  ChevronUp,
  Layers,
  Flag,
  Flame,
  Settings,
  Camera,
  Share2,
  Sliders,
  Plus,
  Minus,
  Maximize2,
  Minimize2,
  Mic,
  MicOff,
  X,
  AlertTriangle,
  CheckCircle2,
  HeartPulse,
  Lock,
  Unlock,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { WorkoutMap } from './WorkoutMap';
import { 
  RouteData, 
  calculateHaversineDistance, 
  encodePolyline, 
  formatPace, 
  formatDuration, 
  parseGpxFile,
  ActiveWorkoutBackup,
  saveActiveWorkoutBackup,
  getActiveWorkoutBackup,
  clearActiveWorkoutBackup,
  convertBackupToRouteData
} from '../utils/gpsUtils';
import { 
  MotionCadenceTracker, 
  calculateRunningCalories, 
  announceKmSplit, 
  KmSplit, 
  TelemetryPoint, 
  downsampleTelemetry 
} from '../utils/runningMetrics';
import { WorkoutTelemetryCharts } from './WorkoutTelemetryCharts';
import { StructuredWorkout, WorkoutStep, StepType, StepTargetType, TrainingPace, WorkoutType } from '../types';
import { workoutAudio } from '../utils/workoutAudio';
import { 
  formatStepTarget,
  toggleWarmupInStructuredWorkout,
  toggleCooldownInStructuredWorkout,
  adjustIntervalCountInStructuredWorkout,
  adjustRestDurationInStructuredWorkout,
  parseWorkoutTextToStructure
} from '../utils/workoutParser';
import { StructuredWorkoutModal } from './StructuredWorkoutModal';
import { WorkoutShareModal, WorkoutShareData } from './WorkoutShareModal';
import { useApp } from '../contexts/AppContext';
import { HeartRateMonitor, HeartRateMeasurement } from '../utils/heartRateMonitor';

interface GpsWorkoutTrackerProps {
  workoutType: string;
  plannedDistanceKm?: number;
  existingRoute?: any;
  structuredWorkout?: StructuredWorkout;
  workoutDescription?: string;
  athletePaces?: TrainingPace[];
  athleteWeight?: number;
  workoutContext?: { weekIndex?: number; dayIndex?: number };
  autoResumeBackup?: boolean;
  onRouteCaptured: (route: RouteData) => void;
  onCancel?: () => void;
}

interface CompletedStepRecord {
  stepId: string;
  name: string;
  type: StepType;
  targetType: StepTargetType;
  targetValue: number;
  completedDistanceMeters: number;
  completedDurationSeconds: number;
  avgPace: string;
}

export const GpsWorkoutTracker: React.FC<GpsWorkoutTrackerProps> = ({
  workoutType,
  plannedDistanceKm,
  existingRoute,
  structuredWorkout: initialStructuredWorkout,
  workoutDescription,
  athletePaces,
  athleteWeight = 70,
  workoutContext,
  autoResumeBackup = false,
  onRouteCaptured,
  onCancel
}) => {
  const { theme: appTheme } = useApp();
  const isLight = appTheme === 'light';
  const [activeMode, setActiveMode] = useState<'live' | 'gpx'>('live');

  // Structured Workout State (Modo Detalhado)
  const initialResolvedStructured = useMemo(() => {
    if (initialStructuredWorkout && initialStructuredWorkout.steps && initialStructuredWorkout.steps.length > 0) {
      return initialStructuredWorkout;
    }
    if (workoutDescription) {
      return parseWorkoutTextToStructure(workoutDescription, workoutType, athletePaces);
    }
    return null;
  }, [initialStructuredWorkout, workoutDescription, workoutType, athletePaces]);

  const [activeStructured, setActiveStructured] = useState<StructuredWorkout | null>(initialResolvedStructured);

  useEffect(() => {
    if (initialResolvedStructured) {
      setActiveStructured(initialResolvedStructured);
    }
  }, [initialResolvedStructured]);
  const [showStructuredModal, setShowStructuredModal] = useState(false);
  const [showTunePanel, setShowTunePanel] = useState(false);
  const [adjustmentNotice, setAdjustmentNotice] = useState<string | null>(null);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [stepDistanceMeters, setStepDistanceMeters] = useState(0);
  const [stepDurationSeconds, setStepDurationSeconds] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<CompletedStepRecord[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showStepsList, setShowStepsList] = useState(false);
  const [shareModalData, setShareModalData] = useState<WorkoutShareData | null>(null);

  const showNotification = (msg: string) => {
    setAdjustmentNotice(msg);
    setTimeout(() => setAdjustmentNotice(null), 3000);
  };

  const handleToggleWarmup = () => {
    if (!activeStructured) return;
    const updated = toggleWarmupInStructuredWorkout(activeStructured);
    setActiveStructured(updated);
    const hasWarm = updated.steps.some(s => s.type === 'warmup');
    showNotification(hasWarm ? 'Aquecimento adicionado ao treino' : 'Aquecimento removido do treino');
    if (activeStepIndex >= updated.steps.length) {
      setActiveStepIndex(Math.max(0, updated.steps.length - 1));
    }
  };

  const handleToggleCooldown = () => {
    if (!activeStructured) return;
    const updated = toggleCooldownInStructuredWorkout(activeStructured);
    setActiveStructured(updated);
    const hasCool = updated.steps.some(s => s.type === 'cooldown');
    showNotification(hasCool ? 'Desaquecimento adicionado ao treino' : 'Desaquecimento removido do treino');
    if (activeStepIndex >= updated.steps.length) {
      setActiveStepIndex(Math.max(0, updated.steps.length - 1));
    }
  };

  const handleAdjustIntervals = (delta: number) => {
    if (!activeStructured) return;
    const updated = adjustIntervalCountInStructuredWorkout(activeStructured, delta);
    setActiveStructured(updated);
    const intervalCount = updated.steps.filter(s => s.type === 'interval').length;
    showNotification(delta > 0 ? `+1 Tiro adicionado (Total: ${intervalCount}x)` : `-1 Tiro removido (Total: ${intervalCount}x)`);
    if (activeStepIndex >= updated.steps.length) {
      setActiveStepIndex(Math.max(0, updated.steps.length - 1));
    }
  };

  const handleAdjustRest = (deltaSeconds: number) => {
    if (!activeStructured) return;
    const updated = adjustRestDurationInStructuredWorkout(activeStructured, deltaSeconds);
    setActiveStructured(updated);
    showNotification(deltaSeconds > 0 ? `+${deltaSeconds}s no tempo de descanso` : `${deltaSeconds}s no tempo de descanso`);
  };

  const handleAdjustCurrentStep = (deltaValue: number) => {
    if (!activeStructured || !activeStructured.steps[activeStepIndex]) return;
    const steps = [...activeStructured.steps];
    const cur = { ...steps[activeStepIndex] };
    if (cur.targetType === 'distance') {
      cur.targetValue = Math.max(100, cur.targetValue + deltaValue);
      showNotification(`Meta da etapa atual ajustada para ${cur.targetValue}m`);
    } else {
      cur.targetValue = Math.max(10, cur.targetValue + deltaValue);
      showNotification(`Meta da etapa atual ajustada para ${formatDuration(cur.targetValue)}`);
    }
    steps[activeStepIndex] = cur;
    setActiveStructured({
      ...activeStructured,
      steps
    });
  };

  // Live GPS Tracking States
  const [isTracking, setIsTracking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [distanceKm, setDistanceKm] = useState(0);
  const [currentPace, setCurrentPace] = useState('--:--');
  const [currentSpeedKmh, setCurrentSpeedKmh] = useState(0);
  const [gpsPoints, setGpsPoints] = useState<[number, number][]>([]);
  const [currentPosition, setCurrentPosition] = useState<[number, number] | null>(null);
  const [gpsAccuracyMeters, setGpsAccuracyMeters] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [heartRateBpm, setHeartRateBpm] = useState<number | null>(null);
  const [heartRateLastUpdatedAt, setHeartRateLastUpdatedAt] = useState<number | null>(null);
  const [heartRateAgeSeconds, setHeartRateAgeSeconds] = useState<number | null>(null);
  const [heartRateAverage, setHeartRateAverage] = useState<number | null>(null);
  const [heartRateMax, setHeartRateMax] = useState<number | null>(null);
  const [heartRateSamples, setHeartRateSamples] = useState<number[]>([]);
  const [heartRateStatus, setHeartRateStatus] = useState<'idle' | 'connecting' | 'connected' | 'unsupported' | 'error'>('idle');
  const [heartRateDeviceName, setHeartRateDeviceName] = useState<string | null>(null);
  const [heartRateError, setHeartRateError] = useState<string | null>(null);
  const heartRateMonitorRef = useRef(new HeartRateMonitor());

  // Running Biometrics & Telemetry States (Cadência, Calorias, Altimetria e Parciais por KM)
  const [currentCadence, setCurrentCadence] = useState<number>(0);
  const [maxCadence, setMaxCadence] = useState<number>(0);
  const [isCadenceSensorActive, setIsCadenceSensorActive] = useState<boolean>(false);
  const [currentCalories, setCurrentCalories] = useState<number>(0);
  const [elevationGainMeters, setElevationGainMeters] = useState<number>(0);
  const [voiceAlertsEnabled, setVoiceAlertsEnabled] = useState<boolean>(true);
  const [kmSplits, setKmSplits] = useState<KmSplit[]>([]);
  const [telemetrySamples, setTelemetrySamples] = useState<TelemetryPoint[]>([]);
  const [kmBannerNotice, setKmBannerNotice] = useState<{
    km: number;
    pace: string;
    totalTime: string;
    cadence?: number;
  } | null>(null);

  // Cadence Tracker Instance & Milestone Tracking Refs
  const cadenceTrackerRef = useRef(new MotionCadenceTracker());
  const lastAltitudeRef = useRef<number | null>(null);
  const lastKmSplitDurationRef = useRef<number>(0);
  const lastAnnouncedKmRef = useRef<number>(0);
  const kmSplitsRef = useRef<KmSplit[]>([]);
  const telemetrySamplesRef = useRef<TelemetryPoint[]>([]);
  const voiceAlertsEnabledRef = useRef<boolean>(true);
  const soundEnabledRef = useRef<boolean>(true);
  const currentSpeedRef = useRef<number>(0);

  // New UI & Audio States (Contagem Regressiva, Tela Grande Focus HUD, Confirmação ao Sair)
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(true);
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
  const countdownIntervalRef = useRef<any>(null);

  // Proteção Anti-Perda: Bloqueio de Tela (Pocket Lock), Aviso de Botão Voltar, Auto-Save & Recuperação
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [backButtonBlockedNotice, setBackButtonBlockedNotice] = useState(false);
  const [recoverableBackup, setRecoverableBackup] = useState<ActiveWorkoutBackup | null>(null);
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string | null>(null);
  const [showProtectionInfoModal, setShowProtectionInfoModal] = useState(false);

  // Timer de 3 segundos pressionado para Parar a Corrida (Hold-to-Stop)
  const [isHoldingStop, setIsHoldingStop] = useState(false);
  const [stopHoldProgress, setStopHoldProgress] = useState(0);
  const [stopHoldSecondsLeft, setStopHoldSecondsLeft] = useState(3);
  const stopHoldIntervalRef = useRef<any>(null);
  const stopHoldStartTimeRef = useRef<number | null>(null);
  const lastStopBeepSecondRef = useRef<number | null>(null);

  // GPX Upload States
  const [gpxUploading, setGpxUploading] = useState(false);
  const [gpxParsedRoute, setGpxParsedRoute] = useState<RouteData | null>(null);
  const [gpxError, setGpxError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Refs for Tracking
  const watchIdRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<any>(null);
  const lastPositionRef = useRef<{ lat: number; lng: number; time: number } | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Clean up intervals on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
      }
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      cadenceTrackerRef.current.stop();
    };
  }, []);

  // Sync Audio Setting
  useEffect(() => {
    workoutAudio.setSoundEnabled(soundEnabled);
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  useEffect(() => {
    voiceAlertsEnabledRef.current = voiceAlertsEnabled;
  }, [voiceAlertsEnabled]);

  useEffect(() => {
    if (!heartRateLastUpdatedAt) {
      setHeartRateAgeSeconds(null);
      return;
    }

    const updateHeartRateAge = () => {
      setHeartRateAgeSeconds(Math.max(0, Math.floor((Date.now() - heartRateLastUpdatedAt) / 1000)));
    };
    updateHeartRateAge();
    const interval = setInterval(updateHeartRateAge, 1000);
    return () => clearInterval(interval);
  }, [heartRateLastUpdatedAt]);

  // Keep state accessible in intervals & callbacks
  const trackingRef = useRef({
    activeStructured,
    activeStepIndex,
    stepDistanceMeters,
    stepDurationSeconds,
    durationSeconds,
    distanceKm,
    completedSteps
  });

  useEffect(() => {
    trackingRef.current = {
      activeStructured,
      activeStepIndex,
      stepDistanceMeters,
      stepDurationSeconds,
      durationSeconds,
      distanceKm,
      completedSteps
    };
  }, [activeStructured, activeStepIndex, stepDistanceMeters, stepDurationSeconds, durationSeconds, distanceKm, completedSteps]);

  // 1. BLINDAGEM CONTRA BOTÃO VOLTAR DO CELULAR & RECARREGAMENTO ACIDENTAL
  useEffect(() => {
    if (!isTracking && !isPaused) return;

    // Empurra um estado-sentinela na pilha de histórico do navegador mobile
    window.history.pushState({ prorunGpsActiveGuard: true }, '', window.location.href);

    const handlePopState = () => {
      // Impede que o botão Voltar do celular feche a corrida re-inserindo a trava
      window.history.pushState({ prorunGpsActiveGuard: true }, '', window.location.href);
      workoutAudio.playCountdown(1);
      setBackButtonBlockedNotice(true);
      setTimeout(() => setBackButtonBlockedNotice(false), 5000);
      if (!isScreenLocked) {
        setShowExitConfirmModal(true);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Sua corrida ainda está em andamento! Os dados estão protegidos.';
      return e.returnValue;
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isTracking, isPaused, isScreenLocked]);

  // 2. AUTO-SAVE CONTÍNUO EM TEMPO REAL NO DISPOSITIVO (Recuperação contra fechamento/queda)
  useEffect(() => {
    if (!isTracking && !isPaused) return;
    if (durationSeconds < 2 && distanceKm <= 0) return;

    saveActiveWorkoutBackup({
      workoutType,
      workoutDescription,
      plannedDistanceKm,
      athleteWeight,
      weekIndex: workoutContext?.weekIndex,
      dayIndex: workoutContext?.dayIndex,
      distanceKm,
      durationSeconds,
      currentPace,
      gpsPoints,
      currentPosition,
      elevationGainMeters,
      currentCalories,
      currentCadence,
      maxCadence,
      heartRateAverage,
      heartRateMax,
      kmSplits: kmSplitsRef.current,
      telemetrySamples: telemetrySamplesRef.current,
      activeStepIndex,
      stepDistanceMeters,
      stepDurationSeconds,
      completedSteps,
      activeStructured,
      savedAt: new Date().toISOString()
    });

    setLastAutoSavedTime(
      new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    );
  }, [
    isTracking,
    isPaused,
    durationSeconds,
    distanceKm,
    gpsPoints.length,
    activeStepIndex,
    completedSteps.length
  ]);

  // 3. VERIFICAR SE EXISTE UMA CORRIDA INTERROMPIDA PARA RECUPERAR IMEDIATAMENTE
  useEffect(() => {
    const saved = getActiveWorkoutBackup();
    if (saved) {
      if (autoResumeBackup) {
        restoreWorkoutFromBackup(saved, true);
      } else {
        setRecoverableBackup(saved);
      }
    }
  }, []);

  const restoreWorkoutFromBackup = (backup: ActiveWorkoutBackup, autoStart: boolean = true) => {
    setDistanceKm(backup.distanceKm || 0);
    setDurationSeconds(backup.durationSeconds || 0);
    setCurrentPace(backup.currentPace || formatPace(backup.durationSeconds || 0, backup.distanceKm || 0));
    setGpsPoints(backup.gpsPoints || []);
    if (backup.currentPosition) {
      setCurrentPosition(backup.currentPosition);
    } else if (backup.gpsPoints && backup.gpsPoints.length > 0) {
      const lastPt = backup.gpsPoints[backup.gpsPoints.length - 1];
      setCurrentPosition(lastPt);
      lastPositionRef.current = { lat: lastPt[0], lng: lastPt[1], time: Date.now() };
    }
    setElevationGainMeters(backup.elevationGainMeters || 0);
    setCurrentCalories(backup.currentCalories || 0);
    setCurrentCadence(backup.currentCadence || 0);
    setMaxCadence(backup.maxCadence || 0);
    if (backup.heartRateAverage) setHeartRateAverage(backup.heartRateAverage);
    if (backup.heartRateMax) setHeartRateMax(backup.heartRateMax);
    if (backup.kmSplits && backup.kmSplits.length > 0) {
      kmSplitsRef.current = backup.kmSplits;
      setKmSplits(backup.kmSplits);
      lastAnnouncedKmRef.current = Math.floor(backup.distanceKm || 0);
      lastKmSplitDurationRef.current = backup.kmSplits[backup.kmSplits.length - 1]?.splitTimeSeconds || 0;
    }
    if (backup.telemetrySamples && backup.telemetrySamples.length > 0) {
      telemetrySamplesRef.current = backup.telemetrySamples;
      setTelemetrySamples(backup.telemetrySamples);
    }
    if (backup.activeStructured) {
      setActiveStructured(backup.activeStructured);
    }
    setActiveStepIndex(backup.activeStepIndex || 0);
    setStepDistanceMeters(backup.stepDistanceMeters || 0);
    setStepDurationSeconds(backup.stepDurationSeconds || 0);
    setCompletedSteps(backup.completedSteps || []);
    setRecoverableBackup(null);
    showNotification('🛡️ Corrida recuperada com sucesso de onde você parou!');
    if (autoStart) {
      workoutAudio.init();
      workoutAudio.speakText('Corrida recuperada! Retomando rastreamento.', true);
      startTrackingInternal();
    } else {
      setIsTracking(true);
      setIsPaused(true);
    }
  };

  const simulateBackButtonPress = () => {
    workoutAudio.init();
    workoutAudio.playCountdown(1);
    setBackButtonBlockedNotice(true);
    setTimeout(() => setBackButtonBlockedNotice(false), 5000);
    if (!isScreenLocked) {
      setShowExitConfirmModal(true);
    }
  };

  // Wake Lock API: Keeps the screen awake during active running
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator && (navigator as any).wakeLock) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      console.log('WakeLock error:', err);
    }
  };

  const releaseWakeLock = () => {
    try {
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    } catch (err) {}
  };

  const handleHeartRateMeasurement = (measurement: HeartRateMeasurement) => {
    setHeartRateBpm(measurement.bpm);
    setHeartRateLastUpdatedAt(measurement.timestamp);
    setHeartRateSamples(prev => {
      const next = [...prev, measurement.bpm].slice(-600);
      setHeartRateAverage(Math.round(next.reduce((sum, value) => sum + value, 0) / next.length));
      setHeartRateMax(Math.max(...next));
      return next;
    });
  };

  const connectHeartRate = async () => {
    const monitor = heartRateMonitorRef.current;
    if (!monitor.isSupported) {
      setHeartRateStatus('unsupported');
      setHeartRateError('Use Chrome ou Edge em um dispositivo compatível com Bluetooth LE.');
      return;
    }

    setHeartRateStatus('connecting');
    setHeartRateError(null);
    try {
      const device = await monitor.connect(handleHeartRateMeasurement, () => {
        setHeartRateStatus('idle');
        setHeartRateDeviceName(null);
        setHeartRateBpm(null);
        setHeartRateLastUpdatedAt(null);
      });
      setHeartRateDeviceName(device.name);
      setHeartRateStatus('connected');
    } catch (error: any) {
      setHeartRateStatus('error');
      setHeartRateError(error?.message || 'Não foi possível conectar o sensor.');
    }
  };

  const disconnectHeartRate = async () => {
    await heartRateMonitorRef.current.disconnect();
    setHeartRateStatus('idle');
    setHeartRateDeviceName(null);
    setHeartRateBpm(null);
    setHeartRateLastUpdatedAt(null);
  };

  // ADVANCE STEP / LAP FUNCTION WITH VOICE SYNTHESIS
  const advanceStep = (manualLap: boolean = false) => {
    const { activeStructured: struct, activeStepIndex: curIdx, stepDistanceMeters: curDist, stepDurationSeconds: curDur, completedSteps: prevComp } = trackingRef.current;
    if (!struct || !struct.steps || struct.steps.length === 0) return;

    const currentStep = struct.steps[curIdx];
    if (!currentStep) return;

    // Record completed step metrics
    const stepAvgPace = formatPace(curDur, curDist / 1000);
    const newRecord: CompletedStepRecord = {
      stepId: currentStep.id,
      name: currentStep.name,
      type: currentStep.type,
      targetType: currentStep.targetType,
      targetValue: currentStep.targetValue,
      completedDistanceMeters: Math.round(curDist),
      completedDurationSeconds: curDur,
      avgPace: stepAvgPace
    };

    setCompletedSteps(prev => [...prev, newRecord]);

    const nextIndex = curIdx + 1;
    if (nextIndex < struct.steps.length) {
      // Transition to next step
      const nextStep = struct.steps[nextIndex];
      setActiveStepIndex(nextIndex);
      setStepDistanceMeters(0);
      setStepDurationSeconds(0);
      workoutAudio.playStepTransition();

      // Announce Next Step via Voice
      const targetStr = formatStepTarget(nextStep);
      workoutAudio.speakText(`Próxima etapa: ${nextStep.name}. Meta: ${targetStr}`, true);
    } else {
      // Completed all steps of the workout!
      setActiveStepIndex(nextIndex);
      workoutAudio.playWorkoutComplete();
      workoutAudio.speakText("Parabéns! Você concluiu todas as etapas do treino!", true);
    }
  };

  // Start Live Tracking with Countdown and Voice Audio
  const initiateStartWithCountdown = () => {
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocalização não é suportada neste dispositivo.');
      return;
    }

    workoutAudio.init();
    setGpsError(null);
    setHeartRateBpm(null);
    setHeartRateLastUpdatedAt(null);
    setHeartRateAverage(null);
    setHeartRateMax(null);
    setHeartRateSamples([]);

    // Pre-start 5 second countdown with speech
    let remaining = 5;
    setCountdownSeconds(remaining);
    workoutAudio.playCountdown(remaining);
    workoutAudio.speakText("Cinco", true);

    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }

    countdownIntervalRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdownSeconds(remaining);
        workoutAudio.playCountdown(remaining);
        const words: Record<number, string> = { 4: 'Quatro', 3: 'Três', 2: 'Dois', 1: 'Um' };
        if (words[remaining]) {
          workoutAudio.speakText(words[remaining], true);
        }
      } else {
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setCountdownSeconds(null);
        workoutAudio.playStepTransition();
        workoutAudio.speakText("Vai! Iniciando treino!", true);
        startTrackingInternal();
      }
    }, 1000);
  };

  const cancelCountdown = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdownSeconds(null);
  };

  const skipCountdownAndStart = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdownSeconds(null);
    workoutAudio.playStepTransition();
    workoutAudio.speakText("Iniciando treino!", true);
    startTrackingInternal();
  };

  // Actual GPS Watch Initialization
  const startTrackingInternal = () => {
    setIsTracking(true);
    setIsPaused(false);
    setIsFocusMode(true); // Abre automaticamente a tela grande intuitiva de treino
    requestWakeLock();

    // Announce initial step if structured workout
    if (activeStructured && activeStructured.steps && activeStructured.steps[0]) {
      const firstStep = activeStructured.steps[0];
      setTimeout(() => {
        workoutAudio.speakText(`Iniciando ${firstStep.name}. Meta: ${formatStepTarget(firstStep)}`);
      }, 1200);
    }

    // Start cadence sensor (accelerometer with speed kinematic fallback)
    void cadenceTrackerRef.current.start();

    // Timer Interval (every 1 second)
    timerIntervalRef.current = setInterval(() => {
      setDurationSeconds(prev => {
        const nextDur = prev + 1;
        // Live biometric updates every second
        const { spm, isSensorActive } = cadenceTrackerRef.current.getCadence(currentSpeedRef.current);
        setCurrentCadence(spm);
        if (spm > 0) {
          setMaxCadence(old => Math.max(old, spm));
        }
        setIsCadenceSensorActive(isSensorActive);
        return nextDur;
      });

      setStepDurationSeconds(prev => {
        const nextSec = prev + 1;
        const { activeStructured: struct, activeStepIndex: curIdx } = trackingRef.current;
        if (struct && struct.steps && curIdx < struct.steps.length) {
          const currentStep = struct.steps[curIdx];
          if (currentStep.targetType === 'time') {
            const timeLeft = currentStep.targetValue - nextSec;
            if (timeLeft <= 5 && timeLeft > 0) {
              workoutAudio.playCountdown(timeLeft);
              workoutAudio.speakText(`${timeLeft}`);
            } else if (timeLeft <= 0) {
              // Time step completed!
              setTimeout(() => advanceStep(false), 50);
            }
          }
        }
        return nextSec;
      });
    }, 1000);

    // Watch Position with High Accuracy GPS
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, accuracy, speed, altitude } = position.coords;
          setGpsAccuracyMeters(Math.round(accuracy));
          setCurrentPosition([latitude, longitude]);

          // Discard inaccurate coordinates (> 35 meters error)
          if (accuracy > 35) {
            return;
          }

          // Elevation gain tracking
          if (altitude !== null && altitude !== undefined && !isNaN(altitude)) {
            if (lastAltitudeRef.current !== null) {
              const diff = altitude - lastAltitudeRef.current;
              if (diff > 0.4 && diff < 45) {
                setElevationGainMeters(prev => prev + Math.round(diff));
              }
            }
            lastAltitudeRef.current = altitude;
          }

          const now = Date.now();
          if (speed !== null && speed !== undefined && speed >= 0) {
            const kmh = Number((speed * 3.6).toFixed(1));
            setCurrentSpeedKmh(kmh);
            currentSpeedRef.current = kmh;
          }

          if (lastPositionRef.current) {
            const dKm = calculateHaversineDistance(
              lastPositionRef.current.lat,
              lastPositionRef.current.lng,
              latitude,
              longitude
            );

            const timeDiffSec = (now - lastPositionRef.current.time) / 1000;
            const approxSpeedKmh = (dKm / (timeDiffSec / 3600));

            // Discard jitter (< 3m) or unrealistic GPS leaps (> 70 km/h)
            if (dKm > 0.003 && approxSpeedKmh < 70) {
              const deltaMeters = dKm * 1000;

              setDistanceKm(prev => {
                const newDist = prev + dKm;
                const curDuration = trackingRef.current.durationSeconds;

                // Calorie update
                const kcal = calculateRunningCalories(athleteWeight, newDist, elevationGainMeters);
                setCurrentCalories(kcal);

                // Cadence check
                const { spm } = cadenceTrackerRef.current.getCadence(currentSpeedRef.current);
                const activeSpm = spm > 0 ? spm : undefined;

                // Check for integer KM Milestone (Ex: 1km, 2km, 3km...)
                const currentKmInteger = Math.floor(newDist);
                if (currentKmInteger > lastAnnouncedKmRef.current) {
                  for (let km = lastAnnouncedKmRef.current + 1; km <= currentKmInteger; km++) {
                    const splitDur = Math.max(1, curDuration - lastKmSplitDurationRef.current);
                    const splitPace = formatPace(splitDur, 1);
                    const splitKcal = calculateRunningCalories(athleteWeight, 1);

                    const newSplit: KmSplit = {
                      km,
                      durationSeconds: splitDur,
                      splitTimeSeconds: curDuration,
                      pace: splitPace,
                      paceSeconds: splitDur,
                      avgCadence: activeSpm,
                      calories: splitKcal
                    };

                    kmSplitsRef.current.push(newSplit);
                    setKmSplits([...kmSplitsRef.current]);

                    lastKmSplitDurationRef.current = curDuration;
                    lastAnnouncedKmRef.current = km;

                    // Speech Announcement for KM (Tempo Total e Pace do KM)
                    if (voiceAlertsEnabledRef.current && soundEnabledRef.current) {
                      announceKmSplit(km, curDuration, splitDur, activeSpm);
                    }

                    // Visual HUD Toast
                    setKmBannerNotice({
                      km,
                      pace: splitPace,
                      totalTime: formatDuration(curDuration),
                      cadence: activeSpm
                    });
                    setTimeout(() => setKmBannerNotice(null), 6500);
                  }
                }

                // Periodic telemetry sample (every ~75m)
                const lastSampleDist = telemetrySamplesRef.current.length > 0 
                  ? telemetrySamplesRef.current[telemetrySamplesRef.current.length - 1].distanceKm 
                  : 0;
                if (newDist - lastSampleDist >= 0.075 || kmSplitsRef.current.length === 0) {
                  const paceSec = newDist > 0 ? Math.round(curDuration / newDist) : 330;
                  telemetrySamplesRef.current.push({
                    distanceKm: Number(newDist.toFixed(2)),
                    durationSeconds: curDuration,
                    paceSeconds: paceSec,
                    paceFormatted: formatPace(curDuration, newDist),
                    cadenceSpm: activeSpm || 165,
                    altitudeMeters: altitude ? Math.round(altitude) : undefined,
                    calories: kcal,
                    heartRate: heartRateBpm || undefined
                  });
                  setTelemetrySamples([...telemetrySamplesRef.current]);
                }

                setDurationSeconds(curTime => {
                  setCurrentPace(formatPace(curTime, newDist));
                  return curTime;
                });
                return newDist;
              });

              // Update step distance
              setStepDistanceMeters(prev => {
                const nextMeters = prev + deltaMeters;
                const { activeStructured: struct, activeStepIndex: curIdx } = trackingRef.current;
                if (struct && struct.steps && curIdx < struct.steps.length) {
                  const currentStep = struct.steps[curIdx];
                  if (currentStep.targetType === 'distance') {
                    if (nextMeters >= currentStep.targetValue) {
                      // Distance step completed!
                      setTimeout(() => advanceStep(false), 50);
                    }
                  }
                }
                return nextMeters;
              });

              setGpsPoints(prev => [...prev, [latitude, longitude]]);
              lastPositionRef.current = { lat: latitude, lng: longitude, time: now };
            }
          } else {
            // First fix
            lastPositionRef.current = { lat: latitude, lng: longitude, time: now };
            setGpsPoints([[latitude, longitude]]);
          }
        },
        (error) => {
          console.error('GPS Error:', error);
          if (error.code === error.PERMISSION_DENIED) {
            setGpsError('Permissão de GPS negada. Ative o acesso à localização nas configurações do celular.');
          } else if (error.code === error.POSITION_UNAVAILABLE) {
            setGpsError('Sinal de GPS indisponível no momento. Vá para uma área aberta.');
          } else {
            setGpsError('Buscando satélites GPS...');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 2000
        }
      );
    } catch (e: any) {
      setGpsError('Erro ao iniciar GPS: ' + (e?.message || ''));
    }
  };

  // Exit Confirmation Handlers
  const handleRequestExit = () => {
    if (isTracking || isPaused) {
      setShowExitConfirmModal(true);
    } else if (onCancel) {
      onCancel();
    }
  };

  const handleConfirmDiscardExit = () => {
    clearActiveWorkoutBackup();
    pauseTracking();
    setIsTracking(false);
    setIsFocusMode(false);
    setIsScreenLocked(false);
    setShowExitConfirmModal(false);
    if (onCancel) onCancel();
  };

  // Pause Tracking
  const pauseTracking = () => {
    setIsPaused(true);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    releaseWakeLock();
  };

  // Resume Tracking
  const resumeTracking = () => {
    setIsPaused(false);
    startTrackingInternal();
  };

  // Finish and Save Live Track
  const finishTracking = () => {
    if (stopHoldIntervalRef.current) {
      clearInterval(stopHoldIntervalRef.current);
      stopHoldIntervalRef.current = null;
    }
    setIsHoldingStop(false);
    setStopHoldProgress(0);
    setStopHoldSecondsLeft(3);
    clearActiveWorkoutBackup();
    pauseTracking();
    setIsTracking(false);
    setIsScreenLocked(false);
    void heartRateMonitorRef.current.disconnect();
    cadenceTrackerRef.current.stop();

    const finalAvgCadence = cadenceTrackerRef.current.getAverageCadence() || (currentCadence > 0 ? currentCadence : undefined);
    const finalCalories = currentCalories || calculateRunningCalories(athleteWeight, distanceKm, elevationGainMeters);

    // If there is any remaining distance after last integer KM (e.g. 5.35 km -> 0.35 km final split)
    if (distanceKm - lastAnnouncedKmRef.current >= 0.25) {
      const remainingDist = Number((distanceKm - lastAnnouncedKmRef.current).toFixed(2));
      const remainingSec = Math.max(1, durationSeconds - lastKmSplitDurationRef.current);
      kmSplitsRef.current.push({
        km: Number((lastAnnouncedKmRef.current + remainingDist).toFixed(1)),
        durationSeconds: remainingSec,
        splitTimeSeconds: durationSeconds,
        pace: formatPace(remainingSec, remainingDist),
        paceSeconds: Math.round(remainingSec / remainingDist),
        avgCadence: finalAvgCadence,
        calories: calculateRunningCalories(athleteWeight, remainingDist)
      });
      setKmSplits([...kmSplitsRef.current]);
    }

    // If no GPS coordinates or very short, save as an indoor/manual workout (e.g. treadmill or lost signal)
    if (gpsPoints.length < 2 && distanceKm < 0.05) {
      let finalCompleted = [...completedSteps];
      if (activeStructured && activeStructured.steps && activeStepIndex < activeStructured.steps.length && stepDurationSeconds > 5) {
        const curStep = activeStructured.steps[activeStepIndex];
        finalCompleted.push({
          stepId: curStep.id,
          name: curStep.name,
          type: curStep.type,
          targetType: curStep.targetType,
          targetValue: curStep.targetValue,
          completedDistanceMeters: Math.round(stepDistanceMeters),
          completedDurationSeconds: stepDurationSeconds,
          avgPace: "00:00"
        });
      }

      const routeData: RouteData = {
        polyline: '',
        points: [],
        totalDistanceKm: 0,
        totalDurationSeconds: durationSeconds,
        avgPace: "00:00",
        avgCadence: finalAvgCadence,
        calories: finalCalories,
        source: 'manual_or_indoor',
        recordedAt: new Date().toISOString(),
        avgHeartRate: heartRateAverage || undefined,
        completedSteps: finalCompleted.length > 0 ? finalCompleted : undefined
      };

      onRouteCaptured(routeData);
      return;
    }

    const polyline = encodePolyline(gpsPoints);
    const avgPace = formatPace(durationSeconds, distanceKm);

    // Save final lap if unfinished
    let finalCompleted = [...completedSteps];
    if (activeStructured && activeStructured.steps && activeStepIndex < activeStructured.steps.length && stepDurationSeconds > 5) {
      const curStep = activeStructured.steps[activeStepIndex];
      finalCompleted.push({
        stepId: curStep.id,
        name: curStep.name,
        type: curStep.type,
        targetType: curStep.targetType,
        targetValue: curStep.targetValue,
        completedDistanceMeters: Math.round(stepDistanceMeters),
        completedDurationSeconds: stepDurationSeconds,
        avgPace: formatPace(stepDurationSeconds, stepDistanceMeters / 1000)
      });
    }

    const routeData: RouteData = {
      polyline,
      points: gpsPoints,
      totalDistanceKm: Number(distanceKm.toFixed(2)),
      totalDurationSeconds: durationSeconds,
      avgPace,
      elevationGainMeters: elevationGainMeters || undefined,
      avgCadence: finalAvgCadence,
      maxCadence: maxCadence > 0 ? maxCadence : (finalAvgCadence ? finalAvgCadence + 12 : undefined),
      calories: finalCalories,
      kmSplits: kmSplitsRef.current.length > 0 ? kmSplitsRef.current : undefined,
      telemetrySamples: downsampleTelemetry(telemetrySamplesRef.current, 75),
      source: 'live_gps',
      recordedAt: new Date().toISOString(),
      avgHeartRate: heartRateAverage || undefined,
      completedSteps: finalCompleted.length > 0 ? finalCompleted : undefined
    };

    onRouteCaptured(routeData);
  };

  // Hold-to-Stop (Segurar 3 segundos para parar a corrida)
  const startHoldToStop = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e && 'touches' in e) {
      e.preventDefault();
    }
    if (stopHoldIntervalRef.current) {
      clearInterval(stopHoldIntervalRef.current);
    }
    workoutAudio.init();
    setIsHoldingStop(true);
    setStopHoldProgress(0);
    setStopHoldSecondsLeft(3);
    stopHoldStartTimeRef.current = Date.now();
    lastStopBeepSecondRef.current = 3;

    if (soundEnabled) {
      workoutAudio.playCountdown(3);
    }
    try {
      if (navigator.vibrate) navigator.vibrate(40);
    } catch {}

    const HOLD_DURATION_MS = 3000;

    stopHoldIntervalRef.current = setInterval(() => {
      if (!stopHoldStartTimeRef.current) return;
      const elapsed = Date.now() - stopHoldStartTimeRef.current;
      const pct = Math.min(100, (elapsed / HOLD_DURATION_MS) * 100);
      const secsRemaining = Math.max(0, Math.ceil((HOLD_DURATION_MS - elapsed) / 1000));

      setStopHoldProgress(pct);
      setStopHoldSecondsLeft(secsRemaining);

      if (secsRemaining > 0 && secsRemaining < 3 && lastStopBeepSecondRef.current !== secsRemaining) {
        lastStopBeepSecondRef.current = secsRemaining;
        if (soundEnabled) {
          workoutAudio.playCountdown(secsRemaining);
        }
        try {
          if (navigator.vibrate) navigator.vibrate(40);
        } catch {}
      }

      if (elapsed >= HOLD_DURATION_MS) {
        clearInterval(stopHoldIntervalRef.current);
        stopHoldIntervalRef.current = null;
        stopHoldStartTimeRef.current = null;
        lastStopBeepSecondRef.current = null;
        setIsHoldingStop(false);
        setStopHoldProgress(0);
        setStopHoldSecondsLeft(3);
        try {
          if (navigator.vibrate) navigator.vibrate([100, 50, 150]);
        } catch {}
        finishTracking();
      }
    }, 40);
  };

  const cancelHoldToStop = () => {
    if (!isHoldingStop && !stopHoldIntervalRef.current) return;
    const elapsed = stopHoldStartTimeRef.current ? Date.now() - stopHoldStartTimeRef.current : 0;
    if (stopHoldIntervalRef.current) {
      clearInterval(stopHoldIntervalRef.current);
      stopHoldIntervalRef.current = null;
    }
    stopHoldStartTimeRef.current = null;
    lastStopBeepSecondRef.current = null;
    setIsHoldingStop(false);
    setStopHoldProgress(0);
    setStopHoldSecondsLeft(3);

    if (elapsed > 30 && elapsed < 3000) {
      showNotification('⏳ Mantenha o botão Parar pressionado por 3 segundos para encerrar.');
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (stopHoldIntervalRef.current) clearInterval(stopHoldIntervalRef.current);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      void heartRateMonitorRef.current.disconnect();
      releaseWakeLock();
    };
  }, []);

  // Handle GPX File Upload
  const handleGpxFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setGpxError(null);
    setGpxUploading(true);

    try {
      const text = await file.text();
      const parsed = parseGpxFile(text);
      setGpxParsedRoute(parsed);
    } catch (err: any) {
      console.error('GPX parse error:', err);
      setGpxError(err?.message || 'Falha ao processar arquivo GPX.');
    } finally {
      setGpxUploading(false);
    }
  };

  const confirmGpxRoute = () => {
    if (!gpxParsedRoute) return;
    onRouteCaptured(gpxParsedRoute);
  };

  // Helpers for Active Step HUD
  const currentStep: WorkoutStep | null = 
    activeStructured && activeStructured.steps && activeStepIndex < activeStructured.steps.length
      ? activeStructured.steps[activeStepIndex]
      : null;

  const isWorkoutCompleted = activeStructured && activeStructured.steps && activeStepIndex >= activeStructured.steps.length;

  const getStepTheme = (type?: StepType) => {
    switch (type) {
      case 'interval':
        return {
          bg: isLight ? 'bg-amber-100 text-amber-950 border-amber-300 font-extrabold' : 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          bar: 'bg-amber-500',
          headerBg: isLight ? 'bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/15 border-amber-300/80 text-slate-900 shadow-xs' : 'bg-amber-950/40 border-amber-500/30 text-white',
          label: '⚡ TIRO / INTENSO',
          accent: isLight ? 'text-amber-700 font-black' : 'text-amber-400',
          titleColor: isLight ? 'text-slate-900' : 'text-white',
          subColor: isLight ? 'text-slate-600' : 'text-slate-400',
          boxBg: isLight ? 'bg-white border-amber-200' : 'bg-white/5 border-white/5'
        };
      case 'recovery':
        return {
          bg: isLight ? 'bg-emerald-100 text-emerald-950 border-emerald-300 font-extrabold' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          bar: 'bg-emerald-500',
          headerBg: isLight ? 'bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-emerald-500/15 border-emerald-300/80 text-slate-900 shadow-xs' : 'bg-emerald-950/40 border-emerald-500/30 text-white',
          label: '🌿 RECUPERAÇÃO / DESCANSO',
          accent: isLight ? 'text-emerald-700 font-black' : 'text-emerald-400',
          titleColor: isLight ? 'text-slate-900' : 'text-white',
          subColor: isLight ? 'text-slate-600' : 'text-slate-400',
          boxBg: isLight ? 'bg-white border-emerald-200' : 'bg-white/5 border-white/5'
        };
      case 'warmup':
        return {
          bg: isLight ? 'bg-teal-100 text-teal-950 border-teal-300 font-extrabold' : 'bg-teal-500/20 text-teal-300 border-teal-500/30',
          bar: 'bg-teal-500',
          headerBg: isLight ? 'bg-gradient-to-r from-teal-500/15 via-teal-500/10 to-teal-500/15 border-teal-300/80 text-slate-900 shadow-xs' : 'bg-teal-950/40 border-teal-500/30 text-white',
          label: '🔥 AQUECIMENTO',
          accent: isLight ? 'text-teal-700 font-black' : 'text-teal-400',
          titleColor: isLight ? 'text-slate-900' : 'text-white',
          subColor: isLight ? 'text-slate-600' : 'text-slate-400',
          boxBg: isLight ? 'bg-white border-teal-200' : 'bg-white/5 border-white/5'
        };
      case 'cooldown':
        return {
          bg: isLight ? 'bg-purple-100 text-purple-950 border-purple-300 font-extrabold' : 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          bar: 'bg-purple-500',
          headerBg: isLight ? 'bg-gradient-to-r from-purple-500/15 via-purple-500/10 to-purple-500/15 border-purple-300/80 text-slate-900 shadow-xs' : 'bg-purple-950/40 border-purple-500/30 text-white',
          label: '🧘 DESAQUECIMENTO',
          accent: isLight ? 'text-purple-700 font-black' : 'text-purple-400',
          titleColor: isLight ? 'text-slate-900' : 'text-white',
          subColor: isLight ? 'text-slate-600' : 'text-slate-400',
          boxBg: isLight ? 'bg-white border-purple-200' : 'bg-white/5 border-white/5'
        };
      default:
        return {
          bg: isLight ? 'bg-slate-200 text-slate-900 border-slate-300 font-extrabold' : 'bg-slate-800 text-slate-200 border-slate-700',
          bar: 'bg-emerald-500',
          headerBg: isLight ? 'bg-slate-100 border-slate-300 text-slate-900 shadow-xs' : 'bg-slate-900 border-white/10 text-white',
          label: '🏃 CORRIDA CONTÍNUA',
          accent: isLight ? 'text-emerald-700 font-black' : 'text-emerald-400',
          titleColor: isLight ? 'text-slate-900' : 'text-white',
          subColor: isLight ? 'text-slate-600' : 'text-slate-400',
          boxBg: isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/5'
        };
    }
  };

  const theme = getStepTheme(currentStep?.type);

  // Calculate Progress of Current Step
  let stepProgressPct = 0;
  let remainingText = '';
  if (currentStep) {
    if (currentStep.targetType === 'distance') {
      stepProgressPct = Math.min(100, Math.round((stepDistanceMeters / currentStep.targetValue) * 100));
      const remainingMeters = Math.max(0, currentStep.targetValue - Math.round(stepDistanceMeters));
      remainingText = `${remainingMeters}m restantes`;
    } else if (currentStep.targetType === 'time') {
      stepProgressPct = Math.min(100, Math.round((stepDurationSeconds / currentStep.targetValue) * 100));
      const remainingSecs = Math.max(0, currentStep.targetValue - stepDurationSeconds);
      remainingText = `${formatDuration(remainingSecs)} restantes`;
    }
  }

  // Calculate Current Step Pace
  const currentStepPace = formatPace(stepDurationSeconds, stepDistanceMeters / 1000);

  return (
    <div className={`border rounded-3xl p-4 sm:p-5 space-y-5 animate-fade-in shadow-2xl transition-all pb-32 sm:pb-36 ${
      isLight 
        ? 'bg-white border-slate-200 text-slate-900' 
        : 'bg-slate-950/95 border-white/10 text-white'
    }`}>
      {/* Header com Modos */}
      <div className={`flex items-center justify-between border-b pb-3 flex-wrap gap-2 ${
        isLight ? 'border-slate-200' : 'border-white/10'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
            isLight ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className={`text-sm font-black uppercase italic tracking-tight ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                Execução GPS ProRun
              </h3>
              {activeStructured && (
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                  isLight ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-blue-500/20 text-blue-300 border-blue-400/20'
                }`}>
                  DETALHADA
                </span>
              )}
            </div>
            <p className={`text-[10px] font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {workoutType} {plannedDistanceKm ? `• Meta: ${plannedDistanceKm} km` : ''}
            </p>
          </div>
        </div>

        {/* Controles de Topo: Som, Tela Cheia, Fechar e Alternador de Modo */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl text-xs transition-colors cursor-pointer ${
              soundEnabled 
                ? (isLight ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' : 'bg-white/10 text-emerald-400')
                : (isLight ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-slate-500')
            }`}
            title={soundEnabled ? 'Voz e alertas sonoros ativados' : 'Voz e alertas sonoros mudos'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {isTracking && (
            <button
              type="button"
              onClick={() => setIsFocusMode(!isFocusMode)}
              className={`p-2 rounded-xl text-xs transition-colors cursor-pointer ${
                isFocusMode 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : (isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-white/10 text-slate-200 hover:bg-white/20')
              }`}
              title={isFocusMode ? 'Sair do Modo Foco Tela Cheia' : 'Expandir Tela Grande de Execução'}
            >
              {isFocusMode ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          <button
            type="button"
            onClick={handleRequestExit}
            className={`p-2 rounded-xl text-xs transition-colors cursor-pointer ${
              isLight ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
            }`}
            title="Sair da execução do treino"
          >
            <X className="w-4 h-4" />
          </button>

          <div className={`flex p-1 rounded-xl border ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-white/5'
          }`}>
            <button
              type="button"
              onClick={() => { if (!isTracking) setActiveMode('live'); }}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase italic transition-all cursor-pointer ${
                activeMode === 'live'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white')
              }`}
            >
              GPS
            </button>
            <button
              type="button"
              onClick={() => { if (!isTracking) setActiveMode('gpx'); }}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase italic transition-all cursor-pointer ${
                activeMode === 'gpx'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : (isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white')
              }`}
            >
              .GPX
            </button>
          </div>
        </div>
      </div>

      {/* Card de Recuperação Automática de Corrida Interrompida (Crash / Botão Voltar) */}
      {recoverableBackup && !isTracking && (
        <div className="p-4 rounded-2xl border-2 border-amber-500/60 bg-gradient-to-r from-amber-950/60 via-slate-900 to-emerald-950/50 text-white shadow-2xl space-y-3 animate-fade-in">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                  🛡️ Auto-Save Encontrado
                </span>
                <h4 className="text-sm font-black uppercase italic tracking-tight text-white mt-1">
                  Corrida Interrompida Protegida!
                </h4>
                <p className="text-[11px] text-slate-300 font-medium">
                  Recuperamos seu treino de <strong className="text-emerald-400 font-mono">{recoverableBackup.distanceKm.toFixed(2)} km</strong> em <strong className="text-amber-300 font-mono">{formatDuration(recoverableBackup.durationSeconds)}</strong> ({recoverableBackup.gpsPoints?.length || 0} pontos GPS).
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => restoreWorkoutFromBackup(recoverableBackup, true)}
              className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase italic tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retomar de Onde Parou</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const route = convertBackupToRouteData(recoverableBackup);
                clearActiveWorkoutBackup();
                setRecoverableBackup(null);
                onRouteCaptured(route);
              }}
              className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase italic tracking-wider flex items-center justify-center gap-1.5 shadow-lg cursor-pointer transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Salvar Treino Agora</span>
            </button>
            <button
              type="button"
              onClick={() => {
                clearActiveWorkoutBackup();
                setRecoverableBackup(null);
              }}
              className="py-2.5 px-3 rounded-xl bg-white/10 hover:bg-red-500/20 text-slate-300 hover:text-red-300 font-bold text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all"
            >
              <X className="w-3.5 h-3.5" />
              <span>Descartar</span>
            </button>
          </div>
        </div>
      )}

      {/* Barra de Blindagem Anti-Perda (Trava do Botão Voltar + Auto-Save + Bloqueio de Bolso) */}
      <div className={`px-3.5 py-2.5 rounded-2xl border flex items-center justify-between gap-2 flex-wrap ${
        isLight 
          ? 'bg-emerald-50/90 border-emerald-200 text-slate-800' 
          : 'bg-emerald-950/30 border-emerald-500/25 text-slate-200'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <div className="text-[10px] leading-tight">
            <span className="font-black uppercase tracking-wider text-emerald-500">
              Blindagem Anti-Perda Ativa:
            </span>{' '}
            <span className={isLight ? 'text-slate-600 font-medium' : 'text-slate-300 font-medium'}>
              Botão Voltar bloqueado • Auto-Save a cada segundo{lastAutoSavedTime ? ` (${lastAutoSavedTime})` : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {isTracking && (
            <button
              type="button"
              onClick={() => setIsScreenLocked(!isScreenLocked)}
              className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all ${
                isScreenLocked
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : (isLight ? 'bg-slate-200 text-slate-800 hover:bg-slate-300' : 'bg-white/10 text-slate-200 hover:bg-white/20')
              }`}
              title="Bloquear tela contra toques acidentais no bolso ou suor"
            >
              {isScreenLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              <span>{isScreenLocked ? 'Tela Trancada' : 'Trancar Tela'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowProtectionInfoModal(true)}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all ${
              isLight 
                ? 'bg-emerald-600 text-white hover:bg-emerald-500' 
                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            Como Funciona / Testar
          </button>
        </div>
      </div>

      {/* Aviso Flutuante quando o Botão Voltar do Celular é Interceptado */}
      {backButtonBlockedNotice && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 text-slate-950 font-black text-xs uppercase italic tracking-wider flex items-center justify-between gap-3 shadow-2xl animate-bounce">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-slate-950 shrink-0" />
            <span>🛡️ Botão Voltar Bloqueado! Sua corrida continua salva e protegida.</span>
          </div>
        </div>
      )}

      {/* Notificação Flutuante de Ajuste no Treino */}
      {adjustmentNotice && (
        <div className="bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-2xl font-black text-xs uppercase italic tracking-wider flex items-center gap-2 shadow-xl animate-bounce">
          <Check className="w-4 h-4 text-slate-950" />
          <span>{adjustmentNotice}</span>
        </div>
      )}

      {/* MODO 1: LIVE GPS NO CELULAR (COM SUPORTE A PRESCRIÇÃO DETALHADA) */}
      {activeMode === 'live' && (
        <div className="space-y-4">

          {/* =========================================================================
           * 1. CARD PRINCIPAL: OBJETIVO DA CORRIDA & PRESCRIÇÃO DO COACH (QUANDO HOUVER)
           * ========================================================================= */}
          <div className={`p-4 sm:p-5 rounded-3xl border shadow-xl transition-all relative overflow-hidden ${
            isLight 
              ? 'bg-gradient-to-br from-emerald-50 via-white to-teal-50/70 border-emerald-300/80 text-slate-900' 
              : 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 border-emerald-500/30 text-white'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                  isLight ? 'bg-emerald-600 text-white' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  <Flag className="w-5 h-5" />
                </div>
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 shadow-xs">
                      🎯 Objetivo do Treino
                    </span>
                    {workoutType && (
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                        isLight ? 'bg-white border-slate-300 text-slate-700' : 'bg-white/10 border-white/10 text-slate-300'
                      }`}>
                        {workoutType}
                      </span>
                    )}
                  </div>
                  
                  {/* Nome / Descrição Principal do Objetivo (Ex: Longão 12km em Z2) */}
                  <h3 className={`text-base sm:text-lg font-black uppercase italic tracking-tight leading-snug break-words ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}>
                    {workoutDescription || (
                      plannedDistanceKm 
                        ? `${workoutType} ${plannedDistanceKm} km`
                        : `${workoutType} - Treino Prescrito`
                    )}
                  </h3>

                  {/* Resumo Rápido das Metas */}
                  <div className="flex items-center gap-2.5 flex-wrap pt-0.5 text-xs">
                    {plannedDistanceKm && plannedDistanceKm > 0 && (
                      <span className={`font-black font-mono flex items-center gap-1 ${
                        isLight ? 'text-emerald-700' : 'text-emerald-400'
                      }`}>
                        📏 Meta: <strong>{plannedDistanceKm} km</strong>
                      </span>
                    )}
                    {activeStructured && activeStructured.steps && activeStructured.steps.length > 0 && (
                      <span className={`font-bold flex items-center gap-1 ${
                        isLight ? 'text-blue-700' : 'text-blue-400'
                      }`}>
                        ⏱️ <strong>{activeStructured.steps.length} etapas guiadas</strong>
                      </span>
                    )}
                    {athletePaces && athletePaces.length > 0 && (
                      <span className={`text-[11px] font-medium ${
                        isLight ? 'text-slate-600' : 'text-slate-400'
                      }`}>
                        • Zonas personalizadas do Coach
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =========================================================================
           * 2. CARD HERO DE LARGADA IMEDIATA: BOTÃO INICIAR CORRIDA (SUPER DESTACADO)
           * ========================================================================= */}
          {!isTracking && (
            <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 text-white shadow-2xl border-2 border-emerald-400/50 flex flex-col sm:flex-row items-center justify-between gap-4 animate-pulse-subtle">
              <div className="flex items-center gap-3.5 text-center sm:text-left">
                <div className="w-12 sm:w-14 h-12 sm:h-14 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center shrink-0 shadow-lg">
                  <Play className="w-6 sm:w-7 h-6 sm:h-7 fill-white text-white ml-1 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-400/30">
                    GPS & Sensores Prontos
                  </span>
                  <h4 className="text-base sm:text-lg font-black uppercase italic tracking-tight text-white mt-1">
                    Pronto para a Corrida?
                  </h4>
                  <p className="text-[11px] sm:text-xs text-emerald-100 font-medium">
                    Toque no botão para iniciar a gravação do percurso e métricas.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={initiateStartWithCountdown}
                className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-emerald-50 text-slate-950 font-black text-sm sm:text-base uppercase italic tracking-wider rounded-2xl shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 cursor-pointer border-2 border-emerald-300 group"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white group-hover:scale-110 transition-transform">
                  <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                </div>
                <span>INICIAR CORRIDA</span>
              </button>
            </div>
          )}
          {/* PAINEL DE AJUSTES RÁPIDOS E FLEXIBILIDADE DO TREINO (ANTES E DURANTE A CORRIDA) */}
          {activeStructured && (showTunePanel || isTracking) && (
            <div className={`border p-3.5 rounded-2xl space-y-3 transition-all ${
              isLight 
                ? 'bg-amber-50/90 border-amber-300 text-slate-900 shadow-xs' 
                : 'bg-slate-900/90 border-amber-500/20 text-white'
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-[10px] font-black uppercase italic tracking-wider flex items-center gap-1.5 ${
                  isLight ? 'text-amber-900' : 'text-amber-300'
                }`}>
                  <Sliders className="w-3.5 h-3.5 text-amber-500" />
                  Flexibilidade do Treino (Ajustes ao Vivo)
                </span>
                {!isTracking && (
                  <button
                    type="button"
                    onClick={() => setShowTunePanel(false)}
                    className={`text-[9px] ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
                  >
                    Ocultar
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* 1. Aquecimento */}
                <button
                  type="button"
                  onClick={handleToggleWarmup}
                  className={`p-2 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
                    isLight 
                      ? 'bg-white border-amber-200 hover:bg-amber-100/50 text-slate-800' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-200'
                  }`}
                >
                  <span className={`text-[9px] font-bold uppercase block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Aquecimento</span>
                  <span className={`text-[10px] font-black flex items-center gap-1 mt-1 ${isLight ? 'text-blue-700' : 'text-blue-400'}`}>
                    <Flame className="w-3 h-3" />
                    {activeStructured.steps.some(s => s.type === 'warmup') ? 'Tirar Aquec.' : 'Incluir Aquec.'}
                  </span>
                </button>

                {/* 2. Tiros (+/- 1) */}
                <div className={`p-2 rounded-xl border flex flex-col justify-between ${
                  isLight ? 'bg-white border-amber-200 text-slate-800' : 'bg-white/5 border-white/5 text-slate-200'
                }`}>
                  <span className={`text-[9px] font-bold uppercase block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Qtd. de Tiros</span>
                  <div className="flex items-center gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => handleAdjustIntervals(-1)}
                      className={`flex-1 py-1 rounded font-black text-[10px] flex items-center justify-center gap-0.5 cursor-pointer ${
                        isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-white/10 hover:bg-white/20 text-slate-300'
                      }`}
                      title="Diminuir 1 tiro"
                    >
                      <Minus className="w-2.5 h-2.5" /> 1
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustIntervals(1)}
                      className={`flex-1 py-1 rounded font-black text-[10px] flex items-center justify-center gap-0.5 cursor-pointer ${
                        isLight ? 'bg-amber-200 hover:bg-amber-300 text-amber-950' : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300'
                      }`}
                      title="Adicionar 1 tiro"
                    >
                      <Plus className="w-2.5 h-2.5" /> 1
                    </button>
                  </div>
                </div>

                {/* 3. Descanso (+/- 15s/30s) */}
                <div className={`p-2 rounded-xl border flex flex-col justify-between ${
                  isLight ? 'bg-white border-amber-200 text-slate-800' : 'bg-white/5 border-white/5 text-slate-200'
                }`}>
                  <span className={`text-[9px] font-bold uppercase block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Descanso</span>
                  <div className="flex items-center gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => handleAdjustRest(-15)}
                      className={`flex-1 py-1 rounded font-black text-[10px] flex items-center justify-center cursor-pointer ${
                        isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-white/10 hover:bg-white/20 text-slate-300'
                      }`}
                      title="Reduzir 15 segundos de descanso"
                    >
                      -15s
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustRest(15)}
                      className={`flex-1 py-1 rounded font-black text-[10px] flex items-center justify-center cursor-pointer ${
                        isLight ? 'bg-emerald-200 hover:bg-emerald-300 text-emerald-950' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300'
                      }`}
                      title="Aumentar 15 segundos de descanso"
                    >
                      +15s
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustRest(30)}
                      className={`flex-1 py-1 rounded font-black text-[10px] flex items-center justify-center cursor-pointer ${
                        isLight ? 'bg-emerald-200 hover:bg-emerald-300 text-emerald-950' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300'
                      }`}
                      title="Aumentar 30 segundos de descanso"
                    >
                      +30s
                    </button>
                  </div>
                </div>

                {/* 4. Desaquecimento */}
                <button
                  type="button"
                  onClick={handleToggleCooldown}
                  className={`p-2 rounded-xl text-left border transition-all flex flex-col justify-between cursor-pointer ${
                    isLight 
                      ? 'bg-white border-amber-200 hover:bg-amber-100/50 text-slate-800' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-200'
                  }`}
                >
                  <span className={`text-[9px] font-bold uppercase block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Desaquec.</span>
                  <span className={`text-[10px] font-black flex items-center gap-1 mt-1 ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>
                    <Layers className="w-3 h-3" />
                    {activeStructured.steps.some(s => s.type === 'cooldown') ? 'Tirar Desaq.' : 'Incluir Desaq.'}
                  </span>
                </button>
              </div>

              {/* Ajuste Fino da Etapa Atual se estiver correndo */}
              {isTracking && currentStep && !isWorkoutCompleted && (
                <div className={`pt-2 border-t flex items-center justify-between flex-wrap gap-2 text-[10px] ${
                  isLight ? 'border-amber-200' : 'border-white/5'
                }`}>
                  <span className={`font-mono ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
                    Ajustar Etapa Atual ({currentStep.name}):
                  </span>
                  <div className="flex items-center gap-1.5">
                    {currentStep.targetType === 'distance' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleAdjustCurrentStep(-100)}
                          className={`px-2 py-0.5 rounded font-mono cursor-pointer ${isLight ? 'bg-white border border-slate-300 text-slate-800' : 'bg-white/5 hover:bg-white/10 text-slate-300'}`}
                        >
                          -100m
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustCurrentStep(100)}
                          className={`px-2 py-0.5 rounded font-mono cursor-pointer ${isLight ? 'bg-amber-200 text-amber-950 font-bold' : 'bg-white/5 hover:bg-white/10 text-amber-300'}`}
                        >
                          +100m
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustCurrentStep(500)}
                          className={`px-2 py-0.5 rounded font-mono cursor-pointer ${isLight ? 'bg-amber-200 text-amber-950 font-bold' : 'bg-white/5 hover:bg-white/10 text-amber-300'}`}
                        >
                          +500m
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleAdjustCurrentStep(-15)}
                          className={`px-2 py-0.5 rounded font-mono cursor-pointer ${isLight ? 'bg-white border border-slate-300 text-slate-800' : 'bg-white/5 hover:bg-white/10 text-slate-300'}`}
                        >
                          -15s
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustCurrentStep(30)}
                          className={`px-2 py-0.5 rounded font-mono cursor-pointer ${isLight ? 'bg-amber-200 text-amber-950 font-bold' : 'bg-white/5 hover:bg-white/10 text-amber-300'}`}
                        >
                          +30s
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustCurrentStep(60)}
                          className={`px-2 py-0.5 rounded font-mono cursor-pointer ${isLight ? 'bg-amber-200 text-amber-950 font-bold' : 'bg-white/5 hover:bg-white/10 text-amber-300'}`}
                        >
                          +1min
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PAINEL HUD: ETAPA ATUAL DO TREINO (PRESCRIÇÃO DETALHADA) */}
          {activeStructured && activeStructured.steps && activeStructured.steps.length > 0 && (
            <div className={`p-4 rounded-2xl border ${theme.headerBg} transition-all space-y-3 relative overflow-hidden shadow-xs`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${theme.bg}`}>
                    {theme.label}
                  </span>
                  <span className={`text-xs font-black uppercase italic tracking-tight ${theme.titleColor}`}>
                    {isWorkoutCompleted 
                      ? 'Treino Concluído! 🏁' 
                      : `Etapa ${activeStepIndex + 1} de ${activeStructured.steps.length}`}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowStepsList(!showStepsList)}
                  className={`text-[10px] font-black flex items-center gap-1 cursor-pointer ${isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'}`}
                >
                  <span>Etapas</span>
                  {showStepsList ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {currentStep && !isWorkoutCompleted ? (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <h4 className={`text-xl font-black uppercase italic tracking-tighter ${theme.titleColor}`}>
                        {currentStep.name}
                      </h4>
                      <p className={`text-[10px] font-mono ${theme.subColor}`}>
                        Meta: <strong className={isLight ? 'text-slate-900 font-bold' : 'text-slate-200'}>{formatStepTarget(currentStep)}</strong>
                        {currentStep.targetPaceMin && ` • Ritmo: ${currentStep.targetPaceMin} a ${currentStep.targetPaceMax || ''}`}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className={`text-2xl font-black font-mono tracking-tighter ${theme.accent}`}>
                        {remainingText}
                      </span>
                      <span className={`text-[9px] font-bold block ${theme.subColor}`}>
                        Feito: {currentStep.targetType === 'distance' 
                          ? `${Math.round(stepDistanceMeters)}m` 
                          : formatDuration(stepDurationSeconds)}
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progresso do Passo */}
                  <div className={`w-full h-2.5 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-white/10'}`}>
                    <div 
                      className={`h-full ${theme.bar} transition-all duration-300 rounded-full`}
                      style={{ width: `${stepProgressPct}%` }}
                    />
                  </div>

                  {/* Pace Gauge & Lap Info */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className={`p-2 rounded-xl text-center border ${theme.boxBg}`}>
                      <span className={`text-[8px] font-black uppercase tracking-widest block ${theme.subColor}`}>
                        Pace da Etapa
                      </span>
                      <span className={`text-sm font-black font-mono ${theme.titleColor}`}>
                        {currentStepPace} <span className={`text-[9px] ${theme.subColor}`}>/km</span>
                      </span>
                    </div>
                    <div className={`p-2 rounded-xl text-center border ${theme.boxBg}`}>
                      <span className={`text-[8px] font-black uppercase tracking-widest block ${theme.subColor}`}>
                        Ritmo Alvo
                      </span>
                      <span className={`text-sm font-black font-mono ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>
                        {currentStep.targetPaceMin ? `${currentStep.targetPaceMin}` : 'Livre'}
                      </span>
                    </div>
                  </div>

                  {/* Botão LAP / Avançar Etapa */}
                  {isTracking && (
                    <button
                      type="button"
                      onClick={() => advanceStep(true)}
                      className={`w-full py-2.5 rounded-xl text-xs font-black uppercase italic tracking-wider flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                        isLight 
                          ? 'bg-white hover:bg-slate-50 text-slate-900 border-slate-300 shadow-xs' 
                          : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                      }`}
                    >
                      <FastForward className="w-3.5 h-3.5 text-amber-500" />
                      Avançar Etapa (Botão LAP)
                    </button>
                  )}
                </div>
              ) : isWorkoutCompleted ? (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-center space-y-1">
                  <p className="text-xs font-black uppercase italic text-emerald-600 dark:text-emerald-300">
                    Parabéns! Todas as etapas prescritas foram concluídas!
                  </p>
                  <p className="text-[10px] text-slate-600 dark:text-slate-300">
                    Você pode continuar correndo livremente ou segurar "Parar (3s)" abaixo para encerrar.
                  </p>
                </div>
              ) : null}

              {/* Lista Recolhível de Etapas */}
              {showStepsList && (
                <div className={`space-y-1.5 pt-2 border-t max-h-40 overflow-y-auto custom-scrollbar ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                  {activeStructured.steps.map((step, idx) => {
                    const isPassed = idx < activeStepIndex;
                    const isCurrent = idx === activeStepIndex;
                    return (
                      <div 
                        key={step.id || idx}
                        className={`flex items-center justify-between p-2 rounded-xl text-[10px] ${
                          isCurrent 
                            ? (isLight ? 'bg-emerald-100 border border-emerald-300 font-black text-emerald-950' : 'bg-white/15 border border-white/20 font-black text-white') 
                            : isPassed 
                            ? (isLight ? 'bg-slate-100 text-slate-400 line-through opacity-70' : 'bg-black/20 text-slate-400 line-through opacity-70') 
                            : (isLight ? 'bg-slate-50 text-slate-700 border border-slate-200' : 'bg-black/10 text-slate-300')
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px]">{idx + 1}.</span>
                          <span>{step.name}</span>
                        </div>
                        <span className="font-mono">{formatStepTarget(step)}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Sensor cardíaco BLE */}
          <div className={`rounded-2xl border p-3.5 transition-all ${
            heartRateStatus === 'connected'
              ? (isLight ? 'bg-rose-50 border-rose-200' : 'bg-rose-500/10 border-rose-500/30')
              : (isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5')
          }`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  heartRateStatus === 'connected' ? 'bg-rose-500 text-white' : (isLight ? 'bg-rose-100 text-rose-600' : 'bg-rose-500/15 text-rose-400')
                }`}>
                  <HeartPulse className={`w-5 h-5 ${heartRateStatus === 'connected' ? 'animate-pulse' : ''}`} />
                </div>
                <div className="min-w-0">
                  <div className={`text-[10px] font-black uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Sensor cardíaco
                  </div>
                  <div className={`text-[10px] truncate ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {heartRateStatus === 'connected' ? `${heartRateDeviceName} conectado` : 'Bluetooth LE • padrão universal'}
                  </div>
                </div>
              </div>

              {heartRateStatus === 'connected' ? (
                <button
                  type="button"
                  onClick={disconnectHeartRate}
                  className={`px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase cursor-pointer ${isLight ? 'bg-white text-rose-700 border border-rose-200' : 'bg-white/10 text-rose-300'}`}
                >
                  Desconectar
                </button>
              ) : (
                <button
                  type="button"
                  onClick={connectHeartRate}
                  disabled={heartRateStatus === 'connecting'}
                  className="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white text-[9px] font-black uppercase tracking-wide cursor-pointer transition-colors"
                >
                  {heartRateStatus === 'connecting' ? 'Conectando...' : 'Conectar sensor'}
                </button>
              )}
            </div>

            {heartRateStatus === 'connected' && (
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-rose-500/15 text-center">
                <div>
                  <span className={`block text-[8px] font-black uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Agora</span>
                  <span className={`font-mono text-2xl font-black ${isLight ? 'text-rose-600' : 'text-rose-300'}`}>{heartRateBpm || '--'}</span>
                  <span className="text-[8px] font-bold text-slate-500 ml-1">BPM</span>
                </div>
                <div>
                  <span className={`block text-[8px] font-black uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Média</span>
                  <span className={`font-mono text-lg font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{heartRateAverage || '--'}</span>
                  <span className="text-[8px] font-bold text-slate-500 ml-1">BPM</span>
                </div>
                <div>
                  <span className={`block text-[8px] font-black uppercase tracking-widest ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Máxima</span>
                  <span className={`font-mono text-lg font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{heartRateMax || '--'}</span>
                  <span className="text-[8px] font-bold text-slate-500 ml-1">BPM</span>
                </div>
              </div>
            )}

            {heartRateStatus === 'connected' && (
              <div className={`mt-2 flex items-center justify-center gap-1.5 text-[9px] font-bold ${
                heartRateAgeSeconds !== null && heartRateAgeSeconds <= 3
                  ? (isLight ? 'text-emerald-700' : 'text-emerald-300')
                  : (isLight ? 'text-amber-700' : 'text-amber-300')
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  heartRateAgeSeconds !== null && heartRateAgeSeconds <= 3 ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`} />
                {heartRateAgeSeconds === null
                  ? 'Aguardando primeira leitura'
                  : heartRateAgeSeconds <= 3
                  ? 'Atualização ao vivo'
                  : `Sem nova leitura há ${heartRateAgeSeconds}s`}
              </div>
            )}

            {heartRateError && (
              <div className={`mt-2 text-[10px] font-medium ${isLight ? 'text-rose-700' : 'text-rose-300'}`}>{heartRateError}</div>
            )}
          </div>

          {/* Banner de Quilômetro Concluído com Alerta Sonoro */}
          {kmBannerNotice && (
            <div className="p-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl shadow-xl flex items-center justify-between gap-2 border border-emerald-400/50 animate-bounce">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-xs">
                  {kmBannerNotice.km}k
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-100 flex items-center gap-1">
                    <Volume2 className="w-3 h-3" /> KM {kmBannerNotice.km} Concluído!
                  </p>
                  <p className="text-xs font-black font-mono">
                    Pace: <span className="text-amber-300">{kmBannerNotice.pace}/km</span> • Tempo: {kmBannerNotice.totalTime}
                  </p>
                </div>
              </div>
              {kmBannerNotice.cadence && (
                <span className="text-[10px] font-mono font-bold bg-black/20 px-2 py-1 rounded-lg">
                  {kmBannerNotice.cadence} SPM
                </span>
              )}
            </div>
          )}

          {/* Painel do Relógio & Métricas de Corrida (Gerais com Cadência e Calorias) */}
          <div className={`space-y-2 p-3.5 sm:p-4 rounded-2xl border transition-colors ${
            isLight 
              ? 'bg-slate-50 border-slate-200 text-slate-900 shadow-xs' 
              : 'bg-white/5 border-white/5 text-white'
          }`}>
            <div className="grid grid-cols-3 gap-2 text-center pb-2 border-b border-white/5">
              <div>
                <span className={`text-[9px] font-black uppercase tracking-widest block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Distância Total</span>
                <span className={`text-xl font-black font-mono tracking-tighter ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                  {distanceKm.toFixed(2)}
                </span>
                <span className="text-[8px] font-bold text-slate-500 uppercase ml-0.5">KM</span>
              </div>
              <div>
                <span className={`text-[9px] font-black uppercase tracking-widest block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Tempo Total</span>
                <span className={`text-xl font-black font-mono tracking-tighter ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {formatDuration(durationSeconds)}
                </span>
              </div>
              <div>
                <span className={`text-[9px] font-black uppercase tracking-widest block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Pace Geral</span>
                <span className={`text-xl font-black font-mono tracking-tighter ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
                  {currentPace}
                </span>
                <span className="text-[8px] font-bold text-slate-500 uppercase ml-0.5">/KM</span>
              </div>
            </div>

            {/* Linha de Biometria: Cadência e Calorias */}
            <div className="grid grid-cols-2 gap-2 text-center pt-1">
              <div className={`p-2 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/5'}`}>
                <span className={`text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1 ${isLight ? 'text-purple-700' : 'text-purple-400'}`}>
                  <Footprints className="w-3 h-3" /> Cadência (Passadas)
                </span>
                <div className="flex items-baseline justify-center gap-1 mt-0.5">
                  <span className={`text-lg font-black font-mono ${isLight ? 'text-purple-800' : 'text-purple-300'}`}>
                    {currentCadence > 0 ? currentCadence : '--'}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400">SPM</span>
                </div>
                <span className="text-[7px] text-slate-400 block font-medium">
                  {isCadenceSensorActive ? '📱 Sensor do Celular' : 'Estimativa de Movimento'}
                </span>
              </div>

              <div className={`p-2 rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/5'}`}>
                <span className={`text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-1 ${isLight ? 'text-orange-700' : 'text-orange-400'}`}>
                  <Flame className="w-3 h-3" /> Calorias Queimadas
                </span>
                <div className="flex items-baseline justify-center gap-1 mt-0.5">
                  <span className={`text-lg font-black font-mono ${isLight ? 'text-orange-800' : 'text-orange-300'}`}>
                    {currentCalories || 0}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400">KCAL</span>
                </div>
                <span className="text-[7px] text-slate-400 block font-medium">
                  Fórmula ACSM ({athleteWeight}kg)
                </span>
              </div>
            </div>

            {/* Configuração Rápida de Fala por KM */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[10px]">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold">Fala a cada KM percorrido:</span>
              </div>
              <button
                type="button"
                onClick={() => setVoiceAlertsEnabled(!voiceAlertsEnabled)}
                className={`px-2.5 py-1 rounded-lg font-black uppercase text-[9px] transition-all cursor-pointer ${
                  voiceAlertsEnabled 
                    ? 'bg-emerald-500 text-white shadow-xs' 
                    : isLight ? 'bg-slate-200 text-slate-600' : 'bg-white/10 text-slate-400'
                }`}
              >
                {voiceAlertsEnabled ? 'Ativada' : 'Desativada'}
              </button>
            </div>
          </div>

          {/* Status do Sinal do GPS */}
          <div className="flex items-center justify-between px-1 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                gpsAccuracyMeters && gpsAccuracyMeters <= 15 ? 'bg-emerald-500 animate-pulse' :
                gpsAccuracyMeters && gpsAccuracyMeters <= 35 ? 'bg-amber-500' : 'bg-red-500'
              }`} />
              <span className={`font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {gpsAccuracyMeters ? `Sinal GPS: ±${gpsAccuracyMeters}m` : 'Aguardando satélites...'}
              </span>
            </div>
            {isTracking && (
              <span className="text-emerald-500 font-black italic uppercase">
                {isPaused ? '⏸ Em Pausa' : '● Gravando Rota'}
              </span>
            )}
          </div>

          {gpsError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-300 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
              <span>{gpsError}</span>
            </div>
          )}

          {/* Mapa Interativo ao Vivo */}
          <div className="relative">
            <WorkoutMap
              points={gpsPoints}
              currentPosition={currentPosition}
              height="220px"
              interactive={true}
            />
            {gpsPoints.length === 0 && !isTracking && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[2px] rounded-[1.25rem] flex flex-col items-center justify-center p-4 text-center border border-emerald-500/30">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center mb-2 animate-pulse">
                  <Footprints className="w-6 h-6 text-emerald-400" />
                </div>
                <p className="text-sm font-black uppercase italic tracking-wider text-white">
                  Pronto para a largada?
                </p>
                <p className="text-[10px] text-slate-300 max-w-xs mt-1 font-medium">
                  {activeStructured 
                    ? 'O GPS dará alertas sonoros e guiará cada tiro e recuperação automaticamente.' 
                    : 'Toque no botão verde abaixo para rastrear seu trajeto, distância e ritmo.'}
                </p>
              </div>
            )}
          </div>

          {/* Gráficos de Telemetria e Parciais por KM Estilo Relógio Avançado */}
          {(kmSplits.length > 0 || telemetrySamples.length > 0) && (
            <div className="pt-1">
              <WorkoutTelemetryCharts
                kmSplits={kmSplits}
                telemetrySamples={telemetrySamples}
                avgPace={currentPace}
                avgCadence={currentCadence > 0 ? currentCadence : undefined}
                calories={currentCalories}
                elevationGainMeters={elevationGainMeters}
                isLight={isLight}
              />
            </div>
          )}

          {/* Histórico de Laps Concluídos */}
          {completedSteps.length > 0 && (
            <div className={`space-y-2 p-3 rounded-2xl border ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/5'
            }`}>
              <span className={`text-[10px] font-black uppercase tracking-wider block ${
                isLight ? 'text-slate-800' : 'text-slate-300'
              }`}>
                Histórico de Laps / Intervalos ({completedSteps.length})
              </span>
              <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                {completedSteps.map((rec, i) => (
                  <div key={i} className={`flex justify-between items-center text-[10px] p-2 rounded-lg font-mono ${
                    isLight ? 'bg-white border border-slate-200' : 'bg-black/20'
                  }`}>
                    <span className={`font-bold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>{rec.name}</span>
                    <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>{rec.completedDistanceMeters}m • {formatDuration(rec.completedDurationSeconds)}</span>
                    <span className={`font-black ${isLight ? 'text-amber-700' : 'text-amber-400'}`}>{rec.avgPace}/km</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODO 2: UPLOAD DE ARQUIVO GPX (Strava, Polar, Coros, Apple Watch, etc.) */}
      {activeMode === 'gpx' && (
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2 ${
              isLight 
                ? 'border-emerald-400 bg-emerald-50/60 hover:bg-emerald-50' 
                : 'border-emerald-500/30 hover:border-emerald-500 bg-white/5 hover:bg-white/10'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".gpx,.xml"
              onChange={handleGpxFileUpload}
              className="hidden"
            />
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>
            <p className={`text-xs font-black uppercase italic tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Selecionar Arquivo .GPX do Relógio
            </p>
            <p className={`text-[10px] font-medium max-w-xs mx-auto ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Compatível com arquivos .GPX de qualquer relógio GPS ou app (Strava, Polar, Coros, Apple Watch).
            </p>
          </div>

          {gpxUploading && (
            <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-black">
              <RefreshCw className="w-4 h-4 animate-spin" /> Processando rota do satélite...
            </div>
          )}

          {gpxError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-600 dark:text-red-300 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
              <span>{gpxError}</span>
            </div>
          )}

          {/* Rota GPX Carregada */}
          {gpxParsedRoute && (
            <div className="space-y-4 animate-fade-in">
              <div className={`grid grid-cols-4 gap-2 p-3 rounded-2xl border text-center ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-900' : 'bg-white/5 border-white/5 text-white'
              }`}>
                <div>
                  <span className={`text-[8px] font-black uppercase tracking-widest block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Distância</span>
                  <span className={`text-base font-black font-mono ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`}>
                    {gpxParsedRoute.totalDistanceKm}k
                  </span>
                </div>
                <div>
                  <span className={`text-[8px] font-black uppercase tracking-widest block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Tempo</span>
                  <span className={`text-base font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {formatDuration(gpxParsedRoute.totalDurationSeconds)}
                  </span>
                </div>
                <div>
                  <span className={`text-[8px] font-black uppercase tracking-widest block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Pace</span>
                  <span className={`text-base font-black font-mono ${isLight ? 'text-amber-600' : 'text-amber-400'}`}>
                    {gpxParsedRoute.avgPace}
                  </span>
                </div>
                <div>
                  <span className={`text-[8px] font-black uppercase tracking-widest block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Altimetria</span>
                  <span className={`text-base font-black font-mono ${isLight ? 'text-blue-600' : 'text-blue-400'}`}>
                    +{gpxParsedRoute.elevationGainMeters || 0}m
                  </span>
                </div>
              </div>

              {/* Mapa com traçado importado */}
              <WorkoutMap
                points={gpxParsedRoute.points}
                height="220px"
                interactive={true}
              />

              {/* Gráficos de Telemetria do Arquivo GPX Importado */}
              <WorkoutTelemetryCharts
                kmSplits={gpxParsedRoute.kmSplits}
                telemetrySamples={gpxParsedRoute.telemetrySamples}
                avgPace={gpxParsedRoute.avgPace}
                avgCadence={gpxParsedRoute.avgCadence}
                calories={gpxParsedRoute.calories}
                elevationGainMeters={gpxParsedRoute.elevationGainMeters}
                isLight={isLight}
              />

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShareModalData({
                      title: workoutDescription?.slice(0, 45) || `${workoutType}`,
                      distanceKm: gpxParsedRoute.totalDistanceKm,
                      durationSeconds: gpxParsedRoute.totalDurationSeconds,
                      avgPace: gpxParsedRoute.avgPace,
                      elevationGainMeters: gpxParsedRoute.elevationGainMeters,
                      avgHeartRate: gpxParsedRoute.avgHeartRate,
                      route: gpxParsedRoute,
                      workoutType: workoutType
                    });
                  }}
                  className={`font-black py-3 rounded-xl flex items-center justify-center gap-1.5 text-xs uppercase italic tracking-wider transition-all cursor-pointer ${
                    isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300' : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <Camera className="w-4 h-4 text-emerald-500" /> Postar Treino
                </button>

                <button
                  type="button"
                  onClick={confirmGpxRoute}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl flex items-center justify-center gap-1.5 text-xs uppercase italic tracking-wider shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Vincular Rota
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CARD ÚNICO FIXO INFERIOR (STICKY DOCK) - APENAS UM CARD PARA "INICIAR CORRIDA" E CONTROLES COM HOLD 3S PARA PARAR */}
      {activeMode === 'live' && !isFocusMode && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-emerald-500/30 shadow-[0_-10px_35px_rgba(0,0,0,0.85)] p-3 sm:p-4">
          <div className="max-w-2xl mx-auto flex flex-col gap-2">
            {/* Indicador Visual Flutuante do Timer de 3 Segundos ao Pressionar Parar */}
            {isHoldingStop && (
              <div className="w-full bg-red-950/95 border border-red-500/50 rounded-2xl p-2.5 px-4 flex items-center justify-between gap-3 shadow-2xl animate-fade-in">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-red-500 text-white font-black font-mono text-sm flex items-center justify-center animate-ping-once">
                    {stopHoldSecondsLeft}s
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase italic tracking-wider text-white">
                      Mantenha Pressionado para Parar a Corrida...
                    </p>
                    <div className="w-40 sm:w-56 h-1.5 bg-red-900/60 rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-red-500 transition-all duration-75"
                        style={{ width: `${stopHoldProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
                <span className="text-xs font-mono font-black text-red-300">
                  {Math.round(stopHoldProgress)}%
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              {!isTracking ? (
                <div className="w-full flex items-center gap-3">
                  <div className="hidden sm:flex flex-col min-w-0">
                    <span className="text-[10px] font-black uppercase text-emerald-400 italic">
                      {workoutType}
                    </span>
                    <span className="text-[9px] text-slate-400 truncate font-mono">
                      {heartRateStatus === 'connected' ? `❤️ ${heartRateBpm || '--'} BPM` : 'Sensor BLE pronto'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={initiateStartWithCountdown}
                    className="w-full bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black py-3.5 sm:py-4 px-6 rounded-2xl flex items-center justify-center gap-3 text-sm sm:text-base uppercase italic tracking-wider shadow-2xl shadow-emerald-600/50 transition-all active:scale-[0.98] cursor-pointer border border-emerald-400/40 group"
                  >
                    <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                    </div>
                    <span>Iniciar Corrida</span>
                  </button>
                </div>
              ) : isScreenLocked ? (
                <div className="w-full flex items-center justify-between gap-3 bg-amber-500/15 border border-amber-500/40 rounded-2xl p-2.5 px-4">
                  <div className="flex items-center gap-2 text-amber-300">
                    <Lock className="w-4 h-4 shrink-0 animate-pulse" />
                    <span className="text-[11px] font-black uppercase italic tracking-wider">
                      Controles Bloqueados (Modo Bolso)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsScreenLocked(false)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] uppercase italic tracking-wider flex items-center gap-1.5 cursor-pointer shadow-lg"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Destravar</span>
                  </button>
                </div>
              ) : (
                <div className="w-full grid grid-cols-3 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsScreenLocked(true)}
                    className="py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-black text-[11px] uppercase italic tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer"
                    title="Trancar tela para colocar no bolso"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Trancar</span>
                  </button>

                  {currentStep && !isWorkoutCompleted && (
                    <button
                      type="button"
                      onClick={() => advanceStep(true)}
                      className="hidden sm:flex py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase italic tracking-wider items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer"
                    >
                      <FastForward className="w-3.5 h-3.5 fill-slate-950" />
                      <span>LAP</span>
                    </button>
                  )}

                  {isPaused ? (
                    <button
                      type="button"
                      onClick={resumeTracking}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs uppercase italic tracking-wider shadow-lg transition-all cursor-pointer"
                    >
                      <Play className="w-4 h-4 fill-white" /> Retomar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={pauseTracking}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3.5 rounded-xl flex items-center justify-center gap-2 text-xs uppercase italic tracking-wider shadow-lg transition-all cursor-pointer"
                    >
                      <Pause className="w-4 h-4 fill-slate-950" /> Pausar
                    </button>
                  )}

                  {/* Botão Parar com Timer de 3 Segundos Pressionado */}
                  <button
                    type="button"
                    onMouseDown={startHoldToStop}
                    onMouseUp={cancelHoldToStop}
                    onMouseLeave={cancelHoldToStop}
                    onTouchStart={startHoldToStop}
                    onTouchEnd={cancelHoldToStop}
                    onTouchCancel={cancelHoldToStop}
                    onContextMenu={(e) => e.preventDefault()}
                    className={`relative overflow-hidden select-none font-black py-3.5 rounded-xl flex items-center justify-center gap-1.5 text-xs uppercase italic tracking-wider shadow-lg transition-all cursor-pointer border ${
                      isHoldingStop
                        ? 'bg-red-900 text-white border-amber-400 scale-[0.98]'
                        : 'bg-red-600 hover:bg-red-500 text-white border-red-400/30'
                    }`}
                  >
                    {isHoldingStop && (
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 via-red-500 to-red-400 opacity-60 transition-all duration-75 pointer-events-none"
                        style={{ width: `${stopHoldProgress}%` }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      <Square className="w-3.5 h-3.5 fill-white shrink-0" />
                      <span>{isHoldingStop ? `Segure ${stopHoldSecondsLeft}s` : 'Parar (3s)'}</span>
                    </span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE COMPARTILHAMENTO / POSTAR TREINO */}
      {shareModalData && (
        <WorkoutShareModal
          data={shareModalData}
          onClose={() => setShareModalData(null)}
        />
      )}

      {/* MODAL DE PRESCRIÇÃO DETALHADA */}
      {showStructuredModal && (
        <StructuredWorkoutModal
          initialWorkout={activeStructured || undefined}
          workoutDescription={workoutDescription}
          workoutType={workoutType as WorkoutType}
          athletePaces={athletePaces}
          onSave={(newStructured) => {
            setActiveStructured(newStructured);
            setActiveStepIndex(0);
            setStepDistanceMeters(0);
            setStepDurationSeconds(0);
            setShowStructuredModal(false);
          }}
          onClose={() => setShowStructuredModal(false)}
        />
      )}

      {/* 1. OVERLAY DE CONTAGEM REGRESSIVA DE INÍCIO COM VOZ */}
      {countdownSeconds !== null && countdownSeconds > 0 && (
        <div className="fixed inset-0 z-[10000] bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white animate-fade-in">
          <div className="max-w-sm w-full space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 text-xs font-black uppercase tracking-wider">
              <Volume2 className="w-4 h-4 animate-bounce" /> Contagem por Voz & Bip
            </div>
            
            <div>
              <h2 className="text-2xl font-black uppercase italic tracking-wider text-slate-100">
                {workoutType}
              </h2>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                {activeStructured ? `Treino Estruturado • ${activeStructured.steps.length} Etapas` : 'Corrida Livre com Rastreamento GPS'}
              </p>
            </div>

            {/* Círculo com Número Gigante */}
            <div className="relative flex items-center justify-center my-4">
              <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 p-1 flex items-center justify-center shadow-2xl shadow-emerald-500/40 animate-pulse">
                <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center border border-emerald-400/30">
                  <span className="text-7xl sm:text-8xl font-black font-mono tracking-tighter text-emerald-400 drop-shadow-[0_0_25px_rgba(16,185,129,0.6)]">
                    {countdownSeconds}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-300 font-medium">
              Prepare-se! O rastreamento começará em instantes.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={cancelCountdown}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-black text-xs uppercase italic tracking-wider transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={skipCountdownAndStart}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase italic tracking-wider transition-colors cursor-pointer shadow-lg shadow-emerald-600/30"
              >
                Iniciar Já!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODAL DE CONFIRMAÇÃO DE SAÍDA DO TREINO (EVITA CLIQUE ACIDENTAL OU BOTÃO VOLTAR) */}
      {showExitConfirmModal && (
        <div className="fixed inset-0 z-[10001] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 text-white animate-fade-in">
          <div className="max-w-md w-full bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 space-y-5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-amber-500 to-emerald-500" />
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  🛡️ Proteção Contra Saída Acidental
                </span>
                <h3 className="text-lg font-black uppercase italic tracking-wide text-white mt-1">
                  Sua Corrida Está Protegida!
                </h3>
                <p className="text-xs text-slate-300 mt-1.5 leading-relaxed font-medium">
                  Bloqueamos a saída para você não perder seu progresso de <strong className="text-emerald-400 font-mono text-sm">{distanceKm.toFixed(2)} km</strong> em <strong className="text-amber-400 font-mono text-sm">{formatDuration(durationSeconds)}</strong>. O que deseja fazer?
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowExitConfirmModal(false)}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-3.5 px-4 rounded-2xl text-xs uppercase italic tracking-wider shadow-lg shadow-emerald-600/20 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Continuar Correndo (Voltar ao Treino)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowExitConfirmModal(false);
                  setIsScreenLocked(true);
                }}
                className="w-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-black py-3 px-4 rounded-2xl text-xs uppercase italic tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Lock className="w-4 h-4" />
                <span>Continuar e Trancar Tela (Modo Bolso)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowExitConfirmModal(false);
                  finishTracking();
                }}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 px-4 rounded-2xl text-xs uppercase italic tracking-wider shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Finalizar e Salvar Treino Agora</span>
              </button>

              <button
                type="button"
                onClick={handleConfirmDiscardExit}
                className="w-full bg-red-600/15 hover:bg-red-600/30 text-red-300 hover:text-white border border-red-500/30 font-bold py-2.5 px-4 rounded-2xl text-[11px] uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <X className="w-3.5 h-3.5" />
                <span>Realmente Descartar Corrida</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DEMONSTRATIVO DAS 4 CAMADAS DE PROTEÇÃO ANTI-PERDA */}
      {showProtectionInfoModal && (
        <div className="fixed inset-0 z-[10002] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 text-white animate-fade-in">
          <div className="max-w-lg w-full bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 space-y-4 shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase italic tracking-wide text-white">
                    Blindagem Anti-Perda de Corrida
                  </h3>
                  <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                    4 Camadas de Segurança Ativas no Celular
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowProtectionInfoModal(false)}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="font-black text-emerald-400 uppercase italic flex items-center gap-1.5">
                  <span>1. Bloqueio do Botão "Voltar" do Celular</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Ao iniciar o treino, o app cria uma trava no histórico do celular. Se você apertar o botão <strong>Voltar</strong> ou arrastar a borda da tela sem querer, o app <strong>intercepta o comando</strong>, mantém o GPS rodando e pergunta se deseja continuar.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="font-black text-amber-400 uppercase italic flex items-center gap-1.5">
                  <span>2. Auto-Save Instantâneo a cada Segundo</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Sua distância, tempo, rota GPS, parciais por KM e etapa atual são salvos na memória do aparelho a cada segundo. Mesmo se o navegador fechar ou a bateria acabar, ao reabrir o app você verá o botão <strong>"Retomar Corrida de Onde Parou"</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="font-black text-blue-400 uppercase italic flex items-center gap-1.5">
                  <span>3. Modo Cadeado (Bloqueio de Bolso / Suor) 🔒</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Durante a corrida, toque em <strong>"Trancar Tela"</strong> para desativar os botões de parar/sair enquanto o celular estiver no bolso, na cintura ou na braçadeira.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                <div className="font-black text-purple-400 uppercase italic flex items-center gap-1.5">
                  <span>4. Proteção contra Fechamento de Aba</span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Bloqueia atualizações acidentais da página (puxar a tela para baixo para atualizar) enquanto o cronômetro estiver ativo.
                </p>
              </div>
            </div>

            <div className="pt-2 space-y-2">
              <button
                type="button"
                onClick={() => {
                  setShowProtectionInfoModal(false);
                  simulateBackButtonPress();
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase italic tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Simular Toque no Botão "Voltar" Agora</span>
              </button>

              <button
                type="button"
                onClick={() => setShowProtectionInfoModal(false)}
                className="w-full py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-black text-xs uppercase tracking-wider cursor-pointer transition-all"
              >
                Entendi, Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. TELA GRANDE INTUITIVA DE EXECUÇÃO DO TREINO (MODO FOCO / FULLSCREEN) */}
      {isFocusMode && isTracking && (
        <div className="fixed inset-0 z-[9999] bg-slate-950 text-white flex flex-col p-3 sm:p-5 overflow-y-auto custom-scrollbar no-print animate-fade-in">
          {/* Barra Superior do Modo Foco */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-wrap gap-2 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center">
                <Navigation className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black uppercase italic tracking-wider text-white">
                    {workoutType}
                  </h2>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase text-emerald-400 italic">EM EXECUÇÃO</span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  {gpsAccuracyMeters ? `Sinal GPS: ±${gpsAccuracyMeters}m` : 'Procurando sinal de GPS...'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Botão de Alerta de Voz por KM */}
              <button
                type="button"
                onClick={() => setVoiceAlertsEnabled(!voiceAlertsEnabled)}
                className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                  voiceAlertsEnabled ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-white/5 text-slate-400 border border-white/10'
                }`}
                title="Fala ritmo e tempo total a cada KM percorrido"
              >
                {voiceAlertsEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
                <span className="text-[10px] font-black uppercase hidden sm:inline">{voiceAlertsEnabled ? 'Voz KM: On' : 'Voz KM: Off'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                  soundEnabled ? 'bg-white/15 text-white border border-white/20' : 'bg-white/5 text-slate-400'
                }`}
                title="Sons e bipes do treino"
              >
                <span className="text-[10px] font-bold hidden sm:inline">{soundEnabled ? 'Sons On' : 'Sons Off'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsScreenLocked(!isScreenLocked)}
                className={`p-2 sm:px-3 sm:py-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                  isScreenLocked
                    ? 'bg-amber-500 text-slate-950 font-black shadow-lg'
                    : 'bg-white/10 hover:bg-white/20 text-amber-300 border border-amber-500/30'
                }`}
                title="Bloquear tela contra toque acidental no bolso"
              >
                {isScreenLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                <span className="text-[10px] font-black uppercase">{isScreenLocked ? 'Trancada' : 'Trancar'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFocusMode(false)}
                className="p-2 sm:px-3 sm:py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                title="Minimizar para janela normal"
              >
                <Minimize2 className="w-4 h-4" />
                <span className="text-[10px] font-bold hidden sm:inline">Normal</span>
              </button>

              {!isScreenLocked && (
                <button
                  type="button"
                  onClick={handleRequestExit}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl bg-red-600/30 hover:bg-red-600/50 text-red-300 hover:text-white border border-red-500/30 text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Sair do treino"
                >
                  <X className="w-4 h-4" />
                  <span className="text-[10px] font-bold">Sair</span>
                </button>
              )}
            </div>
          </div>

          {/* Conteúdo Principal do Modo Foco */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 py-3 min-h-0">
            {/* Coluna do Mapa Grande */}
            <div className="lg:col-span-7 flex flex-col space-y-3 min-h-[160px] sm:min-h-[260px]">
              <div className="relative flex-1 rounded-3xl overflow-hidden border border-white/10 shadow-2xl h-44 sm:h-auto sm:min-h-[240px]">
                <WorkoutMap
                  points={gpsPoints}
                  currentPosition={currentPosition}
                  height="100%"
                  interactive={true}
                />
                <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[10px] font-mono text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Posição em tempo real</span>
                </div>
              </div>
            </div>

            {/* Coluna das Métricas do Treino & Dados da Etapa */}
            <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
              {/* Card da Etapa Atual (Treino Estruturado) */}
              {currentStep && !isWorkoutCompleted ? (
                <div className={`p-4 rounded-3xl border ${theme.headerBg} space-y-3 shadow-xl relative overflow-hidden`}>
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${theme.bg}`}>
                      {theme.label}
                    </span>
                    <span className="text-xs font-black uppercase italic tracking-tight text-white">
                      Etapa {activeStepIndex + 1} de {activeStructured?.steps.length}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-black uppercase italic tracking-tight text-white">
                      {currentStep.name}
                    </h3>
                    <p className="text-xs text-slate-300 font-mono mt-0.5">
                      Meta: <strong className="text-amber-400">{formatStepTarget(currentStep)}</strong>
                      {currentStep.targetPaceMin && ` • Ritmo Alvo: ${currentStep.targetPaceMin}`}
                    </p>
                  </div>

                  {/* Barra de Progresso em Destaque */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono font-bold">
                      <span className="text-slate-300">Progresso da Etapa</span>
                      <span className={theme.accent}>{remainingText}</span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-900/80 overflow-hidden border border-white/10">
                      <div 
                        className={`h-full ${theme.bar} transition-all duration-300 rounded-full`}
                        style={{ width: `${stepProgressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Próxima Etapa Preview */}
                  {activeStructured && activeStructured.steps[activeStepIndex + 1] && (
                    <div className="pt-1 border-t border-white/10 text-[10px] font-mono text-slate-300 flex items-center justify-between">
                      <span>Próxima: <strong>{activeStructured.steps[activeStepIndex + 1].name}</strong></span>
                      <span className="text-amber-300">{formatStepTarget(activeStructured.steps[activeStepIndex + 1])}</span>
                    </div>
                  )}
                </div>
              ) : isWorkoutCompleted ? (
                <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-3xl text-center space-y-1">
                  <p className="text-sm font-black uppercase italic text-emerald-300">
                    🏁 Treino Concluído com Sucesso!
                  </p>
                  <p className="text-xs text-slate-300">
                    Você completou todas as etapas do seu treino prescrito.
                  </p>
                </div>
              ) : null}

              {/* Banner de Quilômetro Concluído com Feedback Visual no Modo Foco */}
              {kmBannerNotice && (
                <div className="p-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 text-white rounded-2xl shadow-2xl border border-emerald-400/50 flex items-center justify-between gap-3 animate-bounce">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm">
                      {kmBannerNotice.km}k
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-100 flex items-center gap-1">
                        <Volume2 className="w-3.5 h-3.5" /> Quilômetro {kmBannerNotice.km} Concluído!
                      </p>
                      <p className="text-xs sm:text-sm font-black font-mono">
                        Pace do KM: <span className="text-amber-300 font-bold">{kmBannerNotice.pace}/km</span> • Tempo Total: {kmBannerNotice.totalTime}
                      </p>
                    </div>
                  </div>
                  {kmBannerNotice.cadence && (
                    <span className="text-[10px] font-mono font-bold bg-black/30 px-2.5 py-1.5 rounded-lg text-purple-200">
                      {kmBannerNotice.cadence} SPM
                    </span>
                  )}
                </div>
              )}

              {/* Grid de Números Gigantes das Métricas (6 cards completos) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="p-2 sm:p-3 bg-slate-900/90 border border-emerald-500/30 rounded-2xl text-center flex flex-col items-center justify-center">
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-emerald-400 block">Distância</span>
                  <div className="text-lg sm:text-2xl font-black font-mono tracking-tighter text-emerald-400">
                    {distanceKm.toFixed(2)} <span className="text-[8px] sm:text-xs text-slate-400">KM</span>
                  </div>
                </div>

                <div className="p-2 sm:p-3 bg-slate-900/90 border border-amber-500/30 rounded-2xl text-center flex flex-col items-center justify-center">
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-amber-400 block">Pace Geral</span>
                  <div className="text-lg sm:text-2xl font-black font-mono tracking-tighter text-amber-400">
                    {currentPace}
                  </div>
                </div>

                <div className="p-2 sm:p-3 bg-slate-900/90 border border-white/10 rounded-2xl text-center flex flex-col items-center justify-center">
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400 block">Tempo Total</span>
                  <div className="text-lg sm:text-2xl font-black font-mono tracking-tighter text-white">
                    {formatDuration(durationSeconds)}
                  </div>
                </div>

                {/* Cadência em Tempo Real */}
                <div className="p-2 sm:p-3 bg-slate-900/90 border border-purple-500/30 rounded-2xl text-center flex flex-col items-center justify-center">
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-1">
                    <Footprints className="w-3 h-3" /> Cadência
                  </span>
                  <div className="text-lg sm:text-2xl font-black font-mono tracking-tighter text-purple-400">
                    {currentCadence > 0 ? currentCadence : '--'} <span className="text-[8px] sm:text-xs text-slate-400">SPM</span>
                  </div>
                  <span className="text-[7px] font-bold text-slate-400">
                    {isCadenceSensorActive ? '📱 Sensor acelerômetro' : 'Cinemática'}
                  </span>
                </div>

                {/* Calorias Estimadas */}
                <div className="p-2 sm:p-3 bg-slate-900/90 border border-orange-500/30 rounded-2xl text-center flex flex-col items-center justify-center">
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-orange-400 flex items-center gap-1">
                    <Flame className="w-3 h-3" /> Calorias
                  </span>
                  <div className="text-lg sm:text-2xl font-black font-mono tracking-tighter text-orange-400">
                    {currentCalories || 0} <span className="text-[8px] sm:text-xs text-slate-400">KCAL</span>
                  </div>
                  <span className="text-[7px] font-bold text-slate-400">
                    ACSM ({athleteWeight}kg)
                  </span>
                </div>

                {/* Frequência Cardíaca */}
                <div className={`p-2 sm:p-3 bg-slate-900/90 rounded-2xl text-center flex flex-col items-center justify-center ${
                  heartRateAgeSeconds !== null && heartRateAgeSeconds <= 3
                    ? 'border border-rose-500/50'
                    : 'border border-white/10'
                }`}>
                  <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-rose-300 flex items-center gap-1">
                    <HeartPulse className="w-3 h-3" /> FC atual
                  </span>
                  <div className="text-lg sm:text-2xl font-black font-mono tracking-tighter text-rose-300">
                    {heartRateBpm || '--'} <span className="text-[8px] sm:text-xs text-slate-400">BPM</span>
                  </div>
                  <span className={`text-[7px] font-bold ${
                    heartRateAgeSeconds !== null && heartRateAgeSeconds <= 3 ? 'text-emerald-300' : 'text-amber-300'
                  }`}>
                    {heartRateAgeSeconds === null
                      ? 'Aguardando sensor'
                      : heartRateAgeSeconds <= 3
                      ? 'AO VIVO'
                      : `há ${heartRateAgeSeconds}s`}
                  </span>
                </div>
              </div>

              {/* Controles de Ação do Modo Foco (Com Proteção de Tela Trancada / Modo Bolso) */}
              <div className="space-y-2 pt-1">
                {backButtonBlockedNotice && (
                  <div className="p-3 rounded-2xl bg-amber-500 text-slate-950 font-black text-xs uppercase italic tracking-wider flex items-center justify-center gap-2 shadow-xl animate-bounce">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>🛡️ Botão Voltar Bloqueado! Corrida Protegida.</span>
                  </div>
                )}

                {isScreenLocked ? (
                  <div className="p-4 rounded-3xl bg-amber-500/15 border-2 border-amber-500/50 text-center space-y-2.5 shadow-2xl">
                    <div className="flex items-center justify-center gap-2 text-amber-300 font-black text-xs uppercase italic tracking-wider">
                      <Lock className="w-4 h-4 animate-pulse" />
                      <span>Modo Bolso Ativo • Controles Bloqueados</span>
                    </div>
                    <p className="text-[10px] text-slate-300">
                      Toques acidentais e o botão Voltar do celular estão travados.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsScreenLocked(false)}
                      className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl text-xs uppercase italic tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer transition-all"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>Destravar Tela para Controlar</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {currentStep && !isWorkoutCompleted && (
                      <button
                        type="button"
                        onClick={() => advanceStep(true)}
                        className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-2xl text-xs uppercase italic tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                      >
                        <FastForward className="w-4 h-4 fill-slate-950" />
                        <span>Avançar Etapa (Botão LAP)</span>
                      </button>
                    )}

                    {/* Indicador Visual do Timer de 3 Segundos no Modo Foco */}
                    {isHoldingStop && (
                      <div className="w-full bg-red-950/95 border border-red-500/50 rounded-2xl p-3 px-4 flex items-center justify-between gap-3 shadow-2xl animate-fade-in">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-red-500 text-white font-black font-mono text-base flex items-center justify-center">
                            {stopHoldSecondsLeft}s
                          </div>
                          <div>
                            <p className="text-xs font-black uppercase italic tracking-wider text-white">
                              Mantenha Pressionado para Parar a Corrida...
                            </p>
                            <div className="w-44 sm:w-64 h-2 bg-red-900/60 rounded-full overflow-hidden mt-1">
                              <div
                                className="h-full bg-gradient-to-r from-amber-400 to-red-500 transition-all duration-75"
                                style={{ width: `${stopHoldProgress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-mono font-black text-red-300">
                          {Math.round(stopHoldProgress)}%
                        </span>
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsScreenLocked(true)}
                        className="py-3.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-black rounded-2xl text-xs uppercase italic tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                      >
                        <Lock className="w-4 h-4" /> Trancar
                      </button>

                      {isPaused ? (
                        <button
                          type="button"
                          onClick={resumeTracking}
                          className="py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-xs uppercase italic tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
                        >
                          <Play className="w-4 h-4 fill-white" /> Retomar
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={pauseTracking}
                          className="py-3.5 bg-amber-500/30 hover:bg-amber-500/50 text-amber-300 border border-amber-500/40 font-black rounded-2xl text-xs uppercase italic tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                        >
                          <Pause className="w-4 h-4 fill-amber-300" /> Pausar
                        </button>
                      )}

                      {/* Botão Parar no Modo Foco com Timer de 3 Segundos Pressionado */}
                      <button
                        type="button"
                        onMouseDown={startHoldToStop}
                        onMouseUp={cancelHoldToStop}
                        onMouseLeave={cancelHoldToStop}
                        onTouchStart={startHoldToStop}
                        onTouchEnd={cancelHoldToStop}
                        onTouchCancel={cancelHoldToStop}
                        onContextMenu={(e) => e.preventDefault()}
                        className={`relative overflow-hidden select-none py-3.5 font-black rounded-2xl text-xs uppercase italic tracking-wider flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer border ${
                          isHoldingStop
                            ? 'bg-red-900 text-white border-amber-400 scale-[0.98]'
                            : 'bg-red-600 hover:bg-red-500 text-white border-red-400/30'
                        }`}
                      >
                        {isHoldingStop && (
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 via-red-500 to-red-400 opacity-60 transition-all duration-75 pointer-events-none"
                            style={{ width: `${stopHoldProgress}%` }}
                          />
                        )}
                        <span className="relative z-10 flex items-center gap-1.5">
                          <Square className="w-4 h-4 fill-white shrink-0" />
                          <span>{isHoldingStop ? `Segure ${stopHoldSecondsLeft}s` : 'Parar (3s)'}</span>
                        </span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

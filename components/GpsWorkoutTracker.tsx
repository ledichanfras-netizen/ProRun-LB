import React, { useState, useEffect, useRef } from 'react';
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
  Settings
} from 'lucide-react';
import { WorkoutMap } from './WorkoutMap';
import { 
  RouteData, 
  calculateHaversineDistance, 
  encodePolyline, 
  formatPace, 
  formatDuration, 
  parseGpxFile 
} from '../utils/gpsUtils';
import { StructuredWorkout, WorkoutStep, StepType, StepTargetType } from '../types';
import { workoutAudio } from '../utils/workoutAudio';
import { formatStepTarget } from '../utils/workoutParser';
import { StructuredWorkoutModal } from './StructuredWorkoutModal';

interface GpsWorkoutTrackerProps {
  workoutType: string;
  plannedDistanceKm?: number;
  existingRoute?: any;
  structuredWorkout?: StructuredWorkout;
  workoutDescription?: string;
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
  onRouteCaptured,
  onCancel
}) => {
  const [activeMode, setActiveMode] = useState<'live' | 'gpx'>('live');

  // Structured Workout State (Modo Detalhado)
  const [activeStructured, setActiveStructured] = useState<StructuredWorkout | null>(initialStructuredWorkout || null);
  const [showStructuredModal, setShowStructuredModal] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [stepDistanceMeters, setStepDistanceMeters] = useState(0);
  const [stepDurationSeconds, setStepDurationSeconds] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<CompletedStepRecord[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showStepsList, setShowStepsList] = useState(false);

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

  // Sync Audio Setting
  useEffect(() => {
    workoutAudio.setSoundEnabled(soundEnabled);
  }, [soundEnabled]);

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

  // ADVANCE STEP / LAP FUNCTION
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
      setActiveStepIndex(nextIndex);
      setStepDistanceMeters(0);
      setStepDurationSeconds(0);
      workoutAudio.playStepTransition();
    } else {
      // Completed all steps of the workout!
      setActiveStepIndex(nextIndex);
      workoutAudio.playWorkoutComplete();
    }
  };

  // Start Live Tracking
  const startTracking = () => {
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocalização não é suportada neste dispositivo.');
      return;
    }

    workoutAudio.init();
    setGpsError(null);
    setIsTracking(true);
    setIsPaused(false);
    requestWakeLock();

    // Play start chime if structured workout is enabled
    if (activeStructured && activeStructured.steps && activeStructured.steps.length > 0) {
      workoutAudio.playStepTransition();
    }

    // Timer Interval (every 1 second)
    timerIntervalRef.current = setInterval(() => {
      setDurationSeconds(prev => prev + 1);
      setStepDurationSeconds(prev => {
        const nextSec = prev + 1;
        const { activeStructured: struct, activeStepIndex: curIdx } = trackingRef.current;
        if (struct && struct.steps && curIdx < struct.steps.length) {
          const currentStep = struct.steps[curIdx];
          if (currentStep.targetType === 'time') {
            const timeLeft = currentStep.targetValue - nextSec;
            if (timeLeft <= 3 && timeLeft > 0) {
              workoutAudio.playCountdown(timeLeft);
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
          const { latitude, longitude, accuracy, speed } = position.coords;
          setGpsAccuracyMeters(Math.round(accuracy));
          setCurrentPosition([latitude, longitude]);

          // Discard inaccurate coordinates (> 35 meters error)
          if (accuracy > 35) {
            return;
          }

          const now = Date.now();
          if (speed !== null && speed !== undefined && speed >= 0) {
            setCurrentSpeedKmh(Number((speed * 3.6).toFixed(1)));
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
    startTracking();
  };

  // Finish and Save Live Track
  const finishTracking = () => {
    pauseTracking();
    setIsTracking(false);

    if (gpsPoints.length < 2 && distanceKm < 0.05) {
      alert('Treino muito curto para gerar rota GPS.');
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
      source: 'live_gps',
      recordedAt: new Date().toISOString(),
      completedSteps: finalCompleted.length > 0 ? finalCompleted : undefined
    };

    onRouteCaptured(routeData);
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
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
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          bar: 'bg-amber-500',
          headerBg: 'bg-amber-950/40 border-amber-500/30',
          label: 'TIRO / TRABALHO',
          accent: 'text-amber-400'
        };
      case 'recovery':
        return {
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          bar: 'bg-emerald-500',
          headerBg: 'bg-emerald-950/40 border-emerald-500/30',
          label: 'RECUPERAÇÃO / DESCANSO',
          accent: 'text-emerald-400'
        };
      case 'warmup':
        return {
          bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          bar: 'bg-blue-500',
          headerBg: 'bg-blue-950/40 border-blue-500/30',
          label: 'AQUECIMENTO',
          accent: 'text-blue-400'
        };
      case 'cooldown':
        return {
          bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          bar: 'bg-purple-500',
          headerBg: 'bg-purple-950/40 border-purple-500/30',
          label: 'DESAQUECIMENTO',
          accent: 'text-purple-400'
        };
      default:
        return {
          bg: 'bg-slate-800 text-slate-200 border-slate-700',
          bar: 'bg-emerald-500',
          headerBg: 'bg-slate-900 border-white/10',
          label: 'CORRIDA CONTÍNUA',
          accent: 'text-emerald-400'
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
    <div className="bg-slate-950/95 border border-white/10 rounded-3xl p-5 text-white space-y-5 animate-fade-in shadow-2xl">
      {/* Header com Modos */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase italic tracking-tight">Execução GPS ProRun</h3>
              {activeStructured && (
                <span className="text-[8px] font-black uppercase bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-400/20">
                  DETALHADA
                </span>
              )}
            </div>
            <p className="text-[9px] text-slate-400 font-medium">
              {workoutType} {plannedDistanceKm ? `• Meta: ${plannedDistanceKm} km` : ''}
            </p>
          </div>
        </div>

        {/* Controles de Topo: Som & Alternador de Modo */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl text-xs transition-colors ${
              soundEnabled ? 'bg-white/10 text-emerald-400' : 'bg-white/5 text-slate-500'
            }`}
            title={soundEnabled ? 'Alertas sonoros ativados' : 'Alertas sonoros mudos'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <div className="flex bg-white/5 p-1 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => { if (!isTracking) setActiveMode('live'); }}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase italic transition-all ${
                activeMode === 'live'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              GPS
            </button>
            <button
              type="button"
              onClick={() => { if (!isTracking) setActiveMode('gpx'); }}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase italic transition-all ${
                activeMode === 'gpx'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              .GPX
            </button>
          </div>
        </div>
      </div>

      {/* MODO 1: LIVE GPS NO CELULAR (COM SUPORTE A PRESCRIÇÃO DETALHADA) */}
      {activeMode === 'live' && (
        <div className="space-y-4">
          {/* BOTÃO PARA CONFIGURAR/ESTRUTURAR TIROS (SE NÃO ESTIVER CORRENDO) */}
          {!isTracking && (
            <div className="bg-slate-900/90 p-3 rounded-2xl border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-blue-400 shrink-0" />
                <div className="leading-tight">
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">
                    {activeStructured 
                      ? `Treino Estruturado: ${activeStructured.steps.length} Etapas` 
                      : 'Executar Treino de Tiros / Intervalado?'}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {activeStructured 
                      ? activeStructured.title || 'Pronto para seguir à risca no GPS' 
                      : 'Configure 5x1000m ou outros blocos com bips'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowStructuredModal(true)}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase italic tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Settings className="w-3 h-3" />
                {activeStructured ? 'Alterar' : 'Estruturar'}
              </button>
            </div>
          )}

          {/* PAINEL HUD: ETAPA ATUAL DO TREINO (PRESCRIÇÃO DETALHADA) */}
          {activeStructured && activeStructured.steps && activeStructured.steps.length > 0 && (
            <div className={`p-4 rounded-2xl border ${theme.headerBg} transition-all space-y-3 relative overflow-hidden shadow-inner`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${theme.bg}`}>
                    {theme.label}
                  </span>
                  <span className="text-xs font-black text-white uppercase italic tracking-tight">
                    {isWorkoutCompleted 
                      ? 'Treino Concluído! 🏁' 
                      : `Etapa ${activeStepIndex + 1} de ${activeStructured.steps.length}`}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setShowStepsList(!showStepsList)}
                  className="text-[10px] font-black text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <span>Etapas</span>
                  {showStepsList ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {currentStep && !isWorkoutCompleted ? (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <h4 className="text-xl font-black text-white uppercase italic tracking-tighter">
                        {currentStep.name}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Meta: <strong className="text-slate-200">{formatStepTarget(currentStep)}</strong>
                        {currentStep.targetPaceMin && ` • Ritmo: ${currentStep.targetPaceMin} a ${currentStep.targetPaceMax || ''}`}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className={`text-2xl font-black font-mono tracking-tighter ${theme.accent}`}>
                        {remainingText}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 block">
                        Feito: {currentStep.targetType === 'distance' 
                          ? `${Math.round(stepDistanceMeters)}m` 
                          : formatDuration(stepDurationSeconds)}
                      </span>
                    </div>
                  </div>

                  {/* Barra de Progresso do Passo */}
                  <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${theme.bar} transition-all duration-300 rounded-full`}
                      style={{ width: `${stepProgressPct}%` }}
                    />
                  </div>

                  {/* Pace Gauge & Lap Info */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="bg-white/5 p-2 rounded-xl text-center">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                        Pace da Etapa
                      </span>
                      <span className="text-sm font-black text-white font-mono">
                        {currentStepPace} <span className="text-[9px] text-slate-400">/km</span>
                      </span>
                    </div>
                    <div className="bg-white/5 p-2 rounded-xl text-center">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                        Ritmo Alvo
                      </span>
                      <span className="text-sm font-black text-amber-400 font-mono">
                        {currentStep.targetPaceMin ? `${currentStep.targetPaceMin}` : 'Livre'}
                      </span>
                    </div>
                  </div>

                  {/* Botão LAP / Avançar Etapa */}
                  {isTracking && (
                    <button
                      type="button"
                      onClick={() => advanceStep(true)}
                      className="w-full py-2.5 bg-white/10 hover:bg-white/20 active:scale-[0.98] text-white rounded-xl text-xs font-black uppercase italic tracking-wider flex items-center justify-center gap-2 border border-white/10 transition-all cursor-pointer"
                    >
                      <FastForward className="w-3.5 h-3.5 text-amber-400" />
                      Avançar Etapa (Botão LAP)
                    </button>
                  )}
                </div>
              ) : isWorkoutCompleted ? (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-center space-y-1">
                  <p className="text-xs font-black uppercase italic text-emerald-300">
                    Parabéns! Todas as etapas prescritas foram concluídas!
                  </p>
                  <p className="text-[10px] text-slate-300">
                    Você pode continuar correndo livremente ou tocar em "Concluir & Salvar" abaixo.
                  </p>
                </div>
              ) : null}

              {/* Lista Recolhível de Etapas */}
              {showStepsList && (
                <div className="space-y-1.5 pt-2 border-t border-white/10 max-h-40 overflow-y-auto custom-scrollbar">
                  {activeStructured.steps.map((step, idx) => {
                    const isPassed = idx < activeStepIndex;
                    const isCurrent = idx === activeStepIndex;
                    return (
                      <div 
                        key={step.id || idx}
                        className={`flex items-center justify-between p-2 rounded-xl text-[10px] ${
                          isCurrent 
                            ? 'bg-white/15 border border-white/20 font-black text-white' 
                            : isPassed 
                            ? 'bg-black/20 text-slate-400 line-through opacity-70' 
                            : 'bg-black/10 text-slate-300'
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

          {/* Painel do Relógio & Métricas de Corrida (Gerais) */}
          <div className="grid grid-cols-3 gap-2 bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Distância Total</span>
              <span className="text-xl font-black text-emerald-400 font-mono tracking-tighter">
                {distanceKm.toFixed(2)}
              </span>
              <span className="text-[8px] font-bold text-slate-500 uppercase ml-0.5">KM</span>
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Tempo Total</span>
              <span className="text-xl font-black text-white font-mono tracking-tighter">
                {formatDuration(durationSeconds)}
              </span>
            </div>
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Pace Geral</span>
              <span className="text-xl font-black text-amber-400 font-mono tracking-tighter">
                {currentPace}
              </span>
              <span className="text-[8px] font-bold text-slate-500 uppercase ml-0.5">/KM</span>
            </div>
          </div>

          {/* Status do Sinal do GPS */}
          <div className="flex items-center justify-between px-1 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                gpsAccuracyMeters && gpsAccuracyMeters <= 15 ? 'bg-emerald-400 animate-pulse' :
                gpsAccuracyMeters && gpsAccuracyMeters <= 35 ? 'bg-amber-400' : 'bg-red-400'
              }`} />
              <span className="text-slate-400 font-medium">
                {gpsAccuracyMeters ? `Sinal GPS: ±${gpsAccuracyMeters}m` : 'Aguardando satélites...'}
              </span>
            </div>
            {isTracking && (
              <span className="text-emerald-400 font-black italic uppercase">
                {isPaused ? '⏸ Em Pausa' : '● Gravando Rota'}
              </span>
            )}
          </div>

          {gpsError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-300 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
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
              <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-[2px] rounded-[1.25rem] flex flex-col items-center justify-center p-4 text-center">
                <Footprints className="w-8 h-8 text-emerald-400 mb-2 opacity-80" />
                <p className="text-xs font-black uppercase italic tracking-wider text-white">
                  Pronto para a largada?
                </p>
                <p className="text-[10px] text-slate-300 max-w-xs mt-0.5">
                  {activeStructured 
                    ? 'O app dará avisos sonoros e guiará cada tiro e recuperação automaticamente.' 
                    : 'Toque em Iniciar para rastrear seu trajeto, distância e pace via GPS.'}
                </p>
              </div>
            )}
          </div>

          {/* Histórico de Laps Concluídos */}
          {completedSteps.length > 0 && (
            <div className="space-y-2 bg-white/5 p-3 rounded-2xl border border-white/5">
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-wider block">
                Histórico de Laps / Intervalos ({completedSteps.length})
              </span>
              <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                {completedSteps.map((rec, i) => (
                  <div key={i} className="flex justify-between items-center text-[10px] bg-black/20 p-2 rounded-lg font-mono">
                    <span className="text-slate-300 font-bold">{rec.name}</span>
                    <span className="text-slate-400">{rec.completedDistanceMeters}m • {formatDuration(rec.completedDurationSeconds)}</span>
                    <span className="text-amber-400 font-black">{rec.avgPace}/km</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botões de Controle Live */}
          <div className="pt-2">
            {!isTracking ? (
              <button
                type="button"
                onClick={startTracking}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 text-sm uppercase italic tracking-wider shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" /> Iniciar Corrida com GPS
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {isPaused ? (
                  <button
                    type="button"
                    onClick={resumeTracking}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 text-xs uppercase italic tracking-wider shadow-lg transition-all cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" /> Retomar
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={pauseTracking}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 text-xs uppercase italic tracking-wider shadow-lg transition-all cursor-pointer"
                  >
                    <Pause className="w-4 h-4 fill-slate-950" /> Pausar
                  </button>
                )}

                <button
                  type="button"
                  onClick={finishTracking}
                  className="bg-red-600 hover:bg-red-500 text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 text-xs uppercase italic tracking-wider shadow-lg transition-all cursor-pointer"
                >
                  <Square className="w-4 h-4 fill-white" /> Concluir & Salvar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODO 2: UPLOAD DE ARQUIVO GPX (Strava, Polar, Coros, Apple Watch, etc.) */}
      {activeMode === 'gpx' && (
        <div className="space-y-4">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-emerald-500/30 hover:border-emerald-500 bg-white/5 hover:bg-white/10 rounded-2xl p-6 text-center cursor-pointer transition-all space-y-2"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".gpx,.xml"
              onChange={handleGpxFileUpload}
              className="hidden"
            />
            <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-xs font-black uppercase italic tracking-wider text-white">
              Selecionar Arquivo .GPX do Relógio
            </p>
            <p className="text-[10px] text-slate-400 font-medium max-w-xs mx-auto">
              Compatível com arquivos .GPX de qualquer relógio GPS ou app (Strava, Polar, Coros, Apple Watch).
            </p>
          </div>

          {gpxUploading && (
            <div className="flex items-center justify-center gap-2 text-emerald-400 text-xs font-black">
              <RefreshCw className="w-4 h-4 animate-spin" /> Processando rota do satélite...
            </div>
          )}

          {gpxError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-red-300 text-xs font-medium">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{gpxError}</span>
            </div>
          )}

          {/* Rota GPX Carregada */}
          {gpxParsedRoute && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid grid-cols-4 gap-2 bg-white/5 p-3 rounded-2xl border border-white/5 text-center">
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Distância</span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    {gpxParsedRoute.totalDistanceKm}k
                  </span>
                </div>
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Tempo</span>
                  <span className="text-base font-black text-white font-mono">
                    {formatDuration(gpxParsedRoute.totalDurationSeconds)}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Pace</span>
                  <span className="text-base font-black text-amber-400 font-mono">
                    {gpxParsedRoute.avgPace}
                  </span>
                </div>
                <div>
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Altimetria</span>
                  <span className="text-base font-black text-blue-400 font-mono">
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

              <button
                type="button"
                onClick={confirmGpxRoute}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-2xl flex items-center justify-center gap-2 text-xs uppercase italic tracking-wider shadow-lg shadow-emerald-600/20 transition-all active:scale-[0.98] cursor-pointer"
              >
                <Check className="w-4 h-4" /> Vincular esta Rota ao Treino
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL DE PRESCRIÇÃO DETALHADA */}
      {showStructuredModal && (
        <StructuredWorkoutModal
          initialWorkout={activeStructured || undefined}
          workoutDescription={workoutDescription}
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
    </div>
  );
};

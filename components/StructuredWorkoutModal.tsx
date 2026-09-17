import React, { useState, useEffect, useMemo } from 'react';
import { 
  Timer, 
  Sparkles, 
  Layers, 
  Trash2, 
  Plus, 
  Check, 
  X, 
  Flame, 
  RefreshCw, 
  ArrowRight,
  ShieldAlert,
  Gauge,
  Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StructuredWorkout, WorkoutStep, StepType, TrainingPace, WorkoutType } from '../types';
import { 
  buildStructuredWorkout, 
  parseWorkoutTextToStructure, 
  formatStepTarget,
  getSuggestedPaces
} from '../utils/workoutParser';

interface StructuredWorkoutModalProps {
  initialWorkout?: StructuredWorkout;
  workoutDescription?: string;
  workoutType?: WorkoutType;
  athletePaces?: TrainingPace[];
  onSave: (structured: StructuredWorkout) => void;
  onClose: () => void;
}

export const StructuredWorkoutModal: React.FC<StructuredWorkoutModalProps> = ({
  initialWorkout,
  workoutDescription,
  workoutType,
  athletePaces,
  onSave,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'quick_text' | 'builder'>('quick_text');

  // Quick Text State
  const [quickTextInput, setQuickTextInput] = useState(workoutDescription || '5x1000m rec 2min');
  const [parseError, setParseError] = useState<string | null>(null);

  // Suggested Paces based on Workout Type and Athlete
  const paceData = useMemo(() => {
    return getSuggestedPaces(workoutType, athletePaces);
  }, [workoutType, athletePaces]);

  // Visual Builder States - Aquecimento (Warmup)
  const [hasWarmup, setHasWarmup] = useState(true);
  const [warmupType, setWarmupType] = useState<'distance' | 'time'>('distance');
  const [warmupDistMeters, setWarmupDistMeters] = useState(1500); // 1.5km
  const [warmupMinutes, setWarmupMinutes] = useState(10); // 10 min
  
  const [repetitions, setRepetitions] = useState(5);
  const [intervalType, setIntervalType] = useState<'distance' | 'time'>('distance');
  const [intervalMeters, setIntervalMeters] = useState(1000); // 1000m
  const [intervalSeconds, setIntervalSeconds] = useState(240); // 4 min
  const [targetPaceMin, setTargetPaceMin] = useState(paceData.suggestedPace.minPace || '04:10');
  const [targetPaceMax, setTargetPaceMax] = useState(paceData.suggestedPace.maxPace || '04:25');

  const [recoveryType, setRecoveryType] = useState<'time' | 'distance'>('time');
  const [recoverySeconds, setRecoverySeconds] = useState(120); // 2 min
  const [recoveryMeters, setRecoveryMeters] = useState(400); // 400m

  // Visual Builder States - Desaquecimento (Cooldown)
  const [hasCooldown, setHasCooldown] = useState(true);
  const [cooldownType, setCooldownType] = useState<'distance' | 'time'>('distance');
  const [cooldownDistMeters, setCooldownDistMeters] = useState(1000); // 1km
  const [cooldownMinutes, setCooldownMinutes] = useState(10); // 10 min

  // Current Generated Steps Preview
  const [previewWorkout, setPreviewWorkout] = useState<StructuredWorkout | null>(null);

  // Generate from visual builder
  const generateFromBuilder = (overrides?: {
    wType?: 'distance' | 'time';
    wVal?: number;
    cType?: 'distance' | 'time';
    cVal?: number;
    pMin?: string;
    pMax?: string;
  }) => {
    const activeWarmupType = overrides?.wType ?? warmupType;
    const activeWarmupValue = overrides?.wVal ?? (activeWarmupType === 'distance' ? warmupDistMeters : warmupMinutes * 60);

    const activeCooldownType = overrides?.cType ?? cooldownType;
    const activeCooldownValue = overrides?.cVal ?? (activeCooldownType === 'distance' ? cooldownDistMeters : cooldownMinutes * 60);

    const activePaceMin = overrides?.pMin ?? targetPaceMin;
    const activePaceMax = overrides?.pMax ?? targetPaceMax;

    const res = buildStructuredWorkout({
      repetitions,
      intervalTargetType: intervalType,
      intervalValue: intervalType === 'distance' ? intervalMeters : intervalSeconds,
      recoveryTargetType: recoveryType,
      recoveryValue: recoveryType === 'time' ? recoverySeconds : recoveryMeters,
      targetPaceMin: activePaceMin || undefined,
      targetPaceMax: activePaceMax || undefined,
      warmupValue: hasWarmup ? activeWarmupValue : undefined,
      warmupTargetType: activeWarmupType,
      cooldownValue: hasCooldown ? activeCooldownValue : undefined,
      cooldownTargetType: activeCooldownType
    });
    setPreviewWorkout(res);
  };

  // Initialize from initialWorkout if provided
  useEffect(() => {
    if (initialWorkout && initialWorkout.steps && initialWorkout.steps.length > 0) {
      setPreviewWorkout(initialWorkout);

      const wStep = initialWorkout.steps.find(s => s.type === 'warmup');
      if (wStep) {
        setHasWarmup(true);
        if (wStep.targetType === 'time') {
          setWarmupType('time');
          setWarmupMinutes(Math.max(1, Math.round(wStep.targetValue / 60)));
        } else {
          setWarmupType('distance');
          setWarmupDistMeters(wStep.targetValue);
        }
      }

      const cStep = initialWorkout.steps.find(s => s.type === 'cooldown');
      if (cStep) {
        setHasCooldown(true);
        if (cStep.targetType === 'time') {
          setCooldownType('time');
          setCooldownMinutes(Math.max(1, Math.round(cStep.targetValue / 60)));
        } else {
          setCooldownType('distance');
          setCooldownDistMeters(cStep.targetValue);
        }
      }

      const intStep = initialWorkout.steps.find(s => s.type === 'interval');
      if (intStep) {
        if (intStep.targetPaceMin) setTargetPaceMin(intStep.targetPaceMin);
        if (intStep.targetPaceMax) setTargetPaceMax(intStep.targetPaceMax);
      }
    } else if (workoutDescription) {
      const parsed = parseWorkoutTextToStructure(workoutDescription, workoutType, athletePaces);
      if (parsed) {
        setPreviewWorkout(parsed);
        const intStep = parsed.steps.find(s => s.type === 'interval');
        if (intStep?.targetPaceMin) {
          setTargetPaceMin(intStep.targetPaceMin);
          setTargetPaceMax(intStep.targetPaceMax || '');
        }
      } else {
        generateFromBuilder();
      }
    } else {
      generateFromBuilder();
    }
  }, []);

  // Handle Quick Text Parse
  const handleParseQuickText = () => {
    setParseError(null);
    const parsed = parseWorkoutTextToStructure(quickTextInput, workoutType, athletePaces);
    if (parsed) {
      setPreviewWorkout(parsed);
    } else {
      setParseError('Não foi possível identificar repetições ou intervalos. Ex: "5x1000m rec 2min" ou "6x400m r: 1min"');
    }
  };

  // Quick Preset Click
  const applyPreset = (text: string) => {
    setQuickTextInput(text);
    const parsed = parseWorkoutTextToStructure(text, workoutType, athletePaces);
    if (parsed) {
      setPreviewWorkout(parsed);
      setParseError(null);
    }
  };

  const removeStep = (indexToRemove: number) => {
    if (!previewWorkout) return;
    const newSteps = previewWorkout.steps.filter((_, idx) => idx !== indexToRemove);
    setPreviewWorkout({
      ...previewWorkout,
      steps: newSteps
    });
  };

  const handleSave = () => {
    if (!previewWorkout || previewWorkout.steps.length === 0) {
      alert('Estruture ao menos uma etapa no treino.');
      return;
    }
    onSave(previewWorkout);
  };

  const getStepColor = (type: StepType) => {
    switch (type) {
      case 'warmup':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'interval':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'recovery':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'cooldown':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default:
        return 'bg-slate-700/30 text-slate-300 border-slate-600/30';
    }
  };

  const getStepBadge = (type: StepType) => {
    switch (type) {
      case 'warmup': return 'Aquecimento';
      case 'interval': return 'Tiro';
      case 'recovery': return 'Recuperação';
      case 'cooldown': return 'Desaquecimento';
      default: return 'Contínuo';
    }
  };

  return (
    <div className="fixed inset-0 z-[230] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center shadow-inner">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white uppercase italic tracking-tight">
                  Estruturação Detalhada de Treino
                </h3>
                <span className="text-[9px] font-black uppercase tracking-wider bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-400/20">
                  DETALHADA
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                Passo a passo com alertas sonoros e transições automáticas por GPS no celular
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex px-6 pt-4 pb-2 border-b border-white/5 gap-2 bg-slate-950/40">
          <button
            type="button"
            onClick={() => setActiveTab('quick_text')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase italic tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'quick_text'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Modo Rápido (Texto)
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('builder');
              generateFromBuilder();
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase italic tracking-wider transition-all flex items-center gap-2 ${
              activeTab === 'builder'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'text-slate-400 hover:text-white bg-white/5'
            }`}
          >
            <Layers className="w-3.5 h-3.5" /> Construtor Visual
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          {/* TAB 1: QUICK TEXT */}
          {activeTab === 'quick_text' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  Digite a Notação do Treino
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickTextInput}
                    onChange={(e) => setQuickTextInput(e.target.value)}
                    placeholder="Ex: 5x1000m rec 2min ou 2km aq + 6x400m r:90s + 1km des"
                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-sm font-semibold outline-none focus:border-blue-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleParseQuickText}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-3 rounded-2xl font-black text-xs uppercase italic tracking-wider shadow-lg shadow-blue-600/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ArrowRight className="w-4 h-4" /> Converter
                  </button>
                </div>
              </div>

              {parseError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs font-medium flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Exemplos Rápidos */}
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Exemplos Rápidos (Clique para aplicar):
                </span>
                <div className="flex flex-wrap gap-2">
                  {[
                    '5x1000m rec 2min',
                    '2km aq + 6x400m r: 1min + 1km des',
                    '4x 2000m rec 3min',
                    '8x 300m rec 45s',
                    '10x 1min forte / 1min leve',
                    '1.5km aq + 5x800m r: 90s + 1km des'
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="px-2.5 py-1 bg-white/5 hover:bg-blue-600/20 hover:border-blue-500/40 text-slate-300 hover:text-white text-[11px] rounded-lg border border-white/5 font-mono transition-all cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: VISUAL BUILDER */}
          {activeTab === 'builder' && (
            <div className="space-y-5">
              {/* Aquecimento */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white uppercase italic flex items-center gap-1.5">
                    <Flame className="w-4 h-4 text-blue-400" /> 1. Aquecimento
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasWarmup}
                      onChange={(e) => {
                        setHasWarmup(e.target.checked);
                        setTimeout(() => generateFromBuilder(), 50);
                      }}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-white/10 border-white/20"
                    />
                    <span className="text-xs text-slate-300 font-bold">Incluir</span>
                  </label>
                </div>
                {hasWarmup && (
                  <div className="space-y-2 pt-1 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="flex bg-white/5 p-0.5 rounded-xl border border-white/5">
                        <button
                          type="button"
                          onClick={() => {
                            setWarmupType('distance');
                            generateFromBuilder({ wType: 'distance' });
                          }}
                          className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${
                            warmupType === 'distance' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Distância (km/m)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setWarmupType('time');
                            generateFromBuilder({ wType: 'time' });
                          }}
                          className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${
                            warmupType === 'time' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Tempo (min)
                        </button>
                      </div>
                    </div>

                    {warmupType === 'distance' ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        {[1000, 1500, 2000, 3000].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setWarmupDistMeters(m);
                              generateFromBuilder({ wType: 'distance', wVal: m });
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase italic transition-all ${
                              warmupDistMeters === m
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {m >= 1000 ? `${m / 1000}km` : `${m}m`}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        {[5, 10, 15, 20].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => {
                              setWarmupMinutes(mins);
                              generateFromBuilder({ wType: 'time', wVal: mins * 60 });
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase italic transition-all ${
                              warmupMinutes === mins
                                ? 'bg-blue-600 text-white shadow-md'
                                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {mins} min
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bloco de Tiros */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-4">
                <span className="text-xs font-black text-amber-300 uppercase italic flex items-center gap-1.5">
                  <Timer className="w-4 h-4 text-amber-400" /> 2. Bloco de Tiros / Intervalos
                </span>

                {/* Repetições */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Número de Repetições
                  </label>
                  <div className="flex items-center gap-2">
                    {[3, 4, 5, 6, 8, 10, 12].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          setRepetitions(num);
                          setTimeout(generateFromBuilder, 50);
                        }}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black ${
                          repetitions === num
                            ? 'bg-amber-500 text-slate-950 shadow-md font-mono'
                            : 'bg-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {num}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tiro (Trabalho) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Tiro (Trabalho)
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIntervalType('distance');
                          setTimeout(generateFromBuilder, 50);
                        }}
                        className={`flex-1 py-1 text-[10px] font-black uppercase rounded-lg ${
                          intervalType === 'distance' ? 'bg-amber-500 text-slate-950' : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        Metros
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIntervalType('time');
                          setTimeout(generateFromBuilder, 50);
                        }}
                        className={`flex-1 py-1 text-[10px] font-black uppercase rounded-lg ${
                          intervalType === 'time' ? 'bg-amber-500 text-slate-950' : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        Tempo
                      </button>
                    </div>

                    {intervalType === 'distance' ? (
                      <div className="flex flex-wrap gap-1.5">
                        {[400, 500, 800, 1000, 1200, 1500, 2000].map((dist) => (
                          <button
                            key={dist}
                            type="button"
                            onClick={() => {
                              setIntervalMeters(dist);
                              setTimeout(generateFromBuilder, 50);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                              intervalMeters === dist ? 'bg-white text-slate-950' : 'bg-white/5 text-slate-300'
                            }`}
                          >
                            {dist >= 1000 ? `${dist / 1000}k` : `${dist}m`}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {[30, 60, 90, 120, 180, 240, 300].map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => {
                              setIntervalSeconds(sec);
                              setTimeout(generateFromBuilder, 50);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                              intervalSeconds === sec ? 'bg-white text-slate-950' : 'bg-white/5 text-slate-300'
                            }`}
                          >
                            {sec >= 60 ? `${sec / 60}min` : `${sec}s`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Recuperação */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                      Recuperação (Descanso)
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setRecoveryType('time');
                          setTimeout(generateFromBuilder, 50);
                        }}
                        className={`flex-1 py-1 text-[10px] font-black uppercase rounded-lg ${
                          recoveryType === 'time' ? 'bg-emerald-500 text-slate-950' : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        Tempo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRecoveryType('distance');
                          setTimeout(generateFromBuilder, 50);
                        }}
                        className={`flex-1 py-1 text-[10px] font-black uppercase rounded-lg ${
                          recoveryType === 'distance' ? 'bg-emerald-500 text-slate-950' : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        Metros
                      </button>
                    </div>

                    {recoveryType === 'time' ? (
                      <div className="flex flex-wrap gap-1.5">
                        {[45, 60, 90, 120, 180].map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => {
                              setRecoverySeconds(sec);
                              setTimeout(generateFromBuilder, 50);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                              recoverySeconds === sec ? 'bg-white text-slate-950' : 'bg-white/5 text-slate-300'
                            }`}
                          >
                            {sec >= 60 ? `${sec / 60}min` : `${sec}s`}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {[200, 400, 500].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setRecoveryMeters(m);
                              setTimeout(generateFromBuilder, 50);
                            }}
                            className={`px-2.5 py-1 rounded-lg text-xs font-black ${
                              recoveryMeters === m ? 'bg-white text-slate-950' : 'bg-white/5 text-slate-300'
                            }`}
                          >
                            {m}m
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Ritmo Alvo com Integração ao Tipo de Treino */}
                <div className="pt-3 border-t border-white/5 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="text-[11px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                          <span>Tipo: {workoutType || 'Intervalado'}</span>
                          <span className="text-amber-400">➔ Zona {paceData.suggestedPace.zone} ({paceData.suggestedPace.name})</span>
                        </div>
                        <div className="text-[10px] text-amber-200/70 font-mono">
                          Pace Sugerido: {paceData.suggestedPace.minPace} - {paceData.suggestedPace.maxPace} /km
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTargetPaceMin(paceData.suggestedPace.minPace);
                        setTargetPaceMax(paceData.suggestedPace.maxPace);
                        generateFromBuilder({
                          pMin: paceData.suggestedPace.minPace,
                          pMax: paceData.suggestedPace.maxPace
                        });
                      }}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer shadow-md"
                    >
                      ⚡ Usar Ritmo do Tipo
                    </button>
                  </div>

                  {/* Seleção Rápida de Zonas do Atleta */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">
                      Zonas de Ritmo do Atleta:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      {paceData.allPaces.slice(0, 5).map((p) => {
                        const isSelected = targetPaceMin === p.minPace && targetPaceMax === p.maxPace;
                        return (
                          <button
                            key={p.zone}
                            type="button"
                            onClick={() => {
                              setTargetPaceMin(p.minPace);
                              setTargetPaceMax(p.maxPace);
                              generateFromBuilder({
                                pMin: p.minPace,
                                pMax: p.maxPace
                              });
                            }}
                            className={`p-1.5 rounded-lg text-left transition-all border ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-500/60 text-white shadow-sm'
                                : 'bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between text-[10px] font-black">
                              <span className={isSelected ? 'text-amber-400' : 'text-slate-300'}>{p.zone}</span>
                              <span className="text-[8px] opacity-70 truncate max-w-[50px]">{p.name}</span>
                            </div>
                            <div className="text-[9px] font-mono mt-0.5 opacity-90 truncate">
                              {p.minPace}-{p.maxPace}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Gauge className="w-3.5 h-3.5 text-amber-400" /> Pace Personalizado:
                    </label>
                    <input
                      type="text"
                      placeholder="04:10"
                      value={targetPaceMin}
                      onChange={(e) => setTargetPaceMin(e.target.value)}
                      className="w-20 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-white text-xs font-mono text-center outline-none focus:border-amber-500"
                    />
                    <span className="text-slate-500 text-xs">até</span>
                    <input
                      type="text"
                      placeholder="04:25"
                      value={targetPaceMax}
                      onChange={(e) => setTargetPaceMax(e.target.value)}
                      className="w-20 bg-white/5 border border-white/10 rounded-xl px-2.5 py-1.5 text-white text-xs font-mono text-center outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => generateFromBuilder()}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-[10px] font-black uppercase italic transition-all cursor-pointer"
                    >
                      Atualizar
                    </button>
                  </div>
                </div>
              </div>

              {/* Desaquecimento */}
              <div className="bg-white/5 p-4 rounded-2xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white uppercase italic flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-400" /> 3. Desaquecimento
                  </span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasCooldown}
                      onChange={(e) => {
                        setHasCooldown(e.target.checked);
                        setTimeout(() => generateFromBuilder(), 50);
                      }}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-0 bg-white/10 border-white/20"
                    />
                    <span className="text-xs text-slate-300 font-bold">Incluir</span>
                  </label>
                </div>
                {hasCooldown && (
                  <div className="space-y-2 pt-1 border-t border-white/5">
                    <div className="flex items-center gap-2">
                      <div className="flex bg-white/5 p-0.5 rounded-xl border border-white/5">
                        <button
                          type="button"
                          onClick={() => {
                            setCooldownType('distance');
                            generateFromBuilder({ cType: 'distance' });
                          }}
                          className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${
                            cooldownType === 'distance' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Distância (km/m)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCooldownType('time');
                            generateFromBuilder({ cType: 'time' });
                          }}
                          className={`px-3 py-1 text-[10px] font-black uppercase rounded-lg transition-all ${
                            cooldownType === 'time' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          Tempo (min)
                        </button>
                      </div>
                    </div>

                    {cooldownType === 'distance' ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        {[500, 1000, 1500, 2000].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setCooldownDistMeters(m);
                              generateFromBuilder({ cType: 'distance', cVal: m });
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase italic transition-all ${
                              cooldownDistMeters === m
                                ? 'bg-purple-600 text-white shadow-md'
                                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {m >= 1000 ? `${m / 1000}km` : `${m}m`}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap">
                        {[5, 10, 15, 20].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => {
                              setCooldownMinutes(mins);
                              generateFromBuilder({ cType: 'time', cVal: mins * 60 });
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase italic transition-all ${
                              cooldownMinutes === mins
                                ? 'bg-purple-600 text-white shadow-md'
                                : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            {mins} min
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* LISTA PREVIEW DAS ETAPAS GERADAS (ESTRUTURAÇÃO DETALHADA) */}
          {previewWorkout && previewWorkout.steps.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-white uppercase italic tracking-wider">
                    Sequência de Execução ({previewWorkout.steps.length} Etapas)
                  </span>
                  {previewWorkout.totalDistanceEstimatedKm && (
                    <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                      ~{previewWorkout.totalDistanceEstimatedKm} KM TOTAL
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
                {previewWorkout.steps.map((step, idx) => (
                  <div
                    key={step.id || idx}
                    className="flex items-center justify-between bg-slate-950/60 p-3 rounded-2xl border border-white/5 hover:border-white/10 transition-all text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 text-[10px] font-black text-slate-500 font-mono">
                        {(idx + 1).toString().padStart(2, '0')}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg font-black uppercase italic text-[10px] border ${getStepColor(step.type)}`}>
                        {getStepBadge(step.type)}
                      </span>
                      <div>
                        <p className="font-black text-white uppercase italic tracking-tight text-xs">
                          {step.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          Meta: <strong className="text-slate-200">{formatStepTarget(step)}</strong>
                          {step.targetPaceMin && ` • Pace: ${step.targetPaceMin} - ${step.targetPaceMax || ''}`}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeStep(idx)}
                      className="p-2 text-slate-500 hover:text-red-400 transition-colors"
                      title="Excluir etapa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/5 flex justify-end gap-3 bg-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl text-xs font-black uppercase italic tracking-wider text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-3 rounded-xl text-xs font-black uppercase italic tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all active:scale-[0.98] cursor-pointer flex items-center gap-2"
          >
            <Check className="w-4 h-4" /> Salvar Prescrição Detalhada
          </button>
        </div>
      </motion.div>
    </div>
  );
};

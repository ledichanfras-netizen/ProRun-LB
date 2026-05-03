
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { calculatePaces } from '../utils/calculations';
import { exportToImage } from '../utils/exporter';
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
  PlayCircle
} from 'lucide-react';
import { WorkoutType } from '../types';
import { PrintLayout } from '../components/PrintLayout';
import { AIPerformanceHub } from '../components/AIPerformanceHub';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  ResponsiveContainer 
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
  const visibleWeeks = allWeeks.filter(w => w.isVisible === true);
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

  const isFinalWorkout = React.useMemo(() => {
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

  const nextWorkout = React.useMemo(() => {
    if (!visibleWeeks.length) return null;
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday
    const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Map Sun(0) to Index 6, Mon(1) to Index 0
    
    // Tentamos encontrar o treino da semana atual
    const currentWeek = visibleWeeks[0];
    if (!currentWeek || !currentWeek.workouts) return null;
    
    const workout = currentWeek.workouts[dayIndex];
    return workout ? { workout, weekIndex: allWeeks.indexOf(currentWeek), dayIndex } : null;
  }, [visibleWeeks, allWeeks]);

  const weeklyProgress = React.useMemo(() => {
    if (!visibleWeeks.length) return { completed: 0, total: 0 };
    const currentWeek = visibleWeeks[0];
    const completed = currentWeek.workouts.filter(w => w.completed).length;
    return { completed, total: currentWeek.workouts.length };
  }, [visibleWeeks]);

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
        rpeValue
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
    setSaveSuccess(false);
    setIsSaving(false);
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-24 animate-fade-in no-print">
      {/* Header com Status Físico */}
      <div className="flex flex-col gap-4 px-2">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h1 className="text-2xl font-black text-slate-800 italic uppercase tracking-tighter">
              Olá, {activeAthlete.name.split(' ')[0]}!
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
                {nextWorkout?.workout.type === 'Descanso' ? 'Recuperação' : 'Treino de Hoje'}
              </div>
              {nextWorkout?.workout.completed && (
                <div className="flex items-center gap-1 text-emerald-400 font-black text-[9px] uppercase italic">
                  <CheckCircle className="w-3 h-3" /> Concluído
                </div>
              )}
            </div>

            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2 leading-tight">
              {nextWorkout ? nextWorkout.workout.type : 'Dia de Descanso'}
            </h2>
            
            <p className="text-emerald-300/80 text-sm font-medium mb-8 leading-relaxed line-clamp-2">
              {nextWorkout ? nextWorkout.workout.customDescription : 'Aproveite para recuperar as energias e focar na mobilidade.'}
            </p>

            {nextWorkout && nextWorkout.workout.type !== 'Descanso' && (
              <button 
                onClick={() => openWorkoutModal(nextWorkout.weekIndex, nextWorkout.dayIndex, nextWorkout.workout)}
                className="w-full bg-white text-emerald-950 font-black py-4 rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-black/20 hover:bg-emerald-50 transition-all active:scale-[0.98] uppercase italic tracking-tighter"
              >
                {nextWorkout.workout.completed ? <Check className="w-5 h-5" /> : <Zap className="w-5 h-5 fill-emerald-500 text-emerald-500" />} 
                {nextWorkout.workout.completed ? 'Ver Detalhes' : 'Iniciar Treino'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Resumo Semanal Mini */}
      <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-slate-800 text-xs uppercase italic tracking-tighter flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" /> Sua Constância
          </h3>
          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase italic border border-emerald-100">
            {weeklyProgress.completed}/{weeklyProgress.total} Concluídos
          </span>
        </div>
        
        <div className="flex justify-between gap-2">
          {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((day, i) => {
            const currentDayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
            const isToday = i === currentDayIndex;
            const isDone = i < (visibleWeeks[0]?.workouts.filter(w => w.completed).length || 0); // Simplified logic
            
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
                  visibleWeeks[0]?.workouts[i]?.completed ? 'bg-emerald-500 scale-110 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-200'
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
          {visibleWeeks.map((week, wIdx) => {
             const originalWeekIndex = allWeeks.findIndex(p => p.weekNumber === week.weekNumber);
             return (
               <div key={wIdx} className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase italic">Semana {week.weekNumber}</span>
                    <span className="text-[10px] font-black text-emerald-600 bg-white px-2 py-0.5 rounded-lg border border-slate-100 italic">{week.totalVolume} KM</span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5 md:gap-2 mb-4">
                    {week.workouts.map((workout, dIdx) => (
                      <button 
                        key={dIdx}
                        onClick={() => openWorkoutModal(originalWeekIndex, dIdx, workout)}
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
        
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={visibleWeeks.slice().reverse().map(w => ({ name: `S${w.weekNumber}`, km: w.totalVolume }))}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} 
              />
              <Tooltip 
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 'bold' }}
              />
              <Bar dataKey="km" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        <p className="text-[9px] text-slate-400 font-bold uppercase italic tracking-widest text-center mt-6">
          Volume total acumulado (KM) por semana
        </p>
      </div>

      {selectedWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md no-print" onClick={() => !isSaving && setSelectedWorkout(null)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
            <div className={`p-6 md:p-8 border-b flex justify-between items-start flex-shrink-0 ${isFinalWorkout ? 'bg-emerald-950 text-white' : 'bg-slate-50'}`}>
               <div className="flex flex-col">
                  <span className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 italic ${isFinalWorkout ? 'text-emerald-400' : 'text-slate-400'}`}>{selectedWorkout.data.day}</span>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-black uppercase italic tracking-tighter">{isFinalWorkout ? '🏁 PROVA ALVO' : (selectedWorkout.data.type || 'Treino')}</h3>
                  </div>
               </div>
               <button disabled={isSaving} onClick={() => setSelectedWorkout(null)} className={`p-3 rounded-full transition-colors ${isFinalWorkout ? 'bg-white/10 hover:bg-white/20' : 'bg-slate-200/50 hover:bg-slate-200'}`}><X className="w-5 h-5" /></button>
            </div>
            
            <div className="p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
              <div className={`${isFinalWorkout ? 'bg-emerald-950 border-emerald-900 text-white' : 'bg-emerald-50/30 border-emerald-100 text-emerald-950'} p-6 rounded-3xl border text-center italic font-bold shadow-sm leading-relaxed text-sm`}>
                "{selectedWorkout.data.customDescription}"
              </div>

              {/* Hub de Ritmos do Atleta */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                  <Flag className="w-3.5 h-3.5 text-emerald-500" /> Seus Ritmos Alvo
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {paces.map((p, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider mb-0.5">{p.zone}</span>
                      <span className="text-sm font-black text-emerald-600 italic tracking-tighter">{p.minPace} min/km</span>
                      {p.heartRateRange && (
                        <span className="text-[7px] font-bold text-slate-300 uppercase">{p.heartRateRange} bpm</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
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
                          ? 'bg-emerald-950 text-white border-emerald-950 scale-105 shadow-lg' 
                          : 'bg-white text-slate-400 border-slate-100 hover:border-emerald-300 hover:text-emerald-600'}
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
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Cronômetro de Suporte</span>
                    <span className="text-[8px] text-slate-300 font-bold uppercase italic">Use para marcar intervalos ou tempo total</span>
                  </div>
                  <TimerComponent />
                </div>
                <textarea 
                  disabled={isSaving}
                  className="w-full p-5 border border-slate-200 rounded-[1.5rem] text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all resize-none italic shadow-sm bg-slate-50"
                  rows={4}
                  placeholder="Relate sensações, dores ou conquistas..."
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                />
              </div>
            </div>

            <div className="p-6 md:p-8 bg-white border-t flex-shrink-0">
              <button 
                onClick={handleToggleComplete} 
                disabled={isSaving}
                className={`w-full py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 
                  ${saveSuccess ? 'bg-emerald-500 text-white' : 'bg-emerald-950 text-white hover:bg-black active:scale-95'} 
                  disabled:opacity-50`}
              >
                {isSaving ? (
                  <div className="flex items-center gap-3">
                    {saveSuccess ? <Check className="w-6 h-6 animate-fade-in" /> : <Loader2 className="w-6 h-6 animate-spin" />}
                    <span>{saveSuccess ? 'SINCRONIZADO!' : 'SINCRONIZANDO...'}</span>
                  </div>
                ) : (
                  selectedWorkout.data.completed ? 'DESMARCAR CONCLUÍDO' : 'CONCLUIR TREINO'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AthletePortal;

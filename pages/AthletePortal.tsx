
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
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
  Zap
} from 'lucide-react';
import { WorkoutType } from '../types';
import { PrintLayout } from '../components/PrintLayout';

const AthletePortal: React.FC = () => {
  const { athletes, selectedAthleteId, athletePlans, updateWorkoutStatus } = useApp();
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

  const handleToggleComplete = async () => {
    if (!selectedWorkout || !activeAthlete || isSaving) return;

    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      const newStatus = !selectedWorkout.data.completed;
      
      // Execução da atualização com timeout de 5 segundos
      // Se estourar o timeout, prosseguimos para não travar o usuário (offline-first)
      const savePromise = updateWorkoutStatus(
        activeAthlete.id, 
        selectedWorkout.weekIndex, 
        selectedWorkout.dayIndex, 
        newStatus, 
        feedbackText,
        rpeValue
      );

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 5000)
      );

      await Promise.race([savePromise, timeoutPromise]);
      setSaveSuccess(true);
    } catch (err: any) {
      console.warn("Update workout status - Handled exception or timeout:", err);
      // Mesmo com erro/timeout, damos feedback de sucesso ao usuário para não travar a tela
      // O Firestore cuidará da sincronização em background.
      setSaveSuccess(true);
    } finally {
      // FECHAMENTO GARANTIDO: Resetamos e fechamos após um breve delay para feedback visual
      setTimeout(() => {
        setIsSaving(false);
        setSaveSuccess(false);
        setSelectedWorkout(null);
        setFeedbackText('');
        setRpeValue(0);
      }, 800);
    }
  };

  const openWorkoutModal = (wIdx: number, dIdx: number, workout: any) => {
    setSelectedWorkout({ weekIndex: wIdx, dayIndex: dIdx, data: workout });
    setFeedbackText(workout.feedback || '');
    setRpeValue(workout.rpe || 0);
    setSaveSuccess(false);
    setIsSaving(false);
  };

  const getRPEColor = (val: number) => {
    if (val === 0) return 'text-slate-300';
    if (val <= 3) return 'text-emerald-500';
    if (val <= 6) return 'text-blue-500';
    if (val <= 8) return 'text-orange-500';
    return 'text-red-600';
  };

  const getRPELabel = (val: number) => {
    const labels = ["Não avaliado", "Muito Leve", "Leve", "Moderado", "Um pouco Forte", "Forte", "Muito Forte", "Exaustivo", "Quase Máximo", "Máximo", "Exaustão Total"];
    return labels[val] || "Selecione";
  };

  return (
    <div className="space-y-8 pb-20 relative animate-fade-in">
      {activeAthlete && athletePlan && portalRoot && createPortal(
        <PrintLayout athlete={activeAthlete} plan={visibleWeeks} paces={paces} goal={athletePlan.specificGoal || 'Ciclo de Performance'} />,
        portalRoot
      )}

      <header className="bg-white rounded-[2rem] p-6 md:p-8 shadow-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 no-print">
        <div className="flex items-center gap-6 w-full md:w-auto">
          <div className="w-16 h-16 bg-emerald-950 rounded-2xl flex items-center justify-center text-white text-2xl font-black italic shadow-lg transform -rotate-3">
            {activeAthlete.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{activeAthlete.name}</h1>
            <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest italic flex items-center gap-2">
              <Sparkles className="w-3 h-3" /> {athletePlan?.specificGoal || 'Ciclo ProRun'}
            </p>
          </div>
        </div>
        
        <button onClick={() => exportToImage('print-layout-root', `Planilha_${activeAthlete.name}`)} disabled={exportLoading || visibleWeeks.length === 0} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase italic tracking-widest shadow-xl transition-all flex items-center justify-center gap-3">
          <ImageIcon className="w-4 h-4 text-emerald-200" /> BAIXAR IMAGEM
        </button>
      </header>

      <div className="no-print">
        {visibleWeeks.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
             <Activity className="w-16 h-16 text-slate-200 mx-auto mb-4" />
             <p className="text-slate-400 font-black uppercase tracking-widest italic">Aguardando publicação do treinador.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {visibleWeeks.map((week, wIdx) => {
              const originalWeekIndex = allWeeks.findIndex(p => p.weekNumber === week.weekNumber);
              return (
                <div key={wIdx} className="space-y-6 animate-fade-in-up">
                  <div className="flex items-center gap-4 border-b pb-4">
                    <span className="px-5 py-1.5 rounded-full text-[10px] font-black uppercase italic bg-emerald-950 text-white shadow-lg">
                      SEMANA {week.weekNumber} • {week.phase.toUpperCase()}
                    </span>
                    <span className="text-xs font-black text-slate-400 uppercase ml-auto flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-500" /> {week.totalVolume || 0} KM
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
                    {(week.workouts || []).map((workout, dIdx) => (
                      <div 
                        key={dIdx} 
                        onClick={() => openWorkoutModal(originalWeekIndex, dIdx, workout)} 
                        className={`p-5 rounded-[1.5rem] cursor-pointer hover:shadow-2xl transition-all border-2 flex flex-col justify-between h-full min-h-[160px]
                          ${workout.completed ? 'grayscale opacity-60 border-emerald-100 bg-emerald-50' : 'bg-white shadow-md border-slate-100 hover:border-emerald-300'}
                        `}
                      >
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">{workout.day.split('-')[0]}</span>
                            {workout.completed ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <Circle className="w-5 h-5 text-slate-300" />}
                          </div>
                          <h4 className="font-bold text-slate-800 text-[11px] leading-snug line-clamp-3 mb-2 uppercase italic tracking-tighter">{workout.type || 'Treino'}</h4>
                        </div>
                        
                        <div className="mt-3 flex items-center justify-between border-t pt-3 border-slate-50">
                             {workout.distance && workout.distance > 0 ? (
                                <span className="text-[10px] font-black text-emerald-950 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100 italic">
                                  {workout.distance} KM
                                </span>
                             ) : <span className="text-[10px] font-black text-slate-300 uppercase italic">OFF</span>}
                          
                          {workout.completed && (
                            <div className="flex items-center gap-1">
                               <Zap className={`w-3 h-3 ${getRPEColor(workout.rpe || 0)}`} />
                               <span className="text-[9px] font-black text-slate-700">PSE {workout.rpe || '-'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md no-print" onClick={() => !isSaving && setSelectedWorkout(null)}>
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
            <div className="p-6 md:p-8 border-b bg-slate-50 flex justify-between items-start flex-shrink-0">
               <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">{selectedWorkout.data.day}</span>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{selectedWorkout.data.type || 'Treino'}</h3>
                    {selectedWorkout.data.distance > 0 && (
                      <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-xl text-[11px] font-black italic border border-emerald-200">
                        {selectedWorkout.data.distance} KM
                      </span>
                    )}
                  </div>
               </div>
               <button disabled={isSaving} onClick={() => setSelectedWorkout(null)} className="p-3 bg-slate-200/50 hover:bg-slate-200 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            
            <div className="p-6 md:p-8 space-y-8 overflow-y-auto custom-scrollbar flex-1">
              <div className="bg-emerald-50/30 p-6 rounded-3xl border border-emerald-100 text-center italic font-bold text-emerald-950 shadow-sm leading-relaxed">
                "{selectedWorkout.data.customDescription}"
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
                <div className="flex justify-between px-1">
                   <span className="text-[8px] font-black text-emerald-600 uppercase">Muito Leve</span>
                   <span className="text-[8px] font-black text-red-600 uppercase">Esforço Máximo</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-500" /> Feedback do Treino
                </label>
                <textarea 
                  disabled={isSaving}
                  className="w-full p-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:bg-white focus:border-emerald-500 outline-none transition-all resize-none italic"
                  rows={4}
                  placeholder="Ex: Me senti forte, ritmo controlado..."
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                />
              </div>
            </div>

            <div className="p-6 md:p-8 bg-white border-t flex-shrink-0">
              <button 
                onClick={handleToggleComplete} 
                disabled={isSaving}
                className={`w-full py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 
                  ${saveSuccess ? 'bg-emerald-500 text-white' : 'bg-emerald-950 text-white hover:bg-black active:scale-95'} 
                  disabled:opacity-50`}
              >
                {isSaving ? (
                  <div className="flex items-center gap-3">
                    {saveSuccess ? <Check className="w-6 h-6" /> : <Loader2 className="w-6 h-6 animate-spin" />}
                    <span>{saveSuccess ? 'CONCLUÍDO!' : 'SINCRONIZANDO...'}</span>
                  </div>
                ) : (
                  selectedWorkout.data.completed ? 'Desmarcar Treino' : 'Finalizar e Salvar'
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

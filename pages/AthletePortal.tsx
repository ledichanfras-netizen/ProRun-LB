
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { calculatePaces } from '../utils/calculations';
import { exportToPDF } from '../utils/pdfExporter';
import { 
  AlertCircle, 
  CheckCircle, 
  Circle, 
  MapPin, 
  Trophy, 
  X, 
  Activity,
  Download,
  MessageSquare,
  Loader2,
  Check
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
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  if (!activeAthlete) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500 animate-fade-in">
        <AlertCircle className="w-16 h-16 text-slate-200 mb-4" />
        <h2 className="text-xl font-black text-slate-700 uppercase italic tracking-tighter">Acesso Restrito</h2>
        <p className="max-w-md text-center mt-2 font-medium">Nenhum perfil carregado. Por favor, faça login.</p>
      </div>
    );
  }

  const plan = athletePlans[activeAthlete.id] || [];
  const visiblePlan = plan.filter(w => w.isVisible === true);
  const paces = activeAthlete.customZones || calculatePaces(activeAthlete.metrics.vdot, activeAthlete.metrics.fcThreshold, activeAthlete.metrics.fcMax);

  const handleDownloadPDF = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const fileName = `Planilha_${activeAthlete.name.replace(/\s+/g, '_')}`;
      await exportToPDF('print-layout-root', fileName);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleToggleComplete = async () => {
    if (!selectedWorkout || !activeAthlete || isSaving) return;

    setIsSaving(true);
    setSaveSuccess(false);
    
    try {
      const newStatus = !selectedWorkout.data.completed;
      
      // Chamada assíncrona para o Context -> Firebase com safety timeout já implementado no AppContext
      await updateWorkoutStatus(
        activeAthlete.id, 
        selectedWorkout.weekIndex, 
        selectedWorkout.dayIndex, 
        newStatus, 
        feedbackText
      );
      
      // Feedback visual de sucesso antes de fechar
      setSaveSuccess(true);
      
      // Aguarda um breve momento para o usuário ver o check verde antes de fechar o modal
      setTimeout(() => {
        setSelectedWorkout(null);
        setFeedbackText('');
        setSaveSuccess(false);
        setIsSaving(false);
      }, 800);

    } catch (err) {
      console.error("Erro ao salvar treino:", err);
      setIsSaving(false);
      alert("Erro ao sincronizar. O treino foi salvo localmente e será enviado assim que a conexão estabilizar.");
    }
  };

  const openWorkoutModal = (wIdx: number, dIdx: number, workout: any) => {
    setSelectedWorkout({ weekIndex: wIdx, dayIndex: dIdx, data: workout });
    setFeedbackText(workout.feedback || '');
    setSaveSuccess(false);
    setIsSaving(false);
  };

  return (
    <div className="space-y-8 pb-20 relative animate-fade-in">
      {activeAthlete && portalRoot && createPortal(
        <PrintLayout athlete={activeAthlete} plan={visiblePlan} paces={paces} goal={`VDOT ${activeAthlete.metrics.vdot}`} />,
        portalRoot
      )}

      <header className="bg-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 no-print">
        <div className="flex items-center gap-6 w-full md:w-auto">
          <div className="w-16 h-16 bg-emerald-950 rounded-2xl flex items-center justify-center text-white text-2xl font-black italic shadow-lg transform -rotate-3">
            {activeAthlete.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{activeAthlete.name}</h1>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-widest italic">Performance Integrada</p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          <button 
            onClick={handleDownloadPDF} 
            disabled={pdfLoading || visiblePlan.length === 0}
            className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase italic tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4 text-emerald-200" />} 
            {pdfLoading ? 'GERANDO...' : 'PDF OFICIAL'}
          </button>
        </div>
      </header>

      <div className="no-print">
        {visiblePlan.length === 0 ? (
          <div className="text-center py-32 bg-white rounded-3xl border-2 border-dashed border-slate-200">
             <Trophy className="w-16 h-16 text-slate-200 mx-auto mb-4 opacity-20" />
             <p className="text-slate-400 font-black uppercase tracking-widest italic">Aguardando Liberação do Treino</p>
             <p className="text-slate-300 text-sm italic">Seu treinador está ajustando seu próximo ciclo.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {visiblePlan.map((week, wIdx) => {
              const originalWeekIndex = plan.findIndex(p => p.weekNumber === week.weekNumber);
              return (
                <div key={wIdx} className="space-y-6 animate-fade-in-up" style={{ animationDelay: `${wIdx * 0.1}s` }}>
                  <div className="flex items-center gap-4 border-b pb-4">
                    <span className="px-5 py-1.5 rounded-full text-[10px] font-black uppercase italic bg-emerald-950 text-white shadow-lg">
                      SEMANA {week.weekNumber} - {week.phase.toUpperCase()}
                    </span>
                    <span className="text-xs font-black text-slate-400 uppercase ml-auto flex items-center gap-2">
                      <Activity className="w-4 h-4 text-emerald-500" /> {week.totalVolume || 0} KM
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-4">
                    {(week.workouts || []).map((workout, dIdx) => (
                      <div 
                        key={dIdx} 
                        onClick={() => openWorkoutModal(originalWeekIndex, dIdx, workout)} 
                        className={`p-5 rounded-2xl cursor-pointer hover:shadow-2xl transition-all border-2
                          ${workout.completed ? 'grayscale opacity-60 border-emerald-200 bg-emerald-50 shadow-none' : 'bg-white shadow-md border-slate-100 hover:border-emerald-300'}
                        `}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className="text-[10px] font-black uppercase text-slate-400">{workout.day.substring(0,3)}</span>
                          {workout.completed ? <CheckCircle className="w-5 h-5 text-emerald-600" /> : <Circle className="w-5 h-5 text-slate-300" />}
                        </div>
                        <h4 className="font-bold text-slate-800 text-[11px] leading-snug line-clamp-4 min-h-[3.5rem]">{workout.customDescription}</h4>
                        {workout.distance && workout.distance > 0 && (
                          <div className="mt-3 flex items-center gap-1.5 text-[9px] font-black text-slate-900 bg-slate-50 px-2 py-1 rounded-lg w-fit">
                            <MapPin className="w-3 h-3 text-emerald-500" /> {workout.distance}KM
                          </div>
                        )}
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
          <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="p-8 border-b bg-slate-50 flex justify-between items-start">
               <div>
                  <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">{selectedWorkout.data.day}</span>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{selectedWorkout.data.type || 'Sessão'}</h3>
               </div>
               <button disabled={isSaving} onClick={() => setSelectedWorkout(null)} className="p-2 hover:bg-slate-100 rounded-full transition"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center italic font-bold text-slate-800 shadow-inner">
                "{selectedWorkout.data.customDescription}"
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                  <MessageSquare className="w-3 h-3 text-emerald-500" /> Feedback do Treino
                </label>
                <textarea 
                  disabled={isSaving}
                  className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-emerald-500/10 focus:bg-white focus:border-emerald-500 outline-none transition-all resize-none italic shadow-sm"
                  rows={4}
                  placeholder="Como foi o treino? Alguma dor ou cansaço excessivo?"
                  value={feedbackText}
                  onChange={e => setFeedbackText(e.target.value)}
                />
              </div>

              <button 
                onClick={handleToggleComplete} 
                disabled={isSaving}
                className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 
                  ${saveSuccess ? 'bg-emerald-500 text-white' : 'bg-emerald-950 text-white hover:bg-black hover:scale-[1.02]'} 
                  disabled:opacity-50`}
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    {saveSuccess ? <Check className="w-5 h-5 animate-bounce" /> : <Loader2 className="w-5 h-5 animate-spin" />}
                    <span>{saveSuccess ? 'SINCRONIZADO!' : 'SINCRONIZANDO...'}</span>
                  </div>
                ) : (
                  selectedWorkout.data.completed ? 'Desmarcar Conclusão' : 'Confirmar Treino Feito'
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

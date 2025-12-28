
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { calculatePaces } from '../utils/calculations';
import { 
  AlertCircle, 
  CheckCircle, 
  Circle, 
  MapPin, 
  Trophy, 
  X, 
  Printer, 
  Activity,
  Download
} from 'lucide-react';
import { WorkoutType } from '../types';
import { PrintLayout } from '../components/PrintLayout';

const AthletePortal: React.FC = () => {
  const { athletes, selectedAthleteId, athletePlans, toggleWorkoutCompletion } = useApp();
  const activeAthlete = athletes.find(a => a.id === selectedAthleteId);
  
  const [selectedWorkout, setSelectedWorkout] = useState<{
    weekIndex: number;
    dayIndex: number;
    data: any;
  } | null>(null);

  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);

  // Lógica de escala dinâmica para o Preview de Impressão
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 1200) {
        const padding = 32;
        const scale = (width - padding) / 1122;
        setPreviewScale(scale);
      } else {
        setPreviewScale(0.85);
      }
    };

    if (showPrintPreview) {
      handleResize();
      window.addEventListener('resize', handleResize);
    }
    return () => window.removeEventListener('resize', handleResize);
  }, [showPrintPreview]);

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
  const visiblePlan = plan.filter(w => w.isVisible !== false);
  const paces = activeAthlete.customZones || calculatePaces(activeAthlete.metrics.vdot, activeAthlete.metrics.fcThreshold, activeAthlete.metrics.fcMax);

  const goalSummary = `Ciclo de Alta Performance - VDOT ${activeAthlete.metrics.vdot}`;

  const getWorkoutColors = (type?: WorkoutType) => {
    switch(type) {
      case 'Longão': return 'border-l-8 border-emerald-500 bg-emerald-50/50 text-emerald-900';
      case 'Intervalado': return 'border-l-8 border-red-500 bg-red-50/50 text-red-900';
      case 'Limiar': return 'border-l-8 border-amber-500 bg-amber-50/50 text-amber-900';
      case 'Regenerativo': return 'border-l-8 border-emerald-400 bg-emerald-50/50 text-emerald-900';
      case 'Fortalecimento': return 'border-l-8 border-purple-500 bg-purple-50/50 text-purple-900';
      case 'Descanso': return 'bg-slate-50 opacity-60 border-slate-200';
      default: return 'border-l-8 border-slate-300 bg-white';
    }
  };

  const translatePhase = (phase: string) => {
    switch (phase) {
      case 'Base': return 'BASE';
      case 'Construção': return 'CONSTRUÇÃO';
      case 'Pico': return 'PICO';
      case 'Polimento': return 'POLIMENTO';
      default: return phase;
    }
  };

  const handleToggleComplete = () => {
    if (selectedWorkout && activeAthlete) {
      toggleWorkoutCompletion(activeAthlete.id, selectedWorkout.weekIndex, selectedWorkout.dayIndex);
      setSelectedWorkout({ ...selectedWorkout, data: { ...selectedWorkout.data, completed: !selectedWorkout.data.completed } });
    }
  };

  return (
    <div className="space-y-8 pb-20 relative animate-fade-in">
      {createPortal(
        <div id="printable-portal">
          <PrintLayout athlete={activeAthlete} plan={visiblePlan} paces={paces} goal={goalSummary} />
        </div>, 
        document.body
      )}

      <header className="bg-white rounded-3xl p-6 md:p-8 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 no-print">
        <div className="flex items-center gap-6 w-full md:w-auto">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-emerald-950 rounded-2xl flex items-center justify-center text-white text-2xl md:text-3xl font-black italic shadow-lg shadow-emerald-950/20 transform -rotate-3 flex-shrink-0">
            {activeAthlete.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 uppercase italic tracking-tighter">{activeAthlete.name}</h1>
            <div className="flex gap-2 mt-2">
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase rounded-lg border border-emerald-100">VDOT: {activeAthlete.metrics.vdot}</span>
              <span className="px-3 py-1 bg-slate-50 text-slate-600 text-[10px] font-black uppercase rounded-lg border border-slate-100 italic">{activeAthlete.experience}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
          {visiblePlan.length > 0 && (
            <button 
              onClick={() => setShowPrintPreview(true)} 
              className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase italic tracking-widest shadow-xl transition-all transform hover:scale-105 flex items-center justify-center gap-3"
            >
              <Download className="w-4 h-4 text-emerald-200" /> Baixar Planilha PDF
            </button>
          )}
          <div className="grid grid-cols-5 gap-1 w-full md:w-auto">
            {paces.map(p => (
              <div key={p.zone} className={`flex flex-col items-center px-2 py-1.5 rounded-lg border shadow-sm ${p.zone === 'Z1' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : p.zone === 'Z2' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : p.zone === 'Z3' ? 'bg-amber-50 border-amber-200 text-amber-700' : p.zone === 'Z4' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-purple-50 border-purple-200 text-purple-700'}`}>
                <span className="text-[8px] font-black uppercase">{p.zone}</span>
                <span className="text-[10px] font-black font-mono">{p.minPace}</span>
              </div>
            ))}
          </div>
        </div>
      </header>

      {visiblePlan.length === 0 ? (
        <div className="text-center py-32 bg-white rounded-3xl border-2 border-dashed border-slate-200 no-print">
           <Trophy className="w-16 h-16 text-slate-200 mx-auto mb-4 opacity-20" />
           <p className="text-slate-400 font-black uppercase tracking-widest italic">Planilha em Preparação...</p>
           <p className="text-slate-300 text-sm">Seu treinador está ajustando sua próxima fase de treinos.</p>
        </div>
      ) : (
        <div className="space-y-12 md:space-y-16 no-print">
          {visiblePlan.map((week, wIdx) => (
            <div key={wIdx} className="space-y-6 animate-fade-in-up" style={{ animationDelay: `${wIdx * 0.1}s` }}>
              <div className="flex items-center gap-4 border-b-2 border-slate-100 pb-4">
                <span className="px-4 py-1 rounded-full text-[10px] font-black uppercase italic tracking-widest bg-emerald-950 text-white">
                  SEMANA {week.weekNumber} - {translatePhase(week.phase)}
                </span>
                <span className="text-xs font-black text-slate-400 uppercase ml-auto flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" /> {week.totalVolume || 0} KM
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
                {(week.workouts || []).map((workout, dIdx) => (
                  <div 
                    key={dIdx} 
                    onClick={() => setSelectedWorkout({ weekIndex: wIdx, dayIndex: dIdx, data: workout })} 
                    className={`
                      p-4 rounded-2xl cursor-pointer hover:shadow-xl transition-all group relative border-2
                      ${getWorkoutColors(workout.type)} 
                      ${workout.completed ? 'grayscale opacity-60' : 'shadow-sm'}
                    `}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">{workout.day.split('-')[0]}</span>
                      {workout.completed ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition" />}
                    </div>
                    <h4 className="font-bold text-slate-800 text-xs leading-tight mb-2 line-clamp-3 min-h-[3rem]">{workout.customDescription}</h4>
                    {workout.distance ? (
                      <div className="flex items-center gap-1 text-[10px] font-black text-slate-900 mt-2 bg-white/50 w-fit px-2 py-0.5 rounded shadow-sm">
                        <MapPin className="w-3 h-3 text-emerald-500" /> {workout.distance} KM
                      </div>
                    ) : (
                      <div className="h-5"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md no-print" onClick={() => setSelectedWorkout(null)}>
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className={`p-8 flex justify-between items-start border-b ${getWorkoutColors(selectedWorkout.data.type).split(' ')[0]}`}>
               <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">{selectedWorkout.data.day}</span>
                  <h3 className="text-xl md:text-2xl font-black text-slate-900 uppercase italic tracking-tighter">{selectedWorkout.data.type || 'Sessão de Treino'}</h3>
               </div>
               <button onClick={() => setSelectedWorkout(null)} className="p-2 hover:bg-slate-100 rounded-full transition"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="p-8 space-y-8">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                <p className="text-lg font-bold text-slate-800 leading-relaxed italic">"{selectedWorkout.data.customDescription}"</p>
                {selectedWorkout.data.distance && (
                  <p className="mt-4 flex items-center gap-2 text-emerald-600 font-black uppercase text-sm">
                    <MapPin className="w-4 h-4" /> Meta: {selectedWorkout.data.distance} KM
                  </p>
                )}
              </div>
              <button 
                onClick={handleToggleComplete} 
                className={`w-full py-5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl
                  ${selectedWorkout.data.completed 
                    ? 'bg-emerald-100 text-emerald-700 shadow-emerald-200/50' 
                    : 'bg-emerald-950 text-white shadow-emerald-950/20'}`}
              >
                {selectedWorkout.data.completed ? '✓ CONCLUÍDO' : 'CONFIRMAR CONCLUSÃO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PREVIEW DE IMPRESSÃO RESPONSIVO */}
      {showPrintPreview && activeAthlete && (
        <div className="fixed inset-0 z-[60] bg-emerald-950/98 backdrop-blur-md flex flex-col no-print animate-fade-in">
           <div className="bg-emerald-950 border-b border-emerald-900 p-4 md:p-6 flex flex-col md:flex-row justify-between items-center gap-4 text-white">
              <div className="text-center md:text-left">
                <h2 className="font-black italic uppercase tracking-tighter flex items-center justify-center md:justify-start gap-3 text-emerald-400">
                  <Printer className="w-5 h-5 text-emerald-500" /> Exportação de Alta Performance
                </h2>
                <p className="text-[10px] text-emerald-200/50 uppercase tracking-widest mt-1 hidden sm:block">Planilha formatada em escala real A4 Paisagem</p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button onClick={() => setShowPrintPreview(false)} className="flex-1 md:flex-none border border-emerald-800 px-6 py-3 rounded-2xl font-black text-xs uppercase hover:bg-emerald-900 transition tracking-widest italic">VOLTAR</button>
                <button onClick={() => window.print()} className="flex-1 md:flex-none bg-emerald-600 px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-xl shadow-emerald-600/30 hover:bg-emerald-700 transition flex items-center justify-center gap-2 tracking-widest italic">
                  <Printer className="w-4 h-4" /> IMPRIMIR PDF
                </button>
              </div>
           </div>
           <div className="flex-1 overflow-auto bg-slate-950/50 flex flex-col items-center p-4 md:p-12 relative">
              <div 
                className="bg-white shadow-2xl origin-top transition-transform duration-300" 
                style={{ 
                  width: '297mm', 
                  minHeight: '210mm',
                  transform: `scale(${previewScale})`,
                  marginBottom: `calc(210mm * ${previewScale} - 210mm)` 
                }}
              >
                 <PrintLayout athlete={activeAthlete} plan={visiblePlan} paces={paces} goal={goalSummary} />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AthletePortal;

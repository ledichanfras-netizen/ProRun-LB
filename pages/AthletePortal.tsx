
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { calculatePaces } from '../utils/calculations';
import { Calendar, AlertCircle, CheckCircle, Circle, MapPin, Clock, Trophy, X, MessageSquare, ChevronRight, FileDown, Printer, Info } from 'lucide-react';
import { WorkoutType } from '../types';
import { PrintLayout } from '../components/PrintLayout';

const AthletePortal: React.FC = () => {
  const { athletes, selectedAthleteId, athletePlans, toggleWorkoutCompletion, updateWorkoutFeedback } = useApp();
  const activeAthlete = athletes.find(a => a.id === selectedAthleteId);
  
  // Modal State for Details
  const [selectedWorkout, setSelectedWorkout] = useState<{
    weekIndex: number;
    dayIndex: number;
    data: any;
  } | null>(null);

  // Modal State for Print Preview
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // If no athlete is selected
  if (!activeAthlete) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-500">
        <AlertCircle className="w-16 h-16 text-slate-300 mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Bem-vindo ao Portal do Atleta</h2>
        <p className="max-w-md text-center mt-2">Nenhum perfil carregado. Por favor, peça ao seu treinador para selecionar o seu perfil no painel principal.</p>
      </div>
    );
  }

  const plan = athletePlans[activeAthlete.id] || [];
  // Filter visible weeks for the athlete view AND for the PDF
  const visiblePlan = plan.filter(w => w.isVisible !== false);
  const paces = calculatePaces(activeAthlete.metrics.vdot);

  const getPhaseColor = (phase: string) => {
    switch(phase) {
      case 'Base': return 'bg-blue-100 text-blue-800';
      case 'Build': return 'bg-green-100 text-green-800';
      case 'Peak': return 'bg-purple-100 text-purple-800';
      case 'Taper': return 'bg-orange-100 text-orange-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getWorkoutColor = (type?: WorkoutType) => {
    switch(type) {
      case 'Long': return 'border-l-4 border-green-500 bg-green-50';
      case 'Interval': return 'border-l-4 border-red-500 bg-red-50';
      case 'Tempo': return 'border-l-4 border-yellow-500 bg-yellow-50';
      case 'Recovery': return 'border-l-4 border-blue-400 bg-blue-50';
      case 'Strength': return 'border-l-4 border-purple-500 bg-purple-50';
      case 'Rest': return 'bg-slate-50 opacity-60';
      default: return 'border-l-4 border-slate-300 bg-white';
    }
  };

  const handleFeedbackChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (selectedWorkout && activeAthlete) {
      updateWorkoutFeedback(
        activeAthlete.id,
        selectedWorkout.weekIndex,
        selectedWorkout.dayIndex,
        e.target.value
      );
      // Update local state to show typing immediately
      setSelectedWorkout({
        ...selectedWorkout,
        data: { ...selectedWorkout.data, feedback: e.target.value }
      });
    }
  };

  const handleToggleComplete = () => {
    if (selectedWorkout && activeAthlete) {
      toggleWorkoutCompletion(activeAthlete.id, selectedWorkout.weekIndex, selectedWorkout.dayIndex);
      setSelectedWorkout({
        ...selectedWorkout,
        data: { ...selectedWorkout.data, completed: !selectedWorkout.data.completed }
      });
    }
  };

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    if (activeAthlete) {
      const originalTitle = document.title;
      const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      document.title = `Treino_${activeAthlete.name.replace(/\s+/g, '_')}_${dateStr}`;
      
      // Chamada síncrona
      window.print();

      // Restaurar título depois
      setTimeout(() => {
        document.title = originalTitle;
      }, 500);
    }
  };

  return (
    <div className="space-y-8 pb-10 relative">

      {/* REACT PORTAL FOR PRINTING */}
      {createPortal(
        <div id="printable-portal">
          <PrintLayout 
              athlete={activeAthlete}
              plan={visiblePlan}
              paces={paces}
              goal="Treino Personalizado" 
            />
        </div>,
        document.body
      )}

      {/* Header Profile Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-6 no-print">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg">
            {activeAthlete.name.charAt(0)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{activeAthlete.name}</h1>
            <div className="flex gap-2 text-sm mt-1">
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded">VO2: <b>{activeAthlete.metrics.vdot}</b></span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded">{activeAthlete.experience}</span>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-3 w-full md:w-auto">
          {/* Export PDF Button */}
          {visiblePlan.length > 0 && (
             <button 
                onClick={() => setShowPrintPreview(true)}
                className="w-full md:w-auto bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 shadow-sm transition"
              >
                <FileDown className="w-4 h-4" /> Baixar Treino PDF
              </button>
          )}

          {/* Quick Pace Reference */}
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto justify-end">
            {paces.map(p => (
              <div key={p.zone} className="flex flex-col items-center bg-slate-50 p-2 rounded-lg min-w-[70px] border border-slate-100">
                <span className={`text-xs font-bold ${
                  p.zone === 'F' ? 'text-blue-600' : p.zone === 'I' ? 'text-red-600' : 'text-slate-600'
                }`}>{p.zone}</span>
                <span className="text-xs font-mono font-medium">{p.minPace}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Calendar View */}
      {visiblePlan.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-300 no-print">
           <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
           <p className="text-slate-500">Seu treinador ainda não publicou nenhum treino visível.</p>
        </div>
      ) : (
        <div className="space-y-12 no-print">
          {visiblePlan.map((week, wIdx) => (
            <div key={week.weekNumber} className="space-y-4">
              {/* Week Header */}
              <div className="flex items-center gap-4 border-b border-slate-200 pb-2">
                <h2 className="text-xl font-bold text-slate-800">Semana {week.weekNumber}</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${getPhaseColor(week.phase)}`}>
                  {week.phase === 'Build' ? 'Construção' : week.phase === 'Peak' ? 'Pico' : week.phase === 'Taper' ? 'Polimento' : week.phase}
                </span>
                <span className="text-sm text-slate-500 ml-auto flex items-center gap-1">
                  <MapPin className="w-4 h-4" /> Total: {week.totalVolume} km
                </span>
              </div>

              {/* Weekly Grid */}
              <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {week.workouts.map((workout, dIdx) => (
                  <div 
                    key={dIdx} 
                    onClick={() => setSelectedWorkout({ weekIndex: wIdx, dayIndex: dIdx, data: workout })}
                    className={`
                      relative flex flex-col justify-between p-4 rounded-xl transition-all duration-200 hover:shadow-lg cursor-pointer transform hover:-translate-y-1
                      ${getWorkoutColor(workout.type)}
                      ${workout.completed ? 'opacity-60 grayscale-[0.5]' : 'shadow-sm'}
                    `}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{workout.day}</span>
                        <div className="text-slate-400">
                          {workout.completed ? <CheckCircle className="w-5 h-5 text-green-600" /> : <Circle className="w-5 h-5" />}
                        </div>
                      </div>
                      
                      <h4 className="font-bold text-slate-800 text-sm mb-1 line-clamp-2 min-h-[2.5rem]">
                        {workout.type === 'Rest' ? 'Descanso' : workout.customDescription}
                      </h4>
                      
                       {workout.feedback && (
                         <div className="mt-2 flex items-center gap-1 text-[10px] text-blue-600 font-medium">
                           <MessageSquare className="w-3 h-3" /> Comentado
                         </div>
                       )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-200/50 flex items-center justify-between text-xs font-medium text-slate-500">
                      {workout.distance ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {workout.distance} km
                        </span>
                      ) : <span>-</span>}
                       {workout.type && workout.type !== 'Rest' && (
                        <span className={`
                          px-1.5 py-0.5 rounded text-[10px] uppercase
                          ${workout.type === 'Long' ? 'bg-green-200 text-green-800' : 'bg-slate-200 text-slate-700'}
                        `}>
                          {workout.type}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedWorkout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm no-print" onClick={() => setSelectedWorkout(null)}>
          <div 
            className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up" 
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className={`p-6 border-b flex justify-between items-center ${getWorkoutColor(selectedWorkout.data.type).replace('border-l-4', 'border-l-0')}`}>
               <div>
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    {selectedWorkout.data.day} 
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                    {selectedWorkout.data.type || 'Treino'}
                  </h3>
                  <p className="text-slate-500 text-sm">{selectedWorkout.data.distance ? `${selectedWorkout.data.distance} km planejados` : 'Sem distância definida'}</p>
               </div>
               <button onClick={() => setSelectedWorkout(null)} className="p-2 hover:bg-black/10 rounded-full transition">
                 <X className="w-6 h-6 text-slate-600" />
               </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              
              {/* Main Description (Large Text) */}
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Detalhes do Treino</h4>
                <p className="text-xl md:text-2xl font-medium text-slate-800 leading-relaxed">
                  {selectedWorkout.data.customDescription || "Sem descrição."}
                </p>
              </div>

              {/* Feedback Section */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-500" />
                  Observações do Atleta
                </label>
                <textarea
                  className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition text-slate-700"
                  rows={4}
                  placeholder="Como foi o treino? Dor, cansaço ou boas sensações? Escreva aqui para seu treinador..."
                  value={selectedWorkout.data.feedback || ''}
                  onChange={handleFeedbackChange}
                />
                <p className="text-xs text-slate-400 mt-1 text-right">Seu treinador verá essa mensagem.</p>
              </div>

              {/* Action Button */}
              <button 
                onClick={handleToggleComplete}
                className={`
                  w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all
                  ${selectedWorkout.data.completed 
                    ? 'bg-green-100 text-green-700 border border-green-200' 
                    : 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg hover:shadow-xl'}
                `}
              >
                {selectedWorkout.data.completed ? (
                  <>
                    <CheckCircle className="w-6 h-6" /> Treino Concluído
                  </>
                ) : (
                  <>
                    <Circle className="w-6 h-6" /> Marcar como Realizado
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print Preview Modal - Same as Coach but for Athletes */}
      {showPrintPreview && activeAthlete && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 overflow-hidden no-print">
           <div className="bg-slate-200 w-full md:max-w-6xl h-full md:h-[90vh] md:rounded-xl shadow-2xl flex flex-col">
              {/* Modal Toolbar */}
              <div className="bg-slate-800 text-white p-4 md:rounded-t-xl flex flex-col md:flex-row justify-between items-center sticky top-0 z-10 gap-4 md:gap-0 shadow-lg">
                 <div className="flex-1">
                   <h3 className="font-bold flex items-center gap-2 text-lg">
                     <Printer className="w-5 h-5" /> Salvar Treino em PDF
                   </h3>
                   <div className="flex items-start gap-2 text-xs text-slate-300 mt-1 max-w-lg">
                      <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-400" />
                      <span>
                        Layout configurado para <b>Paisagem</b>. Ao clicar em Imprimir, escolha "Salvar como PDF".
                      </span>
                   </div>
                 </div>
                 <div className="flex gap-3 w-full md:w-auto mt-2 md:mt-0">
                   <button 
                     onClick={() => setShowPrintPreview(false)}
                     className="px-4 py-2 text-slate-300 hover:text-white transition w-full md:w-auto border border-slate-600 rounded"
                   >
                     Cancelar
                   </button>
                   <button 
                     onClick={handlePrint}
                     className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded font-bold shadow flex items-center justify-center gap-2 w-full md:w-auto"
                   >
                     <Printer className="w-4 h-4" /> Salvar PDF
                   </button>
                 </div>
              </div>
              
              <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-start md:justify-center bg-slate-500/50">
                  <div className="shadow-2xl bg-white origin-top shrink-0" style={{ width: '297mm', minHeight: '210mm' }}>
                    <PrintLayout 
                      athlete={activeAthlete}
                      plan={visiblePlan}
                      paces={paces}
                      goal="Treino Personalizado"
                    />
                  </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AthletePortal;

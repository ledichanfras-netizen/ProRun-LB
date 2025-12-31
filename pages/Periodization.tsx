
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { generateTrainingPlan } from '../services/geminiService';
import { TrainingWeek, Athlete, WorkoutType } from '../types';
import { PrintLayout } from '../components/PrintLayout';
import { 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  Save, 
  Printer, 
  Eye, 
  EyeOff, 
  Plus, 
  Trash2, 
  Lock,
  Unlock,
  Calendar,
  Target,
  FileText
} from 'lucide-react';
import { calculatePaces } from '../utils/calculations';

const getZoneColorClasses = (type: WorkoutType) => {
  switch (type) {
    case 'Regenerativo': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Longão': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'Limiar': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Intervalado': return 'bg-red-50 text-red-700 border-red-200';
    case 'Fortalecimento': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Descanso': return 'bg-slate-50 text-slate-400 border-slate-100';
    default: return 'bg-white text-slate-600 border-slate-100';
  }
};

const Periodization: React.FC = () => {
  const { athletes, selectedAthleteId, athletePlans, saveAthletePlan } = useApp();
  
  const [raceDate, setRaceDate] = useState('');
  const [raceDistance, setRaceDistance] = useState('10km');
  const [goalDescription, setGoalDescription] = useState(''); 
  const [weeks, setWeeks] = useState(8);
  const [runningDays, setRunningDays] = useState(4);
  const [gymDays, setGymDays] = useState(2);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<TrainingWeek[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);

  const activeAthlete = athletes.find(a => a.id === selectedAthleteId);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 1200) {
        const padding = 40;
        const scale = (width - padding) / 1122;
        setPreviewScale(scale);
      } else {
        setPreviewScale(0.8);
      }
    };
    if (showPrintPreview) {
      handleResize();
      window.addEventListener('resize', handleResize);
    }
    return () => window.removeEventListener('resize', handleResize);
  }, [showPrintPreview]);

  useEffect(() => {
    if (activeAthlete && athletePlans[activeAthlete.id]) {
      setPlan(athletePlans[activeAthlete.id] || []);
    } else {
      setPlan([]);
    }
  }, [activeAthlete, athletePlans]);

  useEffect(() => {
    if (raceDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const race = new Date(raceDate);
      race.setHours(0, 0, 0, 0);
      const diffTime = race.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        let calculatedWeeks = Math.ceil(diffDays / 7);
        if (calculatedWeeks < 1) calculatedWeeks = 1;
        if (calculatedWeeks > 32) calculatedWeeks = 32;
        setWeeks(calculatedWeeks);
      }
    }
  }, [raceDate]);

  const handleGenerate = async () => {
    if (!activeAthlete || !raceDate) {
      alert("Defina a data da prova para calcular o ciclo de treinamento.");
      return;
    }
    setLoading(true);
    try {
      const generatedPlan = await generateTrainingPlan(
        activeAthlete, 
        goalDescription || "Melhora de performance geral.", 
        weeks, 
        runningDays,
        gymDays,
        raceDistance,
        raceDate
      );
      const formatted = (generatedPlan || []).map(w => ({ 
        ...w, 
        isVisible: true, 
        workouts: w.workouts || [] 
      }));
      setPlan(formatted);
      saveAthletePlan(activeAthlete.id, formatted);
      setIsEditing(true);
    } catch (e: any) {
      alert("Erro ao gerar prescrição: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (activeAthlete) {
      saveAthletePlan(activeAthlete.id, plan);
      setIsEditing(false);
      alert('Planilha publicada para o portal do atleta!');
    }
  };

  const updateWorkout = (wIdx: number, dIdx: number, field: string, value: any) => {
    const newPlan = JSON.parse(JSON.stringify(plan));
    newPlan[wIdx].workouts[dIdx][field] = value;
    setPlan(newPlan);
  };

  const athletePaces = activeAthlete ? (activeAthlete.customZones || calculatePaces(activeAthlete.metrics.vdot, activeAthlete.metrics.fcThreshold, activeAthlete.metrics.fcMax)) : [];
  const printablePlan = plan.filter(w => w.isVisible !== false);
  const goalText = raceDate ? `${raceDistance} | ${goalDescription || 'Estratégia de Performance'}` : (goalDescription || 'Estratégia de Performance');

  const diasSemana = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
  const tiposTreino: WorkoutType[] = ['Regenerativo', 'Longão', 'Limiar', 'Intervalado', 'Fortalecimento', 'Descanso'];

  return (
    <div className="space-y-6 pb-20 no-print animate-fade-in">
      {activeAthlete && createPortal(
        <div id="printable-portal">
          <PrintLayout athlete={activeAthlete} plan={printablePlan} paces={athletePaces} goal={goalText} />
        </div>,
        document.body
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase italic flex items-center gap-2 tracking-tighter">
            <Sparkles className="text-emerald-600" /> Prescrição de Performance
          </h1>
          <p className="text-slate-500 font-medium italic text-sm">IA treinadora calibrada pela distância e seu objetivo livre.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
           {plan.length > 0 && (
             <>
               <button 
                onClick={() => setIsEditing(!isEditing)} 
                className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition border-2 ${isEditing ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'}`}
               >
                 {isEditing ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                 <span className="hidden sm:inline">{isEditing ? 'Travar Plano' : 'Edição Manual'}</span>
               </button>
               <button onClick={() => setShowPrintPreview(true)} className="flex-1 md:flex-none bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-900 transition shadow-lg"><Printer className="w-4 h-4" /> PDF</button>
               <button onClick={handleSave} className="flex-1 md:flex-none bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg"><Save className="w-4 h-4" /> Publicar</button>
             </>
           )}
        </div>
      </header>

      {!activeAthlete ? (
         <div className="bg-white p-16 rounded-3xl text-center border-2 border-dashed border-slate-200">
            <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-black uppercase text-xs tracking-widest">Escolha um atleta para começar a prescrição</p>
          </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 space-y-5">
              <div className="flex items-center gap-2 border-b pb-2">
                <Target className="w-4 h-4 text-emerald-600" />
                <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400">Configuração de Prova</h3>
              </div>
              
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Distância da Prova</label>
                <select 
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                  value={raceDistance}
                  onChange={e => setRaceDistance(e.target.value)}
                >
                  <option value="5km">5km - Velocidade</option>
                  <option value="10km">10km - Limiar</option>
                  <option value="21km">21km (Meia Maratona)</option>
                  <option value="42km">42km (Maratona)</option>
                  <option value="Ultra">Ultramaratona</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data do Evento</label>
                <input 
                  type="date" 
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" 
                  value={raceDate} 
                  onChange={e => setRaceDate(e.target.value)} 
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Objetivo (Descrição Livre)
                </label>
                <textarea 
                  className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-medium h-32 focus:ring-2 focus:ring-emerald-500 outline-none resize-none shadow-inner" 
                  placeholder="Instrua a IA sobre metas específicas, lesões ou terrenos (ex: 'Focar em subidas para prova trail', 'Atleta voltando de lesão no joelho')."
                  value={goalDescription}
                  onChange={e => setGoalDescription(e.target.value)}
                />
              </div>

              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                <label className="block text-[9px] font-black text-emerald-600 uppercase mb-1 tracking-widest">Ciclo Calculado</label>
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-black text-emerald-950 leading-none">{weeks}</span>
                  <span className="text-xs font-bold text-emerald-600 uppercase italic">Semanas</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Corridas/Sem</label>
                  <input type="number" className="w-full bg-slate-50 rounded-xl p-2 text-center font-bold" value={runningDays} onChange={e => setRunningDays(Number(e.target.value))} />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Gym/Sem</label>
                  <input type="number" className="w-full bg-slate-50 rounded-xl p-2 text-center font-bold" value={gymDays} onChange={e => setGymDays(Number(e.target.value))} />
                </div>
              </div>

              <button 
                onClick={handleGenerate} 
                disabled={loading || !raceDate} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black shadow-xl shadow-emerald-600/20 flex justify-center items-center gap-3 disabled:opacity-50 transition-all uppercase text-xs italic tracking-widest"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />} 
                {loading ? 'GERANDO...' : 'REGERAR COM IA'}
              </button>
            </div>
          </div>

          <div className="xl:col-span-3 space-y-8">
            {plan.length > 0 ? plan.map((week, weekIndex) => (
              <div key={weekIndex} className={`bg-white rounded-3xl shadow-sm border-2 ${isEditing ? 'border-emerald-100' : 'border-slate-100'} overflow-hidden transition-all ${week.isVisible === false ? 'opacity-40' : ''}`}>
                <div className="bg-slate-50 px-6 py-4 border-b flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <span className="font-black text-emerald-600 text-[10px] uppercase tracking-widest border border-emerald-200 px-3 py-1 rounded-lg bg-white italic">{week.phase}</span>
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-tighter">Semana {week.weekNumber}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <button onClick={() => {
                        const newPlan = JSON.parse(JSON.stringify(plan));
                        newPlan[weekIndex].isVisible = !newPlan[weekIndex].isVisible;
                        setPlan(newPlan);
                     }} className="text-slate-400 hover:text-emerald-600 transition p-1.5 rounded-lg hover:bg-white">{week.isVisible !== false ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}</button>
                  </div>
                </div>

                <div className="divide-y divide-slate-100">
                  {week.workouts.map((workout, dayIndex) => (
                    <div 
                      key={dayIndex} 
                      className={`p-4 flex flex-col md:flex-row gap-4 items-center group transition-colors border-l-8 ${getZoneColorClasses(workout.type || 'Regenerativo').split(' ')[2]}`}
                    >
                      <div className="w-full md:w-40 flex-shrink-0">
                         {isEditing ? (
                            <select 
                              className="text-[10px] font-black uppercase w-full bg-slate-50 border border-slate-200 rounded p-1 mb-1" 
                              value={workout.day} 
                              onChange={e => updateWorkout(weekIndex, dayIndex, 'day', e.target.value)}
                            >
                              {diasSemana.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                         ) : (
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">{workout.day}</p>
                         )}
                         {isEditing ? (
                            <select 
                              className={`text-[10px] font-black uppercase w-full border rounded p-1 ${getZoneColorClasses(workout.type || 'Regenerativo')}`} 
                              value={workout.type} 
                              onChange={e => updateWorkout(weekIndex, dayIndex, 'type', e.target.value as any)}
                            >
                              {tiposTreino.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                         ) : (
                           <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase italic ${getZoneColorClasses(workout.type || 'Regenerativo')}`}>
                             {workout.type}
                           </span>
                         )}
                      </div>
                      <div className="flex-1 w-full">
                        {isEditing ? (
                          <textarea 
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none" 
                            value={workout.customDescription} 
                            onChange={e => updateWorkout(weekIndex, dayIndex, 'customDescription', e.target.value)} 
                            rows={2} 
                          />
                        ) : (
                          <p className="text-sm font-bold text-slate-700 leading-snug">{workout.customDescription}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                         {isEditing ? (
                           <div className="flex items-center gap-1">
                             <input 
                              type="number" 
                              className="w-16 p-1 bg-white border border-slate-200 rounded text-xs text-center font-black" 
                              value={workout.distance} 
                              onChange={e => updateWorkout(weekIndex, dayIndex, 'distance', Number(e.target.value))} 
                             />
                             <span className="text-[10px] font-black text-slate-400 uppercase italic">KM</span>
                           </div>
                         ) : (
                           workout.distance ? <p className="font-black text-slate-900 text-sm whitespace-nowrap bg-slate-100 px-3 py-1 rounded-full">{workout.distance} KM</p> : null
                         )}
                         {isEditing && (
                           <button 
                             onClick={() => {
                               const newPlan = JSON.parse(JSON.stringify(plan));
                               newPlan[weekIndex].workouts.splice(dayIndex, 1);
                               setPlan(newPlan);
                             }} 
                             className="text-slate-300 hover:text-red-500 transition p-2 hover:bg-red-50 rounded-full"
                           >
                            <Trash2 className="w-4 h-4" />
                           </button>
                         )}
                      </div>
                    </div>
                  ))}
                  {isEditing && (
                    <div className="p-3 bg-emerald-50/20 flex justify-center">
                       <button 
                        onClick={() => {
                          const newPlan = JSON.parse(JSON.stringify(plan));
                          newPlan[weekIndex].workouts.push({ day: 'Segunda-feira', type: 'Regenerativo', customDescription: 'Sessão Adicional' });
                          setPlan(newPlan);
                        }} 
                        className="text-[10px] font-black text-emerald-600 flex items-center gap-1 hover:underline p-2"
                       >
                         <Plus className="w-3 h-3" /> ADICIONAR SESSÃO
                       </button>
                    </div>
                  )}
                </div>
                <div className="px-6 py-4 bg-slate-50/30 border-t">
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1 italic tracking-widest">Estratégia Semanal</p>
                  {isEditing ? (
                    <input 
                      className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold" 
                      value={week.coachNotes} 
                      onChange={e => {
                        const newPlan = JSON.parse(JSON.stringify(plan));
                        newPlan[weekIndex].coachNotes = e.target.value;
                        setPlan(newPlan);
                      }} 
                    />
                  ) : (
                    <p className="text-xs font-bold text-slate-600 italic">"{week.coachNotes || 'Execução perfeita.'}"</p>
                  )}
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                <Target className="w-12 h-12 mb-4 opacity-10" />
                <p className="font-bold text-sm uppercase tracking-widest italic">Nenhuma planilha ativa</p>
                <p className="text-xs">Defina os parâmetros ao lado para gerar o ciclo com IA.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {showPrintPreview && activeAthlete && (
        <div className="fixed inset-0 z-[60] bg-emerald-950/98 backdrop-blur-md flex flex-col no-print animate-fade-in">
           <div className="bg-emerald-950 border-b border-emerald-900 p-4 md:p-6 flex flex-col md:flex-row justify-between items-center gap-4 text-white">
              <div className="text-center md:text-left">
                <h2 className="font-black italic uppercase tracking-tighter flex items-center justify-center md:justify-start gap-3 text-emerald-400">
                  <Printer className="w-5 h-5 text-emerald-500" /> Exportação de Alta Performance
                </h2>
                <p className="text-[10px] text-emerald-200/50 uppercase tracking-widest mt-1 hidden sm:block">Foco: {raceDistance} • Objetivo: {goalDescription || 'Geral'}</p>
              </div>
              <div className="flex gap-3 w-full md:w-auto">
                <button onClick={() => setShowPrintPreview(false)} className="flex-1 md:flex-none border border-emerald-700 px-6 py-3 rounded-2xl font-black text-xs uppercase hover:bg-emerald-900 transition tracking-widest italic tracking-widest">FECHAR</button>
                <button onClick={() => window.print()} className="flex-1 md:flex-none bg-emerald-600 px-8 py-3 rounded-2xl font-black text-xs uppercase shadow-xl shadow-emerald-600/30 hover:bg-emerald-700 transition flex items-center justify-center gap-2 tracking-widest italic">
                  <Printer className="w-4 h-4" /> GERAR PDF
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
                 <PrintLayout athlete={activeAthlete} plan={printablePlan} paces={athletePaces} goal={goalText} />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Periodization;

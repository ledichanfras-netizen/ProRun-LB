
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context/AppContext';
import { generateTrainingPlan } from '../services/geminiService';
import { TrainingWeek, Athlete, WorkoutType, AthletePlan } from '../types';
import { PrintLayout } from '../components/PrintLayout';
import { exportToPDF } from '../utils/pdfExporter';
import { 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  Save, 
  Lock,
  Unlock,
  Target,
  MessageSquare,
  Download,
  ClipboardList,
  Eye,
  EyeOff,
  Calendar,
  TrendingUp
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
  const [raceGoal, setRaceGoal] = useState('');
  const [goalDescription, setGoalDescription] = useState('');
  const [weeks, setWeeks] = useState(8);
  const [runningDays, setRunningDays] = useState(4);
  const [gymDays, setGymDays] = useState(2);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [fullPlan, setFullPlan] = useState<AthletePlan | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const activeAthlete = athletes.find(a => a.id === selectedAthleteId);
  const portalRoot = document.getElementById('printable-portal');

  const diasSemanaFull = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
  const tiposTreino: WorkoutType[] = ['Regenerativo', 'Longão', 'Limiar', 'Intervalado', 'Fortalecimento', 'Descanso'];

  useEffect(() => {
    if (activeAthlete && athletePlans[activeAthlete.id]) {
      setFullPlan(athletePlans[activeAthlete.id]);
    } else {
      setFullPlan(null);
    }
  }, [activeAthlete, athletePlans]);

  useEffect(() => {
    if (raceDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const race = new Date(raceDate);
      race.setHours(0, 0, 0, 0);
      if (race > today) {
        const day = today.getDay();
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const startOfCurrentWeek = new Date(today);
        startOfCurrentWeek.setDate(today.getDate() + diffToMonday);
        const raceDay = race.getDay();
        const diffToRaceMonday = raceDay === 0 ? -6 : 1 - raceDay;
        const startOfRaceWeek = new Date(race);
        startOfRaceWeek.setDate(race.getDate() + diffToRaceMonday);
        const diffTime = startOfRaceWeek.getTime() - startOfCurrentWeek.getTime();
        const diffWeeks = Math.round(diffTime / (1000 * 60 * 60 * 24 * 7)) + 1;
        setWeeks(Math.min(32, Math.max(1, diffWeeks)));
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
      const finalInstructions = `Foco em: ${raceGoal}. Adicional: ${goalDescription}. O atleta é nível ${activeAthlete.experience}.`;
      const generated = await generateTrainingPlan(
        activeAthlete, 
        finalInstructions, 
        weeks, 
        runningDays,
        gymDays,
        raceDistance,
        raceDate
      );
      
      const normalizedWeeks = (generated.weeks || []).map(w => {
        const workoutsWithDescanso = diasSemanaFull.map(dayName => {
           const found = w.workouts.find(work => work.day.toLowerCase().includes(dayName.split('-')[0].toLowerCase()));
           return found || { day: dayName, type: 'Descanso' as WorkoutType, customDescription: 'Descanso total (Day Off).', distance: 0 };
        });
        return { ...w, isVisible: false, workouts: workoutsWithDescanso } as TrainingWeek;
      });

      const newPlan: AthletePlan = {
        ...generated,
        weeks: normalizedWeeks,
        specificGoal: raceGoal || `${raceDistance} | ${activeAthlete.experience}`
      };

      setFullPlan(newPlan);
      saveAthletePlan(activeAthlete.id, newPlan);
      setIsEditing(true);
    } catch (e: any) {
      alert("Erro ao gerar prescrição: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (activeAthlete && fullPlan) {
      saveAthletePlan(activeAthlete.id, fullPlan);
      setIsEditing(false);
      alert('Planilha publicada com sucesso!');
    }
  };

  const handleDownloadPDF = async () => {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const fileName = `Planilha_ProRun_${activeAthlete?.name.replace(/\s+/g, '_')}`;
      await exportToPDF('print-layout-root', fileName);
    } finally {
      setPdfLoading(false);
    }
  };

  const updateWorkout = (wIdx: number, dIdx: number, field: string, value: any) => {
    if (!fullPlan) return;
    const newPlan = JSON.parse(JSON.stringify(fullPlan));
    newPlan.weeks[wIdx].workouts[dIdx][field] = value;
    setFullPlan(newPlan);
  };

  const athletePaces = activeAthlete ? (activeAthlete.customZones || calculatePaces(activeAthlete.metrics.vdot, activeAthlete.metrics.fcThreshold, activeAthlete.metrics.fcMax)) : [];
  const printableWeeks = (fullPlan?.weeks || []).filter(w => w.isVisible === true);
  const printablePlan = fullPlan ? { ...fullPlan, weeks: printableWeeks } : null;

  return (
    <div className="space-y-6 pb-20 no-print animate-fade-in">
      {activeAthlete && printablePlan && portalRoot && createPortal(
        <PrintLayout athlete={activeAthlete} plan={printablePlan.weeks} paces={athletePaces} goal={fullPlan?.specificGoal || ''} />,
        portalRoot
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase italic flex items-center gap-2 tracking-tighter">
            <Sparkles className="text-emerald-600" /> Prescrição Inteligente
          </h1>
          <p className="text-slate-500 font-medium italic text-sm">Metodologia VDOT integrada à IA.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
           {fullPlan && (
             <>
               <button 
                onClick={() => setIsEditing(!isEditing)} 
                className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition border-2 ${isEditing ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300'}`}
               >
                 {isEditing ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                 <span className="hidden sm:inline">{isEditing ? 'Travar' : 'Editar'}</span>
               </button>
               <button 
                onClick={handleDownloadPDF} 
                disabled={pdfLoading || printableWeeks.length === 0}
                className="flex-1 md:flex-none bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-900 transition disabled:opacity-50"
               >
                 {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF
               </button>
               <button onClick={handleSave} className="flex-1 md:flex-none bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-lg"><Save className="w-4 h-4" /> Publicar</button>
             </>
           )}
        </div>
      </header>

      {!activeAthlete ? (
         <div className="bg-white p-16 rounded-3xl text-center border-2 border-dashed border-slate-200">
            <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-black uppercase text-xs tracking-widest">Escolha um atleta para começar</p>
          </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 space-y-5">
              <div className="flex items-center justify-between border-b pb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400">Meta do Ciclo</h3>
                </div>
                <div className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-full text-[8px] font-black text-emerald-700 uppercase italic">
                   <TrendingUp className="w-2.5 h-2.5" /> {activeAthlete.experience}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Distância</label>
                  <select className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold outline-none" value={raceDistance} onChange={e => setRaceDistance(e.target.value)}>
                    <option value="5km">5km</option>
                    <option value="10km">10km</option>
                    <option value="15km">15km</option>
                    <option value="21km">21km</option>
                    <option value="42km">42km</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data Prova</label>
                  <input type="date" className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold outline-none" value={raceDate} onChange={e => setRaceDate(e.target.value)} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <Target className="w-3 h-3 text-emerald-500" /> Meta Específica (Sigla PDF)
                </label>
                <input 
                  type="text"
                  className="w-full bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-xs font-bold text-emerald-900 outline-none" 
                  placeholder="Ex: Sub 45min nos 10km"
                  value={raceGoal}
                  onChange={e => setRaceGoal(e.target.value)}
                />
              </div>

              <div className="pt-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                  <ClipboardList className="w-3 h-3 text-slate-500" /> Notas IA
                </label>
                <textarea className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-medium outline-none resize-none" rows={4} placeholder="Notas extras..." value={goalDescription} onChange={e => setGoalDescription(e.target.value)} />
              </div>

              <button onClick={handleGenerate} disabled={loading || !raceDate} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black shadow-xl flex justify-center items-center gap-3 disabled:opacity-50 transition-all uppercase text-xs italic tracking-widest">
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />} {loading ? 'GERANDO...' : 'Gerar com IA'}
              </button>
            </div>
          </div>

          <div className="xl:col-span-3 space-y-8">
            {fullPlan?.weeks && fullPlan.weeks.length > 0 ? fullPlan.weeks.map((week, weekIndex) => (
              <div key={weekIndex} className={`bg-white rounded-3xl shadow-sm border-2 ${isEditing ? 'border-emerald-100' : 'border-slate-100'} overflow-hidden transition-all ${week.isVisible === false ? 'opacity-40 border-slate-200 bg-slate-50' : ''}`}>
                <div className="bg-white px-6 py-4 border-b flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <span className="font-black text-emerald-600 text-[10px] uppercase tracking-widest border border-emerald-200 px-3 py-1 rounded-lg bg-white italic">{week.phase}</span>
                    <span className="text-slate-400 text-[10px] font-black uppercase tracking-tighter">Semana {week.weekNumber}</span>
                  </div>
                  <button onClick={() => {
                      const newPlan = JSON.parse(JSON.stringify(fullPlan));
                      newPlan.weeks[weekIndex].isVisible = !newPlan.weeks[weekIndex].isVisible;
                      setFullPlan(newPlan);
                  }} className={`transition p-1.5 rounded-lg border ${week.isVisible === true ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-slate-300 bg-white border-slate-200 hover:text-emerald-500'}`}>
                    {week.isVisible === true ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {week.workouts.map((workout, dayIndex) => (
                    <div key={dayIndex} className={`p-4 flex flex-col md:flex-row gap-4 items-center group transition-colors border-l-8 ${getZoneColorClasses(workout.type || 'Descanso').split(' ')[2]}`}>
                      <div className="w-full md:w-40 flex-shrink-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter mb-1">{workout.day}</p>
                        <select className={`text-[10px] font-black uppercase w-full border rounded p-1 ${getZoneColorClasses(workout.type || 'Descanso')}`} value={workout.type} disabled={!isEditing} onChange={e => updateWorkout(weekIndex, dayIndex, 'type', e.target.value as any)}>
                          {tiposTreino.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="flex-1 w-full">
                        {isEditing ? (
                          <textarea className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none" value={workout.customDescription} onChange={e => updateWorkout(weekIndex, dayIndex, 'customDescription', e.target.value)} rows={2} />
                        ) : (
                          <p className={`text-sm font-bold leading-snug ${workout.type === 'Descanso' ? 'text-slate-400 italic' : 'text-slate-700'}`}>{workout.customDescription}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {workout.distance && workout.distance > 0 ? <p className="font-black text-slate-900 text-sm whitespace-nowrap bg-slate-100 px-3 py-1 rounded-full">{workout.distance} KM</p> : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                <Target className="w-12 h-12 mb-4 opacity-10" />
                <p className="font-bold text-sm uppercase tracking-widest italic">Aguardando geração do plano...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Periodization;

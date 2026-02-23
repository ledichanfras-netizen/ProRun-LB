
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../contexts/AppContext';
import { generateTrainingPlan } from '../services/geminiService';
import { TrainingWeek, Athlete, WorkoutType, AthletePlan } from '../types';
import { PrintLayout } from '../components/PrintLayout';
import { 
  Sparkles, 
  Loader2, 
  Save, 
  Lock,
  Unlock,
  Target,
  Eye,
  EyeOff,
  Activity,
  CalendarDays,
  Flag,
  ChevronDown,
  MessageSquare,
  Dumbbell,
  Zap,
  Download,
  TrendingUp
} from 'lucide-react';
import { calculatePaces } from '../utils/calculations';
import { exportToImage } from '../utils/exporter';

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
  const [fullPlan, setFullPlan] = useState<AthletePlan | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const activeAthlete = athletes.find(a => a.id === selectedAthleteId);
  const portalRoot = document.getElementById('printable-portal');

  const diasSemanaFull = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado", "Domingo"];
  
  const distancias = [
    { value: '5km', label: '5 km' },
    { value: '10km', label: '10 km' },
    { value: '15km', label: '15 km' },
    { value: '18km', label: '18 km' },
    { value: '21km', label: 'Meia Maratona (21k)' },
    { value: '30km', label: '30 km' },
    { value: '42km', label: 'Maratona (42k)' },
    { value: '50km', label: 'Ultra 50k' },
    { value: '80km', label: 'Ultra 80k' },
    { value: '100km', label: 'Ultra 100k' },
  ];

  useEffect(() => {
    if (activeAthlete && athletePlans[activeAthlete.id]) {
      const plan = athletePlans[activeAthlete.id];
      setFullPlan(plan);
      setRaceGoal(plan.specificGoal || '');
    } else {
      setFullPlan(null);
      setRaceGoal('');
    }
  }, [activeAthlete, athletePlans]);

  // Cálculo automático de semanas a partir da data da prova
  useEffect(() => {
    if (raceDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const race = new Date(raceDate);
      race.setHours(0, 0, 0, 0);
      
      if (race > today) {
        const diffMs = race.getTime() - today.getTime();
        const diffWeeks = Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 7));
        // Limitamos entre 4 e 24 semanas para manter a qualidade da prescrição
        setWeeks(Math.min(24, Math.max(4, diffWeeks)));
      }
    }
  }, [raceDate]);

  const handleGenerate = async () => {
    if (!activeAthlete || !raceDate) {
      alert("Defina a data da prova para calcular o ciclo.");
      return;
    }
    setLoading(true);
    try {
      const generated = await generateTrainingPlan(
        activeAthlete, 
        goalDescription, 
        weeks, 
        runningDays,
        gymDays,
        raceDistance,
        raceDate,
        raceGoal
      );
      
      const normalizedWeeks = (generated.weeks || []).map(w => {
        const workoutsWithDescanso = diasSemanaFull.map(dayName => {
           const found = w.workouts.find(work => 
             work.day && work.day.toLowerCase().includes(dayName.split('-')[0].toLowerCase())
           );
           return found ? { ...found, day: dayName } : { day: dayName, type: 'Descanso' as WorkoutType, customDescription: 'Descanso total.', distance: 0 };
        });
        return { ...w, isVisible: false, workouts: workoutsWithDescanso } as TrainingWeek;
      });

      const newPlan: AthletePlan = { 
        ...generated, 
        weeks: normalizedWeeks, 
        specificGoal: raceGoal ? `${raceDistance} (${raceGoal})` : raceDistance 
      };
      setFullPlan(newPlan);
      saveAthletePlan(activeAthlete.id, newPlan);
      setIsEditing(true);
    } catch (e: any) {
      alert("Erro na IA: " + e.message);
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

  const updateWorkout = (wIdx: number, dIdx: number, field: string, value: any) => {
    if (!fullPlan) return;
    const newPlan = JSON.parse(JSON.stringify(fullPlan));
    newPlan.weeks[wIdx].workouts[dIdx][field] = value;
    
    // Recalcular volume total da semana se a distância mudou
    if (field === 'distance') {
      const total = newPlan.weeks[wIdx].workouts.reduce((acc: number, curr: any) => acc + (Number(curr.distance) || 0), 0);
      newPlan.weeks[wIdx].totalVolume = total;
    }
    
    setFullPlan(newPlan);
  };

  const athletePaces = activeAthlete ? (activeAthlete.customZones || calculatePaces(activeAthlete.metrics.vdot, activeAthlete.metrics.fcThreshold, activeAthlete.metrics.fcMax)) : [];
  const printableWeeks = (fullPlan?.weeks || []).filter(w => w.isVisible === true);

  return (
    <div className="space-y-6 pb-20 no-print animate-fade-in">
      {activeAthlete && fullPlan && portalRoot && createPortal(
        <PrintLayout 
          athlete={activeAthlete} 
          plan={printableWeeks} 
          paces={athletePaces} 
          goal={raceGoal || fullPlan.specificGoal || ''} 
          totalWeeks={fullPlan.weeks.length}
        />,
        portalRoot
      )}

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-2">
            <Sparkles className="text-emerald-600 w-6 h-6" /> Ciclo de Performance
          </h1>
          <p className="text-slate-500 font-medium italic text-sm">IA Treinador: Prescrição personalizada até o dia da prova.</p>
        </div>
        
        <div className="flex gap-2 w-full md:w-auto">
           {fullPlan && (
             <>
               <button 
                 onClick={() => exportToImage('print-layout-root', `Periodizacao_${activeAthlete?.name || 'Atleta'}`)} 
                 className="bg-slate-800 text-white px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition shadow-lg uppercase text-[10px] italic tracking-widest"
               >
                 <Download className="w-4 h-4" /> Baixar
               </button>
               <button onClick={() => setIsEditing(!isEditing)} className={`px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition border-2 ${isEditing ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200'}`}>
                 {isEditing ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />} {isEditing ? 'Travar' : 'Editar'}
               </button>
               <button onClick={handleSave} className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-lg uppercase text-xs italic tracking-widest"><Save className="w-4 h-4" /> Publicar</button>
             </>
           )}
        </div>
      </header>

      {!activeAthlete ? (
         <div className="bg-white p-16 rounded-3xl text-center border-2 border-dashed border-slate-200">
            <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 font-black uppercase text-xs tracking-widest">Selecione um atleta para periodizar.</p>
          </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 space-y-5">
              <div className="flex items-center justify-between border-b pb-2">
                <Target className="w-4 h-4 text-emerald-600" />
                <h3 className="font-black text-[10px] uppercase tracking-widest text-slate-400">Parâmetros do Ciclo</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Objetivo de Prova (Ex: Sub 4h)</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold outline-none italic" 
                    placeholder="Meta de tempo ou colocação..."
                    value={raceGoal}
                    onChange={e => setRaceGoal(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" /> Descrição do Treinador
                  </label>
                  <textarea 
                    className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-medium outline-none resize-none" 
                    rows={4} 
                    placeholder="Ex: Limitar treinos de semana em 50 min. Focar em volume no domingo..."
                    value={goalDescription}
                    onChange={e => setGoalDescription(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Data da Prova</label>
                    <input type="date" className="w-full bg-emerald-50 border-none rounded-xl p-3 text-[10px] font-bold outline-none" value={raceDate} onChange={e => setRaceDate(e.target.value)} />
                  </div>
                  <div className="relative">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Duração (Semanas)</label>
                    <div className="w-full bg-slate-100 rounded-xl p-3 text-sm font-black text-slate-900 text-center flex items-center justify-center gap-2">
                      <CalendarDays className="w-4 h-4 text-slate-400" /> {weeks}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><Zap className="w-3 h-3 text-emerald-500" /> Corridas/Sem</label>
                    <select className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold outline-none appearance-none" value={runningDays} onChange={e => setRunningDays(Number(e.target.value))}>
                      {[1, 2, 3, 4, 5, 6, 7].map(d => <option key={d} value={d}>{d} dias</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-[34px] w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                  <div className="relative">
                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><Dumbbell className="w-3 h-3 text-purple-500" /> Academia/Sem</label>
                    <select className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold outline-none appearance-none" value={gymDays} onChange={e => setGymDays(Number(e.target.value))}>
                      {[0, 1, 2, 3, 4, 5].map(d => <option key={d} value={d}>{d} dias</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-[34px] w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="relative">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-1">Distância da Prova</label>
                  <select className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold outline-none appearance-none" value={raceDistance} onChange={e => setRaceDistance(e.target.value)}>
                    {distancias.map(dist => (
                      <option key={dist.value} value={dist.value}>{dist.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-[34px] w-4 h-4 text-slate-400 pointer-events-none" />
                </div>

                <button onClick={handleGenerate} disabled={loading || !raceDate} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-black shadow-xl flex justify-center items-center gap-3 disabled:opacity-50 transition-all uppercase text-xs italic tracking-widest mt-4">
                  {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Sparkles className="w-5 h-5" />} {loading ? 'GERANDO...' : 'Gerar Periodização'}
                </button>
              </div>
            </div>
            
            {fullPlan?.raceStrategy && (
              <div className="bg-emerald-950 p-6 rounded-3xl shadow-xl text-white border border-emerald-800 animate-fade-in">
                 <div className="flex items-center gap-2 mb-4 border-b border-emerald-800 pb-2">
                   <Flag className="w-4 h-4 text-emerald-400" />
                   <h3 className="font-black text-[10px] uppercase tracking-widest text-emerald-400">Estratégia de Prova</h3>
                 </div>
                 <p className="text-[11px] leading-relaxed italic opacity-90">{fullPlan.raceStrategy}</p>
              </div>
            )}
          </div>

          <div className="xl:col-span-3 space-y-8">
            {fullPlan?.weeks && fullPlan.weeks.length > 0 ? (
              fullPlan.weeks.map((week, weekIndex) => (
                <div key={weekIndex} className={`bg-white rounded-3xl shadow-sm border-2 ${week.isVisible === false ? 'opacity-40 border-slate-200' : 'border-slate-100'} overflow-hidden transition-all`}>
                  <div className="bg-white px-6 py-4 border-b flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <span className="font-black text-emerald-600 text-[10px] uppercase tracking-widest border border-emerald-200 px-3 py-1 rounded-lg italic">SEMANA {week.weekNumber}</span>
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-tighter italic">{week.phase}</span>
                      <span className="text-slate-400 text-[10px] font-black uppercase tracking-tighter italic flex items-center gap-1 ml-2">
                        <TrendingUp className="w-3 h-3 text-emerald-500" /> {week.totalVolume || 0} KM
                      </span>
                    </div>
                    <button onClick={() => {
                        const newPlan = JSON.parse(JSON.stringify(fullPlan));
                        newPlan.weeks[weekIndex].isVisible = !newPlan.weeks[weekIndex].isVisible;
                        setFullPlan(newPlan);
                    }} className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-emerald-500 transition-colors">
                      {week.isVisible === true ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {week.workouts.map((workout, dayIndex) => (
                      <div key={dayIndex} className="p-4 flex flex-col md:flex-row gap-4 items-center border-l-8 border-slate-100 hover:bg-slate-50/50 transition-colors">
                        <div className="w-full md:w-40 flex flex-col">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{workout.day}</p>
                           {isEditing ? (
                              <div className="relative mt-1">
                                <select 
                                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1 text-[9px] font-black uppercase italic outline-none appearance-none pr-6"
                                  value={workout.type}
                                  onChange={e => updateWorkout(weekIndex, dayIndex, 'type', e.target.value)}
                                >
                                  {["Regenerativo", "Longão", "Limiar", "Intervalado", "Descanso", "Fortalecimento"].map(t => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                                <ChevronDown className="absolute right-1 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                              </div>
                           ) : (
                              <p className={`text-[10px] font-black uppercase italic ${workout.type === 'Descanso' ? 'text-slate-300' : 'text-emerald-700'}`}>{workout.type}</p>
                           )}
                        </div>
                        <div className="flex-1">
                           {isEditing ? (
                              <textarea 
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold italic outline-none focus:ring-2 focus:ring-emerald-500"
                                value={workout.customDescription}
                                rows={2}
                                onChange={e => updateWorkout(weekIndex, dayIndex, 'customDescription', e.target.value)}
                              />
                           ) : (
                              <p className={`text-sm font-bold italic ${workout.type === 'Descanso' ? 'text-slate-300' : 'text-slate-700'}`}>{workout.customDescription}</p>
                           )}
                        </div>
                        <div className="text-right">
                           {isEditing ? (
                              <input 
                                type="number" 
                                className="w-16 bg-slate-100 border-none rounded-lg p-1 text-center font-black text-sm" 
                                value={workout.distance} 
                                onChange={e => updateWorkout(weekIndex, dayIndex, 'distance', Number(e.target.value))}
                              />
                           ) : (
                              workout.distance && workout.distance > 0 ? (
                                <span className="font-black text-slate-900 text-sm whitespace-nowrap bg-slate-100 px-3 py-1 rounded-full">{workout.distance} KM</span>
                              ) : <span className="text-[9px] font-black text-slate-200 uppercase italic">--</span>
                           )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white p-20 rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center text-center">
                <CalendarDays className="w-16 h-16 text-slate-100 mb-4" />
                <p className="text-slate-300 font-black uppercase italic tracking-widest text-sm">Insira os parâmetros e a Data da Prova para gerar o ciclo automático.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Periodization;

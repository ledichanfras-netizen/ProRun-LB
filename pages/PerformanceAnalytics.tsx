
import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { 
  Activity, 
  Zap, 
  AlertTriangle, 
  TrendingUp, 
  ShieldAlert, 
  Brain, 
  ChevronRight,
  Info,
  Loader2,
  Sparkles,
  Target,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  Tooltip as RechartsTooltip
} from 'recharts';
import { generatePerformanceInsights } from '../services/geminiService';
import Markdown from 'react-markdown';

export default function PerformanceAnalytics() {
  const { athletes, selectedAthleteId, athletePlans, userRole } = useApp();
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const currentAthleteId = userRole === 'athlete' ? selectedAthleteId : (selectedAthleteId || athletes[0]?.id);
  const athlete = useMemo(() => athletes.find(a => a.id === currentAthleteId), [athletes, currentAthleteId]);
  const plan = useMemo(() => currentAthleteId ? athletePlans[currentAthleteId] : null, [currentAthleteId, athletePlans]);

  const metrics = useMemo(() => {
    if (!athlete || !plan) return null;

    const allWorkouts = plan.weeks.flatMap(w => (w.workouts || []).filter(work => work.completed));
    const recentWorkouts = allWorkouts.slice(-14); // Last 14 completed workouts
    const last7Days = allWorkouts.slice(-7);

    // 1. Fatigue (Fadiga) - Based on average RPE of last 7 days
    const avgRpe7 = last7Days.length > 0 
      ? last7Days.reduce((acc, curr) => acc + (curr.rpe || 0), 0) / last7Days.length 
      : 0;
    const fatigue = Math.min(100, (avgRpe7 / 10) * 100);

    // 2. Readiness (Prontidão) - Inverse of fatigue + consistency
    const completionRate = allWorkouts.length / (plan.weeks.flatMap(w => w.workouts || []).length || 1);
    const readiness = Math.max(0, 100 - fatigue + (completionRate * 20) - 10);

    // 3. Injury Risk (ACWR) - Acute:Chronic Workload Ratio
    // Acute = Volume last 7 days
    // Chronic = Avg weekly volume last 28 days
    const acuteLoad = last7Days.reduce((acc, curr) => acc + (curr.distance || 0), 0);
    const chronicLoad = allWorkouts.length > 0 
      ? (allWorkouts.reduce((acc, curr) => acc + (curr.distance || 0), 0) / allWorkouts.length) * 7
      : 1;
    const acwr = acuteLoad / (chronicLoad || 1);

    // 4. Radar Data
    // Speed: Based on VDOT or interval sessions
    const speedScore = Math.min(100, (athlete.metrics.vdot / 70) * 100);
    // Endurance: Based on total volume
    const enduranceScore = Math.min(100, (allWorkouts.reduce((acc, curr) => acc + (curr.distance || 0), 0) / 500) * 100);
    // Consistency: % of completed workouts
    const consistencyScore = completionRate * 100;
    // Recovery: Inverse of average RPE
    const recoveryScore = Math.max(0, 100 - (avgRpe7 * 10));
    // Strength: Inferred (placeholder logic based on workout types)
    const strengthCount = allWorkouts.filter(w => w.type === 'Fortalecimento').length;
    const strengthScore = Math.min(100, (strengthCount / 10) * 100);

    const radarData = [
      { subject: 'Velocidade', A: speedScore, fullMark: 100 },
      { subject: 'Resistência', A: enduranceScore, fullMark: 100 },
      { subject: 'Consistência', A: consistencyScore, fullMark: 100 },
      { subject: 'Recuperação', A: recoveryScore, fullMark: 100 },
      { subject: 'Força', A: strengthScore, fullMark: 100 },
    ];

    return {
      fatigue,
      readiness,
      injuryRisk: acwr,
      radarData,
      recentWorkouts: recentWorkouts.map(w => ({ type: w.type, rpe: w.rpe, feedback: w.feedback })),
      acuteLoad,
      chronicLoad
    };
  }, [athlete, plan]);

  const handleGetInsights = async () => {
    if (!athlete || !metrics) return;
    setLoadingInsights(true);
    try {
      const insights = await generatePerformanceInsights(athlete, metrics);
      setAiInsights(insights);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingInsights(false);
    }
  };

  if (!athlete || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400">
        <Activity className="w-16 h-16 mb-4 opacity-20" />
        <p className="font-black uppercase italic tracking-widest">Aguardando dados de performance...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-3">
            <Activity className="text-emerald-600 w-8 h-8" /> Análise de Performance
          </h1>
          <p className="text-slate-500 mt-1 font-medium italic">
            Monitoramento fisiológico e prontidão competitiva.
          </p>
        </div>
        <button 
          onClick={handleGetInsights}
          disabled={loadingInsights}
          className="bg-emerald-950 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase italic tracking-widest shadow-xl hover:bg-black transition-all flex items-center gap-2"
        >
          {loadingInsights ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-emerald-400" />}
          {loadingInsights ? 'ANALISANDO...' : 'GERAR INSIGHTS IA'}
        </button>
      </header>

      {aiInsights && (
        <div className="bg-emerald-50 border-2 border-emerald-100 p-8 rounded-[2.5rem] shadow-sm animate-fade-in-up relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Brain className="w-24 h-24 text-emerald-900" />
          </div>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest italic">Análise do Treinador IA</span>
          </div>
          <div className="prose prose-slate prose-sm max-w-none text-emerald-900 font-bold italic leading-relaxed">
            <Markdown>{aiInsights}</Markdown>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Readiness & Fatigue */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-6">
                <Zap className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Prontidão (Readiness)</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-6xl font-black italic tracking-tighter text-slate-900">{metrics.readiness.toFixed(0)}</span>
                <span className="text-xl font-black text-slate-300 uppercase italic mb-2">%</span>
              </div>
              <div className="mt-6 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-1000" 
                  style={{ width: `${metrics.readiness}%` }}
                />
              </div>
              <p className="mt-4 text-[10px] font-bold text-slate-500 italic">
                {metrics.readiness > 80 ? 'Excelente estado para treinos intensos.' : 
                 metrics.readiness > 50 ? 'Estado moderado. Atenção aos sinais do corpo.' : 
                 'Fadiga alta detectada. Priorize recuperação.'}
              </p>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-6">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Fadiga Acumulada</span>
              </div>
              <div className="flex items-end gap-2">
                <span className="text-6xl font-black italic tracking-tighter text-slate-900">{metrics.fatigue.toFixed(0)}</span>
                <span className="text-xl font-black text-slate-300 uppercase italic mb-2">%</span>
              </div>
              <div className="mt-6 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-500 transition-all duration-1000" 
                  style={{ width: `${metrics.fatigue}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-purple-500" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Radar de Capacidades Físicas</span>
            </div>
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[9px] font-black text-slate-500 uppercase">Atual</span>
               </div>
            </div>
          </div>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={metrics.radarData}>
                <PolarGrid stroke="#f1f5f9" />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 900 }} 
                />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                <Radar
                  name="Atleta"
                  dataKey="A"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.5}
                />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Injury Risk */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-8">
            <ShieldAlert className="w-4 h-4 text-orange-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Score de Risco de Lesão (ACWR)</span>
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  fill="none"
                  stroke="#f1f5f9"
                  strokeWidth="12"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="80"
                  fill="none"
                  stroke={metrics.injuryRisk > 1.5 ? '#ef4444' : metrics.injuryRisk > 1.3 ? '#f59e0b' : '#10b981'}
                  strokeWidth="12"
                  strokeDasharray={502}
                  strokeDashoffset={502 - (Math.min(2, metrics.injuryRisk) / 2) * 502}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black italic tracking-tighter text-slate-900">{metrics.injuryRisk.toFixed(2)}</span>
                <span className="text-[9px] font-black text-slate-400 uppercase">Ratio</span>
              </div>
            </div>

            <div className="flex-1 space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-black uppercase italic">
                  <span className="text-slate-400">Zona de Risco</span>
                  <span className={metrics.injuryRisk > 1.5 ? 'text-red-600' : metrics.injuryRisk > 1.3 ? 'text-orange-600' : 'text-emerald-600'}>
                    {metrics.injuryRisk > 1.5 ? 'ALTO' : metrics.injuryRisk > 1.3 ? 'MODERADO' : 'BAIXO'}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500" style={{ width: '40%' }} />
                  <div className="h-full bg-orange-500" style={{ width: '25%' }} />
                  <div className="h-full bg-red-500" style={{ width: '35%' }} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Carga Aguda (7d)</span>
                  <span className="text-xl font-black text-slate-800 italic">{metrics.acuteLoad.toFixed(1)} KM</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Carga Crônica (Avg)</span>
                  <span className="text-xl font-black text-slate-800 italic">{metrics.chronicLoad.toFixed(1)} KM</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Performance Log */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-8">
            <Clock className="w-4 h-4 text-blue-500" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Log de Performance Recente</span>
          </div>
          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            {metrics.recentWorkouts.length > 0 ? metrics.recentWorkouts.reverse().map((w, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-xl ${(w.rpe || 0) > 7 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black text-slate-800 uppercase italic tracking-tighter">{w.type}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">PSE: {w.rpe || 0}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-black italic uppercase ${(w.rpe || 0) > 7 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {(w.rpe || 0) > 7 ? 'ALTA INTENSIDADE' : 'ZONA SEGURA'}
                  </span>
                </div>
              </div>
            )) : (
              <p className="text-center py-10 text-slate-300 text-[10px] font-black uppercase italic tracking-widest">Sem dados recentes.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

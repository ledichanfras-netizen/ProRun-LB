
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Trophy, 
  Activity, 
  Calendar, 
  TrendingUp, 
  Clock,
  ChevronRight,
  Target,
  User as UserIcon,
  MessageSquare,
  CheckCircle,
  Zap,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';

export default function Dashboard() {
  const { userRole, athletes, selectedAthleteId, athletePlans, getAthleteMetrics } = useApp();

  const currentAthleteId = userRole === 'athlete' ? selectedAthleteId : (selectedAthleteId || athletes[0]?.id);
  const activeAthlete = athletes.find(a => a.id === currentAthleteId);
  
  const metrics = currentAthleteId ? getAthleteMetrics(currentAthleteId) : {
    history: [],
    completionRate: 0,
    totalVolumeCompleted: 0,
    totalVolumePlanned: 0
  };

  const athletePlan = currentAthleteId ? athletePlans[currentAthleteId] : null;
  const visibleWeeks = athletePlan?.weeks?.filter(w => w.isVisible === true) || [];
  const nextWorkout = visibleWeeks.flatMap(w => w.workouts || []).find(work => work && !work.completed && work.type !== 'Descanso');

  // Coleta feedbacks e PSE de TODOS os atletas para o Treinador
  const allActivities = athletes.flatMap(athlete => {
    const aPlan = athletePlans[athlete.id];
    if (!aPlan || !aPlan.weeks) return [];
    
    return aPlan.weeks.flatMap(week => (week.workouts || []).filter(w => w.completed).map(w => ({
      athleteId: athlete.id,
      athleteName: athlete.name,
      day: w.day,
      type: w.type,
      feedback: w.feedback,
      rpe: w.rpe || 0,
      timestamp: new Date()
    })));
  }).sort((a, b) => 0); // Ordenação simplificada para o exemplo

  const getRPEColor = (val: number) => {
    if (val <= 3) return 'text-emerald-500';
    if (val <= 6) return 'text-blue-500';
    if (val <= 8) return 'text-orange-500';
    return 'text-red-600';
  };

  // Análise de Carga Interna (Baseada nos últimos 5 treinos do atleta selecionado)
  const calculateLoadAnalysis = () => {
    if (!currentAthleteId) return null;
    const athleteActivities = allActivities.filter(a => a.athleteId === currentAthleteId).slice(-5);
    if (athleteActivities.length < 3) return { status: 'Aguardando Dados', color: 'text-slate-400', recommendation: 'Mais treinos necessários para análise.' };
    
    const avgRPE = athleteActivities.reduce((acc, curr) => acc + curr.rpe, 0) / athleteActivities.length;
    
    if (avgRPE > 8.0) return { 
      status: 'RISCO DE OVERTRAINING', 
      color: 'text-red-600', 
      bg: 'bg-red-50',
      recommendation: 'Reduza a intensidade ou o volume na próxima semana. Média de esforço muito alta (>8.0).' 
    };
    if (avgRPE >= 5.0 && avgRPE <= 7.5) return { 
      status: 'CARGA EM EQUILÍBRIO', 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50',
      recommendation: 'Performance ideal. Mantenha a estabilidade atual. O corpo está absorvendo bem o estímulo.' 
    };
    return { 
      status: 'CARGA ABAIXO DO POTENCIAL', 
      color: 'text-blue-600', 
      bg: 'bg-blue-50',
      recommendation: 'Considere aumentar gradualmente o volume ou intensidade se o objetivo for performance.' 
    };
  };

  const loadAnalysis = calculateLoadAnalysis();

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
            Olá, {userRole === 'coach' ? 'Coach Leandro' : (activeAthlete?.name || 'Atleta')}! 👋
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            {userRole === 'coach' 
              ? 'Painel de Gestão de Carga e Performance.' 
              : 'Seu centro de comando de alta performance.'}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adesão ao Ciclo</p>
            <p className="text-3xl font-black text-slate-800">{metrics.completionRate}%</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Executado (KM)</p>
            <p className="text-3xl font-black text-emerald-600">{metrics.totalVolumeCompleted.toFixed(1)}</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VDOT Atual</p>
            <p className="text-3xl font-black text-slate-800">{activeAthlete?.metrics.vdot || '--'}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-2xl text-purple-600">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meta Específica</p>
            <p className="text-sm font-black text-orange-600 uppercase italic leading-tight">{athletePlan?.specificGoal || '--'}</p>
          </div>
          <div className="bg-orange-50 p-3 rounded-2xl text-orange-600">
            <Trophy className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Análise de Carga - Exclusivo Treinador ou Visão Geral Atleta */}
          {loadAnalysis && (
            <div className={`${loadAnalysis.bg} p-8 rounded-[2rem] border-2 border-white shadow-xl animate-fade-in-up`}>
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Status de Carga Interna (Foster, 1998)</h3>
                    <p className={`text-2xl font-black italic uppercase tracking-tighter ${loadAnalysis.color}`}>{loadAnalysis.status}</p>
                  </div>
                  <Zap className={`w-8 h-8 ${loadAnalysis.color}`} />
               </div>
               <div className="bg-white/60 p-4 rounded-2xl border border-white flex items-start gap-3">
                  <Info className={`w-5 h-5 flex-shrink-0 mt-0.5 ${loadAnalysis.color}`} />
                  <p className="text-sm font-bold text-slate-700 italic leading-relaxed">
                    <span className="font-black uppercase text-[10px] block mb-1 opacity-50">Direcionamento ProRun:</span>
                    {loadAnalysis.recommendation}
                  </p>
               </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 uppercase italic tracking-tighter mb-6">
              <TrendingUp className="text-emerald-600 w-5 h-5" /> Volume Semanal (KM)
            </h2>
            <div className="h-72 w-full">
              {metrics.history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.history}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="planned" name="Previsto" fill="#e2e8f0" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="completed" name="Executado" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl italic">
                  Aguardando publicação do cronograma...
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-col h-full">
            <h3 className="font-black text-slate-800 flex items-center gap-3 uppercase italic tracking-tighter text-lg mb-6">
              <MessageSquare className="text-emerald-500 w-5 h-5" /> Feed de Atividades
            </h3>
            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {allActivities.length > 0 ? allActivities.slice(-10).reverse().map((f, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-emerald-200 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                       <div>
                          <p className="text-[11px] font-black text-slate-900 uppercase italic tracking-tighter">{f.athleteName}</p>
                          <p className="text-[8px] text-slate-400 uppercase font-black">{f.day}</p>
                       </div>
                       {f.rpe > 0 && (
                        <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg shadow-sm border border-slate-100">
                           <Zap className={`w-3 h-3 ${getRPEColor(f.rpe)}`} />
                           <span className="text-[9px] font-black text-slate-700">PSE {f.rpe}</span>
                        </div>
                       )}
                    </div>
                    <p className="text-[11px] text-slate-600 italic border-l-2 border-emerald-300 pl-3 leading-snug">
                       {f.feedback ? `"${f.feedback}"` : "Treino concluído com sucesso."}
                    </p>
                </div>
              )) : <p className="text-slate-300 text-xs italic text-center py-10 uppercase tracking-widest font-black">Nenhuma atividade recente.</p>}
            </div>
            
            {nextWorkout && (
              <div className="mt-auto pt-6 border-t border-slate-100">
                <div className="bg-emerald-950 rounded-2xl p-4 text-white shadow-lg">
                  <p className="text-[8px] font-black uppercase text-emerald-400 mb-1 tracking-widest">Próxima Meta</p>
                  <p className="text-xs font-bold italic line-clamp-1">"{nextWorkout.customDescription}"</p>
                  <Link to="/athlete-portal" className="mt-3 text-[9px] font-black uppercase text-white bg-emerald-700 px-3 py-1.5 rounded-lg flex items-center justify-center gap-1 hover:bg-emerald-600 transition-colors">
                    VER TREINO COMPLETO <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

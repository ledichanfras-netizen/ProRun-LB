
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
  Info,
  TrendingDown,
  Activity as ActivityIcon,
  TrendingUp as TrendingIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
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
  });

  const calculateLoadGuidance = () => {
    if (!currentAthleteId) return null;
    
    const athleteHistory = allActivities
      .filter(a => a.athleteId === currentAthleteId)
      .slice(-5);

    if (athleteHistory.length < 3) return { 
      status: 'Aguardando Dados', 
      color: 'text-slate-400', 
      bg: 'bg-slate-50',
      icon: <ActivityIcon className="w-8 h-8" />,
      recommendation: 'Registre ao menos 3 sessões com PSE para análise de carga.' 
    };
    
    const avgRPE = athleteHistory.reduce((acc, curr) => acc + curr.rpe, 0) / athleteHistory.length;
    
    if (avgRPE > 8.0) return { 
      status: 'REDUZIR CARGA (OVERREACHING)', 
      color: 'text-red-600', 
      bg: 'bg-red-50',
      icon: <AlertTriangle className="w-8 h-8" />,
      recommendation: 'O atleta está em zona de fadiga acumulada. Reduza volume ou intensidade na próxima semana para evitar lesões.' 
    };
    
    if (avgRPE >= 5.0 && avgRPE <= 8.0) return { 
      status: 'ESTABILIZAR / PERFORMAR', 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50',
      icon: <TrendingIcon className="w-8 h-8" />,
      recommendation: 'Carga ideal para desenvolvimento. O corpo está respondendo bem ao estímulo planejado.' 
    };
    
    return { 
      status: 'AUMENTAR CARGA (SUB-ESTÍMULO)', 
      color: 'text-blue-600', 
      bg: 'bg-blue-50',
      icon: <ActivityIcon className="w-8 h-8" />,
      recommendation: 'Percepção de esforço muito baixa. Considere progredir os volumes ou reduzir os paces alvo.' 
    };
  };

  const loadGuidance = calculateLoadGuidance();

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
            Olá, {userRole === 'coach' ? 'Coach Leandro' : (activeAthlete?.name || 'Atleta')}! 👋
          </h1>
          <p className="text-slate-500 mt-1 font-medium italic">
            {userRole === 'coach' 
              ? 'Status fisiológico e prontidão do elenco.' 
              : 'Seu centro de performance técnica.'}
          </p>
        </div>
      </header>

      {loadGuidance && (
        <div className={`${loadGuidance.bg} p-8 rounded-[2.5rem] border-2 border-white shadow-xl animate-fade-in-up flex flex-col md:flex-row items-center gap-8`}>
           <div className={`flex-shrink-0 bg-white p-6 rounded-3xl shadow-lg ${loadGuidance.color}`}>
              {loadGuidance.icon}
           </div>
           <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Análise de Carga Interna (sRPE)</span>
                 <div className="h-px bg-slate-200 flex-1"></div>
              </div>
              <h3 className={`text-2xl font-black italic uppercase tracking-tighter ${loadGuidance.color} mb-1`}>
                {loadGuidance.status}
              </h3>
              <p className="text-sm font-bold text-slate-700 italic leading-relaxed">
                "{loadGuidance.recommendation}"
              </p>
           </div>
           {currentAthleteId && (
             <div className="text-right hidden md:block">
                <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">PSE MÉDIA (5T)</span>
                <span className={`text-5xl font-black italic tracking-tighter ${loadGuidance.color}`}>
                  {(allActivities.filter(a => a.athleteId === currentAthleteId).slice(-5).reduce((a,b) => a+b.rpe,0)/5 || 0).toFixed(1)}
                </span>
             </div>
           )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between group relative">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Adesão ao Ciclo</p>
               <div className="relative cursor-help">
                  <Info className="w-3 h-3 text-slate-300" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-[9px] font-bold p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
                    Percentual de sessões concluídas em relação ao total planejado pelo treinador.
                  </div>
               </div>
            </div>
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
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Meta</p>
            <p className="text-[11px] font-black text-orange-600 uppercase italic line-clamp-2">{athletePlan?.specificGoal || '--'}</p>
          </div>
          <div className="bg-orange-50 p-3 rounded-2xl text-orange-600">
            <Trophy className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 uppercase italic tracking-tighter mb-6">
              <TrendingUp className="text-emerald-600 w-5 h-5" /> Distribuição de Volume Semanal
            </h2>
            <div className="h-72 w-full">
              {metrics.history.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.history}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="planned" name="Previsto" radius={[6, 6, 0, 0]}>
                       {metrics.history.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill="#e2e8f0" />
                       ))}
                    </Bar>
                    <Bar dataKey="completed" name="Executado" radius={[6, 6, 0, 0]}>
                       {metrics.history.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill="#10b981" />
                       ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-[2rem] italic">
                  Aguardando dados de periodização...
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-col h-full">
            <h3 className="font-black text-slate-800 flex items-center gap-3 uppercase italic tracking-tighter text-lg mb-6">
              <MessageSquare className="text-emerald-500 w-5 h-5" /> Feed de Atividades Recentes
            </h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {allActivities.length > 0 ? allActivities.slice(-8).reverse().map((f, i) => (
                <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-emerald-200 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                       <div>
                          <p className="text-[11px] font-black text-slate-900 uppercase italic tracking-tighter">{f.athleteName}</p>
                          <p className="text-[8px] text-slate-400 uppercase font-black">{f.day}</p>
                       </div>
                       {f.rpe > 0 && (
                        <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-lg shadow-sm border border-slate-100">
                           <Zap className="w-3 h-3 text-amber-500" />
                           <span className="text-[9px] font-black text-slate-700">PSE {f.rpe}</span>
                        </div>
                       )}
                    </div>
                    <p className="text-[11px] text-slate-600 italic border-l-2 border-emerald-300 pl-3 leading-snug">
                       {f.feedback ? `"${f.feedback}"` : "Sessão concluída conforme prescrição."}
                    </p>
                </div>
              )) : <p className="text-slate-300 text-xs italic text-center py-10 uppercase tracking-widest font-black">Nenhuma sessão executada.</p>}
            </div>
            
            {nextWorkout && (
              <div className="mt-auto pt-6 border-t border-slate-100">
                <div className="bg-emerald-950 rounded-2xl p-5 text-white shadow-xl">
                  <p className="text-[9px] font-black uppercase text-emerald-400 mb-2 tracking-widest flex items-center gap-2">
                    <Target className="w-3 h-3" /> Foco da Próxima Sessão
                  </p>
                  <p className="text-xs font-bold italic line-clamp-2 leading-relaxed opacity-90 mb-4">"{nextWorkout.customDescription}"</p>
                  <Link to="/athlete-portal" className="w-full text-[10px] font-black uppercase text-white bg-emerald-700/50 hover:bg-emerald-600 px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                    ABRIR PORTAL DO ATLETA <ChevronRight className="w-3 h-3" />
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

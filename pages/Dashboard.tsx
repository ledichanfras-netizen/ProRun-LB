
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
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
import { AIPerformanceHub } from '../components/AIPerformanceHub';
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
  const { userRole, athletes, selectedAthleteId, setSelectedAthleteId, athletePlans, getAthleteMetrics, runAIAnalysis } = useApp();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const currentAthleteId = userRole === 'athlete' ? selectedAthleteId : (selectedAthleteId || athletes[0]?.id);
  const activeAthlete = useMemo(() => athletes.find(a => a.id === currentAthleteId), [athletes, currentAthleteId]);
  
  const handleAIAnalysis = async () => {
    if (!currentAthleteId) return;
    setIsAnalyzing(true);
    try {
      await runAIAnalysis(currentAthleteId);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const metrics = useMemo(() => currentAthleteId ? getAthleteMetrics(currentAthleteId) : {
    history: [],
    completionRate: 0,
    totalVolumeCompleted: 0,
    totalVolumePlanned: 0
  }, [currentAthleteId, getAthleteMetrics]);

  const athletePlan = useMemo(() => currentAthleteId ? athletePlans[currentAthleteId] : null, [currentAthleteId, athletePlans]);
  
  const visibleWeeks = useMemo(() => athletePlan?.weeks?.filter(w => w.isVisible === true) || [], [athletePlan]);
  
  const nextWorkout = useMemo(() => visibleWeeks.flatMap(w => w.workouts || []).find(work => work && !work.completed && work.type !== 'Descanso'), [visibleWeeks]);

  const allActivities = useMemo(() => {
    const filteredAthletes = selectedAthleteId 
      ? athletes.filter(a => a.id === selectedAthleteId)
      : athletes;

    return filteredAthletes.flatMap(athlete => {
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
  }, [athletes, athletePlans, selectedAthleteId]);

  const loadGuidance = useMemo(() => {
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
  }, [currentAthleteId, allActivities]);

  const teamMetrics = useMemo(() => {
    if (userRole !== 'coach') return null;
    
    const totalAthletes = athletes.length;
    const activeAthletes = athletes.filter(a => {
      const plan = athletePlans[a.id];
      const lastWorkout = plan?.weeks?.flatMap(w => w.workouts).filter(w => w.completed).pop();
      return !!lastWorkout;
    }).length;

    const averageCompletion = athletes.length > 0 
      ? athletes.reduce((acc, a) => acc + getAthleteMetrics(a.id).completionRate, 0) / athletes.length
      : 0;

    const riskAthletes = athletes.filter(a => getAthleteMetrics(a.id).completionRate < 50).length;

    return { totalAthletes, activeAthletes, averageCompletion, riskAthletes };
  }, [athletes, athletePlans, getAthleteMetrics, userRole]);

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter flex items-center gap-2">
            Olá, {userRole === 'coach' ? 'Coach Leandro' : (activeAthlete?.name.split(' ')[0] || 'Atleta')}! 👋
            {userRole === 'coach' && activeAthlete?.readiness && (
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 text-lg shadow-sm" title={`Prontidão: ${activeAthlete.readiness}`}>
                {activeAthlete.readiness === 'fatigued' ? '😴' : activeAthlete.readiness === 'recovering' ? '🧘' : '⚡'}
              </span>
            )}
          </h1>
          <p className="text-slate-500 mt-1 font-medium italic">
            {userRole === 'coach' 
              ? (selectedAthleteId ? `Monitorando: ${activeAthlete?.name}` : 'Visão geral do seu elenco de performance.') 
              : 'Seu centro de performance técnica.'}
          </p>
        </div>
        <div className="flex gap-3">
          {userRole === 'coach' && selectedAthleteId && (
            <button 
              onClick={() => setSelectedAthleteId(null)}
              className="bg-white border-2 border-slate-100 text-slate-400 hover:text-emerald-600 hover:border-emerald-100 px-6 py-3 rounded-2xl font-black uppercase italic tracking-tighter text-xs transition-all shadow-sm"
            >
              Visão do Time
            </button>
          )}
          {userRole === 'coach' && currentAthleteId && (
            <button 
              onClick={handleAIAnalysis}
              disabled={isAnalyzing}
              className="bg-emerald-950 text-white px-6 py-3 rounded-2xl font-black uppercase italic tracking-tighter text-xs flex items-center gap-2 hover:bg-black transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/20"
            >
              <Zap className={`w-4 h-4 ${isAnalyzing ? 'animate-pulse' : ''} text-emerald-400`} />
              {isAnalyzing ? 'Analisando...' : 'Análise IA'}
            </button>
          )}
        </div>
      </header>

      {/* Métricas de Elenco (Apenas Coach sem atleta selecionado) */}
      {userRole === 'coach' && !selectedAthleteId && teamMetrics && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total de Atletas</p>
                <p className="text-3xl font-black text-slate-800">{teamMetrics.totalAthletes}</p>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl text-slate-600">
                <UserIcon className="w-6 h-6" />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Adesão Média</p>
                <p className="text-3xl font-black text-emerald-600">{teamMetrics.averageCompletion.toFixed(0)}%</p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Em Risco</p>
                <p className="text-3xl font-black text-red-600">{teamMetrics.riskAthletes}</p>
              </div>
              <div className="bg-red-50 p-3 rounded-2xl text-red-600 border border-red-100">
                <AlertTriangle className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-emerald-950 p-6 rounded-[2rem] shadow-xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Status ProRun</p>
                <p className="text-xl font-black text-white italic uppercase tracking-tighter leading-none">Elenco Ativo</p>
              </div>
              <div className="bg-emerald-500 p-3 rounded-2xl text-emerald-950">
                <Zap className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* NOVO: Status de Prontidão do Elenco */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 uppercase italic tracking-tighter mb-6 flex items-center gap-2">
              <ActivityIcon className="w-5 h-5 text-emerald-500" /> Prontidão do Elenco Hoje
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {athletes.slice(0, 6).map(athlete => (
                <div key={athlete.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm border-2 ${
                    athlete.readiness === 'fatigued' ? 'bg-red-50 border-red-200 shadow-red-100' :
                    athlete.readiness === 'recovering' ? 'bg-blue-50 border-blue-200 shadow-blue-100' :
                    'bg-emerald-50 border-emerald-200 shadow-emerald-100'
                  }`}>
                    {athlete.readiness === 'fatigued' ? '😴' : athlete.readiness === 'recovering' ? '🧘' : '⚡'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-black text-slate-800 uppercase italic truncate">{athlete.name}</p>
                    <p className={`text-[9px] font-bold uppercase ${
                      athlete.readiness === 'fatigued' ? 'text-red-500' :
                      athlete.readiness === 'recovering' ? 'text-blue-500' :
                      'text-emerald-600'
                    }`}>
                      {athlete.readiness === 'fatigued' ? 'Fadigado' :
                       athlete.readiness === 'recovering' ? 'Em Recuperação' :
                       'Pronto para o Treino'}
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedAthleteId(athlete.id)}
                    className="p-2 hover:bg-white rounded-lg transition-colors text-slate-400 hover:text-emerald-600"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {userRole === 'coach' && !selectedAthleteId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-6 group hover:border-emerald-200 transition-all">
              <div className="bg-slate-50 p-5 rounded-3xl group-hover:bg-emerald-50 transition-colors">
                 <Calendar className="w-10 h-10 text-slate-400 group-hover:text-emerald-600" />
              </div>
              <div className="flex-1">
                 <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter mb-2">Seus Templates</h3>
                 <p className="text-slate-500 text-sm font-medium italic">Gerencie e aplique semanas de treino pré-definidas em seu elenco.</p>
              </div>
              <Link to="/periodization" className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase italic tracking-widest hover:bg-black transition-all">
                 VER TODOS
              </Link>
           </div>
           
           <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 p-8 rounded-[2.5rem] shadow-xl text-white flex flex-col md:flex-row items-center gap-6">
              <div className="bg-white/20 p-5 rounded-3xl backdrop-blur-md">
                 <CheckCircle className="w-10 h-10 text-emerald-400" />
              </div>
              <div className="flex-1 text-center md:text-left">
                 <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2 leading-none">Notificações Push</h3>
                 <p className="text-emerald-100/70 text-sm font-medium italic">Lembretes de treino automáticos para seus atletas.</p>
              </div>
              <div className="bg-emerald-400/20 px-4 py-2 rounded-lg border border-emerald-400/30">
                 <span className="text-[10px] font-black uppercase italic tracking-widest">SISTEMA ATIVO</span>
              </div>
           </div>
        </div>
      )}

      {userRole === 'athlete' && (
        <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-4 animate-fade-in shadow-sm no-print">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500 p-3 rounded-2xl shadow-lg shadow-emerald-500/20">
              <Info className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-black text-slate-900 uppercase italic tracking-tighter">Lembrete de Registro</p>
              <p className="text-xs text-slate-500 font-medium italic">Não esqueça de registrar seu PSE e feedback no Portal do Atleta após cada treino para que o treinador acompanhe sua evolução.</p>
            </div>
          </div>
          <Link to="/athlete-portal" className="w-full md:w-auto bg-emerald-950 text-white px-8 py-3 rounded-xl font-black text-[10px] uppercase italic tracking-widest hover:bg-black transition-all text-center">
            Ir para o Portal
          </Link>
        </div>
      )}

      {activeAthlete && (
        <AIPerformanceHub 
          athlete={activeAthlete} 
          isAnalyzing={isAnalyzing} 
          onAnalyze={handleAIAnalysis} 
          canAnalyze={userRole === 'coach'}
        />
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
                    <Bar dataKey="planned" name="Previsto" radius={[6, 6, 0, 0]} fill="#e2e8f0" />
                    <Bar dataKey="completed" name="Executado" radius={[6, 6, 0, 0]} fill="#10b981" />
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
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-black text-slate-800 flex items-center gap-3 uppercase italic tracking-tighter text-lg">
                <MessageSquare className="text-emerald-500 w-5 h-5" /> Feed de Atividades
              </h3>
              {userRole === 'coach' && selectedAthleteId && (
                <button 
                  onClick={() => setSelectedAthleteId(null)}
                  className="text-[9px] font-black text-emerald-600 uppercase italic border border-emerald-100 px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                >
                  Ver Todos
                </button>
              )}
            </div>
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

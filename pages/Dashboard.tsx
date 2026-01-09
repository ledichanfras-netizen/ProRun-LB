
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
  CheckCircle
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
  const [currentTime, setCurrentTime] = useState('');

  const currentAthleteId = userRole === 'athlete' ? selectedAthleteId : (selectedAthleteId || athletes[0]?.id);
  const activeAthlete = athletes.find(a => a.id === currentAthleteId);
  
  const metrics = currentAthleteId ? getAthleteMetrics(currentAthleteId) : {
    history: [],
    completionRate: 0,
    totalVolumeCompleted: 0,
    totalVolumePlanned: 0
  };

  const plan = currentAthleteId ? (athletePlans[currentAthleteId] || []) : [];
  const nextWorkout = (plan || []).flatMap(w => w.workouts || []).find(work => work && !work.completed && work.type !== 'Descanso');

  // Atualiza relógio de SP a cada minuto
  useEffect(() => {
    const updateTime = () => {
      const spTime = new Date().toLocaleString('pt-BR', { 
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      setCurrentTime(spTime);
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  const allFeedbacks = athletes.flatMap(athlete => {
    const athletePlan = athletePlans[athlete.id] || [];
    return athletePlan.flatMap(week => (week.workouts || []).filter(w => w.completed && w.feedback).map(w => ({
      athleteName: athlete.name,
      day: w.day,
      type: w.type,
      feedback: w.feedback,
      date: currentTime.split(',')[0]
    })));
  }).slice(-8).reverse();

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
            Olá, {userRole === 'coach' ? 'Treinador Leandro' : (activeAthlete?.name || 'Atleta')}! 👋
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            {userRole === 'coach' 
              ? 'Acompanhe em tempo real o feedback de seus atletas.' 
              : 'Seu centro de comando de alta performance.'}
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-emerald-50 px-5 py-3 rounded-2xl border border-emerald-100 shadow-sm">
           <Clock className="w-5 h-5 text-emerald-600 animate-pulse" />
           <span className="text-xs font-black text-emerald-800 uppercase italic tracking-widest">{currentTime} (SP)</span>
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Adesão ao Plano</p>
            <p className="text-3xl font-black text-slate-800">{metrics.completionRate}%</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
            <Trophy className="w-6 h-6" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kms Concluídos</p>
            <p className="text-3xl font-black text-emerald-600">{metrics.totalVolumeCompleted.toFixed(1)}</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-2xl text-emerald-600">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">VDOT Atual</p>
            <p className="text-3xl font-black text-slate-800">{activeAthlete?.metrics.vdot || '--'}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-2xl text-purple-600">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Último Teste 3k</p>
            <p className="text-3xl font-black text-orange-600">{activeAthlete?.metrics.test3kTime || '--'}</p>
          </div>
          <div className="bg-orange-50 p-3 rounded-2xl text-orange-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 uppercase italic tracking-tighter">
                <TrendingUp className="text-emerald-600 w-5 h-5" /> Volume Semanal (KM)
              </h2>
              <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded uppercase">Evolução do Ciclo</span>
            </div>
            
            <div className="h-72 w-full">
              {(metrics.history || []).length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.history}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="label" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 10}}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 10}}
                    />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}}
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                      labelStyle={{fontWeight: 'bold', color: '#1e293b'}}
                    />
                    <Bar dataKey="planned" name="Previsto" fill="#e2e8f0" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="completed" name="Executado" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                  <Calendar className="w-10 h-10 mb-2 opacity-20" />
                  <p className="text-sm">Inicie a prescrição para ver o gráfico.</p>
                </div>
              )}
            </div>
          </div>

          {userRole === 'coach' && (
            <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-black text-slate-800 flex items-center gap-3 uppercase italic tracking-tighter text-xl">
                  <MessageSquare className="text-emerald-500 w-6 h-6" /> Feedbacks Recentes
                </h3>
                <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full uppercase tracking-widest">Tempo Real</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {allFeedbacks.length > 0 ? allFeedbacks.map((f, i) => (
                  <div key={i} className="p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-emerald-300 transition-colors animate-fade-in group">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                         <div className="w-8 h-8 bg-emerald-950 rounded-lg flex items-center justify-center text-white font-black text-xs italic">
                            {f.athleteName.charAt(0)}
                         </div>
                         <div>
                            <p className="text-xs font-black text-slate-900 uppercase tracking-tighter">{f.athleteName}</p>
                            <p className="text-[9px] font-bold text-slate-400">{f.day} • {f.date}</p>
                         </div>
                      </div>
                      <span className="px-2 py-0.5 bg-white text-[8px] font-black text-emerald-600 border border-emerald-100 rounded uppercase italic">{f.type}</span>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-100 italic relative">
                       <p className="text-xs text-slate-600 font-medium leading-relaxed">"{f.feedback}"</p>
                    </div>
                  </div>
                )) : (
                  <div className="col-span-full py-12 text-center text-slate-400 italic">
                    <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-10" />
                    <p className="text-sm">Nenhum comentário enviado pelos atletas ainda.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-emerald-950 rounded-3xl p-6 text-white shadow-xl shadow-emerald-900/20 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
            <h3 className="font-black text-lg mb-2 relative z-10 flex items-center gap-2 uppercase italic tracking-tighter">
               <Target className="w-5 h-5 text-emerald-400" /> Próxima Sessão
            </h3>
            {nextWorkout ? (
              <div className="relative z-10">
                <p className="text-sm text-slate-300 mb-4 line-clamp-3 font-medium leading-relaxed italic">"{nextWorkout.customDescription}"</p>
                <Link 
                  to={userRole === 'coach' ? '/periodization' : '/athlete-portal'} 
                  className="bg-white text-emerald-950 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2 hover:bg-emerald-50 transition shadow-lg"
                >
                  ACESSAR TREINO <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="relative z-10">
                <p className="text-sm text-slate-300 mb-4">Sem treinos pendentes para este ciclo.</p>
                <Link to="/periodization" className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest inline-block hover:bg-emerald-700 transition">
                  {userRole === 'coach' ? 'PRESCREVER AGORA' : 'VER PLANILHA'}
                </Link>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2 uppercase text-[10px] tracking-widest italic">
              <Calendar className="text-emerald-500 w-4 h-4" /> Resumo Estratégico
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Volume Planejado</span>
                <span className="text-sm font-black text-slate-800">
                  {metrics.totalVolumePlanned.toFixed(1)} KM
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Período</span>
                <span className="text-sm font-black text-emerald-600 uppercase italic">
                  {plan[0]?.phase || 'Fase Geral'}
                </span>
              </div>
              {activeAthlete && (
                <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-center">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Status de Conclusão</p>
                  <div className="w-full bg-emerald-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-600 h-full transition-all" style={{ width: `${metrics.completionRate}%` }}></div>
                  </div>
                  <p className="text-xl font-black text-emerald-900 mt-2 italic">{metrics.completionRate}%</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

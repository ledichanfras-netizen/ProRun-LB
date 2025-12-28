
import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  Trophy, 
  Activity, 
  Calendar, 
  TrendingUp, 
  Clock,
  ChevronRight,
  Target,
  User as UserIcon
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
    totalVolumePlanned: 0,
    totalVolumeCompleted: 0
  };

  const plan = currentAthleteId ? (athletePlans[currentAthleteId] || []) : [];
  const nextWorkout = (plan || []).flatMap(w => w.workouts || []).find(work => work && !work.completed && work.type !== 'Descanso');

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter">
            Olá, {userRole === 'coach' ? 'Treinador Leandro' : (activeAthlete?.name || 'Atleta')}! 👋
          </h1>
          <p className="text-slate-500 mt-1 font-medium">
            {userRole === 'coach' 
              ? 'Acompanhe a evolução da sua assessoria técnica.' 
              : 'Seu centro de comando de alta performance.'}
          </p>
        </div>
        
        {userRole === 'coach' && athletes.length > 0 && (
          <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 flex items-center gap-3">
             <div className="bg-emerald-600 p-2 rounded-lg">
                <UserIcon className="w-5 h-5 text-white" />
             </div>
             <div className="pr-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atleta Selecionado</p>
                <p className="text-sm font-bold text-slate-800">{activeAthlete?.name || 'Selecione um Atleta'}</p>
             </div>
          </div>
        )}
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
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Score VDOT</p>
            <p className="text-3xl font-black text-slate-800">{activeAthlete?.metrics.vdot || '--'}</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-2xl text-purple-600">
            <Activity className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between hover:shadow-md transition">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Melhor 3km</p>
            <p className="text-3xl font-black text-orange-600">{activeAthlete?.metrics.test3kTime || '--'}</p>
          </div>
          <div className="bg-orange-50 p-3 rounded-2xl text-orange-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 uppercase italic tracking-tighter">
              <TrendingUp className="text-emerald-600 w-5 h-5" /> Volume Semanal (KM)
            </h2>
            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded uppercase">Histórico do Atleta</span>
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
                <p className="text-sm">Nenhum dado de volume registrado nesta planilha.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-emerald-950 rounded-3xl p-6 text-white shadow-xl shadow-emerald-900/20 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500"></div>
            <h3 className="font-bold text-lg mb-2 relative z-10 flex items-center gap-2 uppercase italic tracking-tighter">
               <Target className="w-5 h-5 text-emerald-400" /> Próxima Sessão
            </h3>
            {nextWorkout ? (
              <div className="relative z-10">
                <p className="text-sm text-slate-300 mb-4 line-clamp-3 font-medium leading-relaxed italic">"{nextWorkout.customDescription}"</p>
                <Link 
                  to={userRole === 'coach' ? '/periodization' : '/athlete-portal'} 
                  className="bg-white text-emerald-950 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 hover:bg-emerald-50 transition shadow-lg"
                >
                  Ver Detalhes <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            ) : (
              <div className="relative z-10">
                <p className="text-sm text-slate-300 mb-4">Sem sessões agendadas para hoje.</p>
                <Link to="/periodization" className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest inline-block hover:bg-emerald-700 transition">
                  {userRole === 'coach' ? 'Prescrever' : 'Minha Planilha'}
                </Link>
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 uppercase text-[10px] tracking-widest">
              <Calendar className="text-emerald-500 w-4 h-4" /> Resumo do Ciclo
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Volume Total</span>
                <span className="text-sm font-black text-slate-800">
                  {metrics.totalVolumePlanned.toFixed(1)} KM
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Fase Atual</span>
                <span className="text-sm font-black text-emerald-600 uppercase italic">
                  {plan[0]?.phase || 'Indefinida'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
